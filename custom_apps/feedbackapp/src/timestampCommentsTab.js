import { registerSidebarTab } from '@nextcloud/files'
import { createUrl, deleteCommentUrl, getFeedbackHeaders, isPublicShareContext, listUrl, publicShareAutoOpenUrl, publicShareLinkUrl, updateCommentUrl, updateStatusUrl } from './shared/api.js'
import { getActivePlaybackDurationSeconds, getActivePlaybackSeconds, getActiveSeekInput, getActiveVideoElement, getCurrentUserUid, isElementVisible, isVideoNode, seekActiveVideo } from './shared/dom.js'
import { escapeHtml, formatCreatedAt, formatTimestamp, formatTimestampWithoutMilliseconds } from './shared/formatters.js'
import { icons } from './shared/icons.js'
import { renderIconButton } from './shared/ui.js'

const tagName = 'feedbackapp-timestamp-comments-tab'

registerSidebarTab({
	id: 'feedbackapp-timestamp-comments',
	order: 90,
	displayName: 'Feedback',
	iconSvgInline: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 6c0-1.11-.89-2-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h4l4 3 4-3h2c1.11 0 2-.89 2-2V6ZM9 13H7v-2h2v2Zm4 0h-2V8h2v5Zm4 0h-2v-3h2v3Z"/></svg>',
	enabled({ node }) {
		return isVideoNode(node) || isPublicShareContext()
	},
	tagName,
})

function setupTab() {
	if (window.customElements.get(tagName)) {
		return
	}

	class TimestampCommentsTab extends HTMLElement {
		constructor() {
			super()
			this._node = null
			this._comments = []
			this._loading = false
			this._saving = false
			this._updatingCommentId = null
			this._savingCommentId = null
			this._deletingCommentId = null
			this._editingCommentId = null
			this._errorMessage = ''
			this._newMessage = ''
			this._editingMessage = ''
			this._publicShareAutoOpen = false
			this._canManagePublicShareAutoOpen = false
			this._savingPublicShareAutoOpen = false
			this._creatingPublicShareLink = false
			this._publicShareLinkStatus = ''
			this._publicShareLinkStatusTimer = null
			this._filter = 'open'
			this._selectedCommentId = null
			this._timelineVideo = null
			this._playheadVideo = null
			this._playheadPollId = null
			this._timelineContainer = null
			this._timelineSyncHandler = () => this.syncTimelineMarkers()
			this._playheadSyncHandler = () => this.syncCurrentPlayheadLabel()
			this._visibilityObserver = null
			this._windowResizeHandler = () => this.syncTimelineMarkers()
		}

		set node(value) {
			this._node = value
			this._newMessage = ''
			this._editingCommentId = null
			this._editingMessage = ''
			this.render()
			this.loadComments()
		}

		get node() {
			return this._node
		}

		set folder(value) {
			this._folder = value
		}

		set view(value) {
			this._view = value
		}

		get fileId() {
			return this._node?.fileid ?? null
		}

		get fileName() {
			if (isPublicShareContext()) {
				return this.getAttribute('data-feedback-public-title') ?? 'Shared video'
			}

			return this._node?.basename ?? 'Current file'
		}

		connectedCallback() {
			this.setupVisibilityObserver()
			window.addEventListener('resize', this._windowResizeHandler)
			this.startPlayheadPolling()
			this.render()
			if (this.fileId || isPublicShareContext()) {
				this.loadComments()
			}
		}

		disconnectedCallback() {
			this.stopPlayheadPolling()
			this.teardownPlayheadVideo()
			this.teardownTimelineVideo()
			this.removeTimelineMarkers()
			this._visibilityObserver?.disconnect()
			this._visibilityObserver = null
			if (this._publicShareLinkStatusTimer !== null) {
				window.clearTimeout(this._publicShareLinkStatusTimer)
				this._publicShareLinkStatusTimer = null
				this._publicShareLinkStatus = ''
			}
			window.removeEventListener('resize', this._windowResizeHandler)
		}

		async loadComments() {
			if (!this.isConnected) {
				return
			}

			if (!this.fileId && !isPublicShareContext()) {
				this._comments = []
				this._errorMessage = 'No file selected.'
				this._loading = false
				this.render()
				return
			}

			this._loading = true
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(listUrl(this.fileId), {
					headers: getFeedbackHeaders(),
					credentials: 'same-origin',
				})
				const data = await response.json()

				if (!response.ok) {
					this._errorMessage = data.message ?? 'Failed to load feedback.'
					this._comments = []
				} else {
					this._comments = data.comments ?? []
					this._publicShareAutoOpen = Boolean(data.publicShareAutoOpen)
					this._canManagePublicShareAutoOpen = Boolean(data.canManagePublicShareAutoOpen)
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to load feedback.'
				this._comments = []
			} finally {
				this._loading = false
				this.render()
			}
		}

		async updatePublicShareAutoOpen(enabled) {
			if (!this.fileId || this._savingPublicShareAutoOpen) {
				return
			}

			this._savingPublicShareAutoOpen = true
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(publicShareAutoOpenUrl(this.fileId), {
					method: 'PUT',
					headers: getFeedbackHeaders({ json: true }),
					credentials: 'same-origin',
					body: JSON.stringify({ enabled }),
				})
				const data = await response.json()

				if (!response.ok) {
					this._errorMessage = data.message ?? 'Failed to update public-share setting.'
				} else {
					this._publicShareAutoOpen = Boolean(data.publicShareAutoOpen)
					this._canManagePublicShareAutoOpen = Boolean(data.canManagePublicShareAutoOpen)
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to update public-share setting.'
			} finally {
				this._savingPublicShareAutoOpen = false
				this.render()
			}
		}

		async copyTextToClipboard(text) {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text)
				return
			}

			const textarea = document.createElement('textarea')
			textarea.value = text
			textarea.setAttribute('readonly', 'readonly')
			textarea.style.position = 'fixed'
			textarea.style.left = '-9999px'
			document.body.appendChild(textarea)
			textarea.select()
			const copied = document.execCommand('copy')
			textarea.remove()
			if (!copied) {
				throw new Error('Clipboard copy failed')
			}
		}

		async createPublicShareLink() {
			if (!this.fileId || this._creatingPublicShareLink) {
				return
			}

			this._creatingPublicShareLink = true
			this._publicShareLinkStatus = ''
			if (this._publicShareLinkStatusTimer !== null) {
				window.clearTimeout(this._publicShareLinkStatusTimer)
				this._publicShareLinkStatusTimer = null
			}
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(publicShareLinkUrl(this.fileId), {
					method: 'POST',
					headers: getFeedbackHeaders({ json: true }),
					credentials: 'same-origin',
					body: JSON.stringify({}),
				})
				const data = await response.json()

				if (!response.ok || !data.url) {
					this._errorMessage = data.message ?? 'Failed to create public share link.'
				} else {
					await this.copyTextToClipboard(data.url)
					this._publicShareLinkStatus = 'Copied'
					if (this._publicShareLinkStatusTimer !== null) {
						window.clearTimeout(this._publicShareLinkStatusTimer)
					}
					this._publicShareLinkStatusTimer = window.setTimeout(() => {
						this._publicShareLinkStatus = ''
						this._publicShareLinkStatusTimer = null
						this.render()
					}, 3000)
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to create or copy public share link.'
			} finally {
				this._creatingPublicShareLink = false
				this.render()
			}
		}

		async submitComment() {
			if ((!this.fileId && !isPublicShareContext()) || this._saving) {
				return
			}

			const playbackSeconds = getActivePlaybackSeconds()
			if (playbackSeconds === null) {
				this._errorMessage = 'No active video player found.'
				this.render()
				return
			}

			const message = this._newMessage.trim()
			if (message === '') {
				this._errorMessage = 'Please enter feedback text.'
				this.render()
				return
			}

			const timestampMilliseconds = Math.round(playbackSeconds * 1000)

			this._saving = true
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(createUrl(), {
					method: 'POST',
					headers: getFeedbackHeaders({ json: true }),
					credentials: 'same-origin',
					body: JSON.stringify({
						fileId: this.fileId,
						timestampMilliseconds,
						message,
					}),
				})
				const data = await response.json()

				if (!response.ok) {
					this._errorMessage = data.message ?? 'Failed to save feedback.'
				} else {
					this._newMessage = ''
					await this.loadComments()
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to save feedback.'
			} finally {
				this._saving = false
				this.render()
			}
		}

		async setCommentStatus(commentId, status) {
			if (this._updatingCommentId !== null) {
				return
			}

			this._updatingCommentId = commentId
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(updateStatusUrl(commentId), {
					method: 'PUT',
					headers: getFeedbackHeaders({ json: true }),
					credentials: 'same-origin',
					body: JSON.stringify({ status }),
				})
				const data = await response.json()

				if (!response.ok) {
					this._errorMessage = data.message ?? 'Failed to update feedback.'
				} else {
					this._comments = this._comments.map((comment) => {
						return comment.id === commentId ? data.comment : comment
					})
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to update feedback.'
			} finally {
				this._updatingCommentId = null
				this.render()
			}
		}

		jumpToComment(timestampMilliseconds, commentId = null) {
			if (!seekActiveVideo(timestampMilliseconds)) {
				this._errorMessage = 'No active video player found.'
				this.render()
				return
			}

			this._selectedCommentId = commentId
			this.applySelectionStyles()
			this.scrollSelectedCommentIntoView()

			if (this._errorMessage !== '') {
				this._errorMessage = ''
				this.render()
			}
		}

		getVisibleComments() {
			return this._comments.filter((comment) => {
				return (comment.status ?? 'open') === this._filter
			})
		}

		refreshPublicShareContext() {
			if (!isPublicShareContext()) {
				return
			}

			this._selectedCommentId = null
			this._newMessage = ''
			this._editingCommentId = null
			this._editingMessage = ''
			this._errorMessage = ''
			this.render()
			void this.loadComments()
		}

		setupVisibilityObserver() {
			if (this._visibilityObserver !== null) {
				return
			}

			const panel = this.closest('[role="tabpanel"]') ?? this.parentElement
			if (!panel) {
				return
			}

			this._visibilityObserver = new MutationObserver(() => {
				this.syncTimelineMarkers()
			})
			this._visibilityObserver.observe(panel, {
				attributes: true,
				attributeFilter: ['hidden', 'style', 'class', 'aria-hidden'],
			})
		}

		teardownTimelineVideo() {
			if (!this._timelineVideo) {
				return
			}

			this._timelineVideo.removeEventListener('loadedmetadata', this._timelineSyncHandler)
			this._timelineVideo.removeEventListener('durationchange', this._timelineSyncHandler)
			this._timelineVideo = null
		}

		teardownPlayheadVideo() {
			if (!this._playheadVideo) {
				return
			}

			this._playheadVideo.removeEventListener('timeupdate', this._playheadSyncHandler)
			this._playheadVideo.removeEventListener('seeking', this._playheadSyncHandler)
			this._playheadVideo.removeEventListener('seeked', this._playheadSyncHandler)
			this._playheadVideo.removeEventListener('loadedmetadata', this._playheadSyncHandler)
			this._playheadVideo.removeEventListener('durationchange', this._playheadSyncHandler)
			this._playheadVideo.removeEventListener('play', this._playheadSyncHandler)
			this._playheadVideo.removeEventListener('pause', this._playheadSyncHandler)
			this._playheadVideo = null
		}

		startPlayheadPolling() {
			if (this._playheadPollId !== null) {
				return
			}

			this._playheadPollId = window.setInterval(() => {
				this.syncCurrentPlayheadLabel()
			}, 200)
		}

		stopPlayheadPolling() {
			if (this._playheadPollId === null) {
				return
			}

			window.clearInterval(this._playheadPollId)
			this._playheadPollId = null
		}

		removeTimelineMarkers() {
			if (this._timelineContainer) {
				this._timelineContainer.remove()
				this._timelineContainer = null
			}
		}

		applySelectionStyles() {
			const commentCards = this.querySelectorAll('[data-feedback-card]')
			commentCards.forEach((card) => {
				const isSelected = Number(card.dataset.feedbackCard) === this._selectedCommentId
				card.style.borderColor = isSelected ? 'var(--color-primary-element)' : 'var(--color-border)'
				card.style.background = isSelected ? 'color-mix(in srgb, var(--color-primary-element) 8%, transparent)' : 'transparent'
				card.style.boxShadow = isSelected ? '0 0 0 1px var(--color-primary-element)' : 'none'
			})

			if (!this._timelineContainer) {
				return
			}

			const markers = this._timelineContainer.querySelectorAll('[data-feedback-marker]')
			markers.forEach((marker) => {
				const isSelected = Number(marker.dataset.feedbackMarker) === this._selectedCommentId
				const line = marker.querySelector('[data-feedback-marker-line]')
				const triangle = marker.querySelector('[data-feedback-marker-triangle]')
				if (line) {
					line.style.background = isSelected ? 'var(--color-primary-element)' : '#ffffff'
				}
				if (triangle) {
					triangle.style.borderBottomColor = isSelected ? 'var(--color-primary-element)' : '#ffffff'
				}
			})
		}

		scrollSelectedCommentIntoView() {
			if (this._selectedCommentId === null) {
				return
			}

			const selectedCard = this.querySelector(`[data-feedback-card="${this._selectedCommentId}"]`)
			selectedCard?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		}

		ensureTimelineVideo(video) {
			if (this._timelineVideo === video) {
				return
			}

			this.teardownTimelineVideo()
			this._timelineVideo = video
			this._timelineVideo.addEventListener('loadedmetadata', this._timelineSyncHandler)
			this._timelineVideo.addEventListener('durationchange', this._timelineSyncHandler)
		}

		ensurePlayheadVideo(video) {
			if (this._playheadVideo === video) {
				return
			}

			this.teardownPlayheadVideo()
			this._playheadVideo = video
			this._playheadVideo.addEventListener('timeupdate', this._playheadSyncHandler)
			this._playheadVideo.addEventListener('seeking', this._playheadSyncHandler)
			this._playheadVideo.addEventListener('seeked', this._playheadSyncHandler)
			this._playheadVideo.addEventListener('loadedmetadata', this._playheadSyncHandler)
			this._playheadVideo.addEventListener('durationchange', this._playheadSyncHandler)
			this._playheadVideo.addEventListener('play', this._playheadSyncHandler)
			this._playheadVideo.addEventListener('pause', this._playheadSyncHandler)
		}

		syncCurrentPlayheadLabel() {
			const label = this.querySelector('[data-feedback-current-playhead]')
			if (!label || !isElementVisible(this)) {
				this.teardownPlayheadVideo()
				return
			}

			const playbackSeconds = getActivePlaybackSeconds()
			if (playbackSeconds === null) {
				this.teardownPlayheadVideo()
				label.textContent = formatTimestampWithoutMilliseconds(0)
				return
			}

			const video = getActiveVideoElement()
			if (video) {
				this.ensurePlayheadVideo(video)
			} else {
				this.teardownPlayheadVideo()
			}

			label.textContent = formatTimestampWithoutMilliseconds(Math.round(playbackSeconds * 1000))
		}

		syncTimelineMarkers() {
			if (!isElementVisible(this)) {
				this.teardownTimelineVideo()
				this.removeTimelineMarkers()
				return
			}

			const video = getActiveVideoElement()
			const seekInput = getActiveSeekInput()
			const durationSeconds = getActivePlaybackDurationSeconds()
			const comments = this.getVisibleComments()
			if (!seekInput || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || comments.length === 0) {
				this.teardownTimelineVideo()
				this.removeTimelineMarkers()
				return
			}

			if (video) {
				this.ensureTimelineVideo(video)
			} else {
				this.teardownTimelineVideo()
			}

			const host = seekInput.parentElement
			if (!host) {
				this.removeTimelineMarkers()
				return
			}

			if (window.getComputedStyle(host).position === 'static') {
				host.style.position = 'relative'
			}

			if (!this._timelineContainer || this._timelineContainer.parentElement !== host) {
				this.removeTimelineMarkers()
				this._timelineContainer = document.createElement('div')
				this._timelineContainer.setAttribute('data-feedback-timeline-markers', '1')
				this._timelineContainer.style.position = 'absolute'
				this._timelineContainer.style.pointerEvents = 'none'
				this._timelineContainer.style.zIndex = '5'
				host.appendChild(this._timelineContainer)
			}

			this._timelineContainer.style.left = `${seekInput.offsetLeft}px`
			this._timelineContainer.style.top = `${seekInput.offsetTop + seekInput.offsetHeight - 22}px`
			this._timelineContainer.style.width = `${seekInput.offsetWidth}px`
			this._timelineContainer.style.height = '12px'
			this._timelineContainer.style.pointerEvents = 'none'
			this._timelineContainer.style.zIndex = '5'

			this._timelineContainer.innerHTML = ''

			for (const comment of comments) {
				const marker = document.createElement('button')
				const progress = Math.max(0, Math.min(1, comment.timestampMilliseconds / (durationSeconds * 1000)))
				const markerHalfWidth = 5
				const seekRect = seekInput.getBoundingClientRect()
				const thumbHalfWidth = Math.max(2, Math.min(8, seekRect.height / 3))
				const usableWidth = Math.max(0, seekRect.width - (thumbHalfWidth * 2))
				const startAnchorOffset = -2
				const effectiveUsableWidth = Math.max(0, usableWidth - startAnchorOffset)
				const markerLeft = thumbHalfWidth + startAnchorOffset + (progress * effectiveUsableWidth) - markerHalfWidth

				marker.type = 'button'
				marker.dataset.feedbackMarker = String(comment.id)
				marker.title = `Jump to ${formatTimestamp(comment.timestampMilliseconds)}`
				marker.setAttribute('aria-label', `Jump to ${formatTimestamp(comment.timestampMilliseconds)}`)
				marker.style.position = 'absolute'
				marker.style.left = `${markerLeft}px`
				marker.style.top = '0'
				marker.style.width = '10px'
				marker.style.height = '12px'
				marker.style.border = '0'
				marker.style.background = 'transparent'
				marker.style.pointerEvents = 'auto'
				marker.style.cursor = 'pointer'
				marker.style.padding = '0'
				marker.innerHTML = `
					<span data-feedback-marker-line style="display:block;width:2px;height:7px;margin:0 auto;background:#ffffff;box-shadow:0 0 0 1px rgba(0,0,0,0.18);"></span>
					<span data-feedback-marker-triangle style="display:block;width:0;height:0;margin:0 auto;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid #ffffff;filter:drop-shadow(0 1px 0 rgba(0,0,0,0.18));"></span>
				`
				marker.addEventListener('click', (event) => {
					event.stopPropagation()
					this.jumpToComment(comment.timestampMilliseconds, comment.id)
				})
				this._timelineContainer.appendChild(marker)
			}

			this.applySelectionStyles()
		}

		startEditing(commentId, message) {
			this._editingCommentId = commentId
			this._editingMessage = message
			this._errorMessage = ''
			this.render()
		}

		cancelEditing() {
			this._editingCommentId = null
			this._editingMessage = ''
			this._errorMessage = ''
			this.render()
		}

		async saveEditedComment(commentId) {
			if (this._savingCommentId !== null) {
				return
			}

			const message = this._editingMessage.trim()
			if (message === '') {
				this._errorMessage = 'Message is required'
				this.render()
				return
			}

			this._savingCommentId = commentId
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(updateCommentUrl(commentId), {
					method: 'PUT',
					headers: getFeedbackHeaders({ json: true }),
					credentials: 'same-origin',
					body: JSON.stringify({ message }),
				})
				const data = await response.json()

				if (!response.ok) {
					this._errorMessage = data.message ?? 'Failed to update feedback.'
				} else {
					this._comments = this._comments.map((comment) => {
						return comment.id === commentId ? data.comment : comment
					})
					this._editingCommentId = null
					this._editingMessage = ''
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to update feedback.'
			} finally {
				this._savingCommentId = null
				this.render()
			}
		}

		async deleteComment(commentId) {
			if (this._deletingCommentId !== null) {
				return
			}

			if (!window.confirm('Delete this feedback?')) {
				return
			}

			this._deletingCommentId = commentId
			this._errorMessage = ''
			this.render()

			try {
				const response = await fetch(deleteCommentUrl(commentId), {
					method: 'DELETE',
					headers: getFeedbackHeaders(),
					credentials: 'same-origin',
				})

				if (!response.ok && response.status !== 204) {
					const data = await response.json()
					this._errorMessage = data.message ?? 'Failed to delete feedback.'
				} else {
					this._comments = this._comments.filter((comment) => comment.id !== commentId)
					if (this._editingCommentId === commentId) {
						this._editingCommentId = null
						this._editingMessage = ''
					}
				}
			} catch (error) {
				console.error(error)
				this._errorMessage = 'Failed to delete feedback.'
			} finally {
				this._deletingCommentId = null
				this.render()
			}
		}

		attachEvents() {
			const form = this.querySelector('[data-feedback-form]')
			const messageInput = this.querySelector('[data-feedback-message]')
			const filterButtons = this.querySelectorAll('[data-feedback-filter]')
			const statusButtons = this.querySelectorAll('[data-feedback-status]')
			const editButtons = this.querySelectorAll('[data-feedback-edit]')
			const deleteButtons = this.querySelectorAll('[data-feedback-delete]')
			const editMessageInput = this.querySelector('[data-feedback-edit-message]')
			const publicShareToggle = this.querySelector('[data-feedback-public-share-auto-open]')
			const publicShareLinkButton = this.querySelector('[data-feedback-create-public-share-link]')
			const saveEditButtons = this.querySelectorAll('[data-feedback-save-edit]')
			const cancelEditButtons = this.querySelectorAll('[data-feedback-cancel-edit]')
			const jumpCards = this.querySelectorAll('[data-feedback-card]')

			form?.addEventListener('submit', (event) => {
				event.preventDefault()
				this.submitComment()
			})

			const stopViewerBubble = (event) => {
				event.stopPropagation()
			}

			for (const eventName of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
				form?.addEventListener(eventName, stopViewerBubble)
			}

			messageInput?.addEventListener('input', (event) => {
				this._newMessage = event.target.value
			})
			messageInput?.addEventListener('pointerdown', stopViewerBubble)
			messageInput?.addEventListener('mousedown', stopViewerBubble)
			messageInput?.addEventListener('click', stopViewerBubble)
			messageInput?.addEventListener('focus', stopViewerBubble)
			messageInput?.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' && !event.shiftKey) {
					event.preventDefault()
					void this.submitComment()
				}
			})

			publicShareToggle?.addEventListener('change', (event) => {
				void this.updatePublicShareAutoOpen(Boolean(event.target.checked))
			})

			publicShareLinkButton?.addEventListener('click', (event) => {
				event.preventDefault()
				void this.createPublicShareLink()
			})

			filterButtons.forEach((button) => {
				button.addEventListener('click', () => {
					this._filter = button.dataset.feedbackFilter
					this.render()
				})
			})

			statusButtons.forEach((button) => {
				button.addEventListener('click', () => {
					this.setCommentStatus(Number(button.dataset.feedbackStatus), button.dataset.feedbackNextStatus)
				})
			})

			editButtons.forEach((button) => {
				button.addEventListener('click', () => {
					this.startEditing(Number(button.dataset.feedbackEdit), button.dataset.feedbackMessage ?? '')
				})
			})

			deleteButtons.forEach((button) => {
				button.addEventListener('click', () => {
					this.deleteComment(Number(button.dataset.feedbackDelete))
				})
			})

			editMessageInput?.addEventListener('input', (event) => {
				this._editingMessage = event.target.value
			})
			editMessageInput?.addEventListener('pointerdown', stopViewerBubble)
			editMessageInput?.addEventListener('mousedown', stopViewerBubble)
			editMessageInput?.addEventListener('click', stopViewerBubble)
			editMessageInput?.addEventListener('focus', stopViewerBubble)
			editMessageInput?.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' && !event.shiftKey && this._editingCommentId !== null) {
					event.preventDefault()
					void this.saveEditedComment(this._editingCommentId)
				}
			})

			saveEditButtons.forEach((button) => {
				button.addEventListener('click', () => {
					this.saveEditedComment(Number(button.dataset.feedbackSaveEdit))
				})
			})

			cancelEditButtons.forEach((button) => {
				button.addEventListener('click', () => {
					this.cancelEditing()
				})
			})

			jumpCards.forEach((card) => {
				card.addEventListener('click', (event) => {
					if (event.target.closest('button, textarea, input, label')) {
						return
					}

					this.jumpToComment(Number(card.dataset.feedbackJump), Number(card.dataset.feedbackCard))
				})
			})
		}

		render() {
			const error = this._errorMessage
				? `<p style="margin: 0 0 12px; color: var(--color-error-text); line-height: 1.4;">${escapeHtml(this._errorMessage)}</p>`
				: ''
			const visibleComments = this.getVisibleComments()
			const currentUserUid = getCurrentUserUid()
			const activeFilterStyle = 'background: var(--color-primary-element); color: var(--color-primary-element-text); border: 1px solid var(--color-primary-element);'
			const inactiveFilterStyle = 'background: var(--color-main-background); color: var(--color-text-maxcontrast); border: 1px solid var(--color-border);'

			const commentList = this._loading
				? '<p style="margin: 0; color: var(--color-text-maxcontrast);">Loading feedback...</p>'
				: visibleComments.length === 0
					? `<p style="margin: 0; color: var(--color-text-maxcontrast); line-height: 1.4;">No ${escapeHtml(this._filter)} feedback for this file.</p>`
					: `<ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 10px;">${visibleComments.map((comment) => {
						const canManage = Boolean(comment.canManage ?? (comment.authorUid === currentUserUid))
						const isEditing = this._editingCommentId === comment.id
						const createdAtLabel = formatCreatedAt(comment.createdAt)
						const headerBlock = `<div style="display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; cursor: pointer;">
							<strong style="cursor: pointer;">${formatTimestamp(comment.timestampMilliseconds)}</strong>
							<span style="color: var(--color-text-maxcontrast); font-size: 0.85rem; cursor: pointer; text-align: right;" title="${new Date((Number(comment.createdAt) || 0) * 1000).toLocaleString()}">${escapeHtml(comment.authorDisplayName ?? comment.authorUid)}${createdAtLabel ? ` · ${escapeHtml(createdAtLabel)}` : ''}</span>
						</div>`
						const messageBlock = isEditing
							? `${headerBlock}<div style="display:grid;gap:8px;">
								<textarea data-feedback-edit-message rows="3" style="width:100%;resize:vertical;">${escapeHtml(this._editingMessage)}</textarea>
								<div style="display:flex;justify-content:flex-end;gap:8px;">
									${renderIconButton({
										title: 'Save feedback',
										icon: icons.save,
										dataAttributes: `data-feedback-save-edit="${comment.id}"`,
										disabled: this._savingCommentId === comment.id,
										variant: 'primary',
									})}
									${renderIconButton({
										title: 'Cancel editing',
										icon: icons.cancel,
										dataAttributes: 'data-feedback-cancel-edit="1"',
										disabled: this._savingCommentId === comment.id,
									})}
								</div>
							</div>`
							: `<div
								title="Jump to ${formatTimestamp(comment.timestampMilliseconds)}"
								aria-label="Jump to ${formatTimestamp(comment.timestampMilliseconds)}"
								style="display:block;width:100%;text-align:left;cursor:pointer;"
							>
								${headerBlock}
								<p style="margin: 0; line-height: 1.4; cursor:pointer;">${escapeHtml(comment.message)}</p>
							</div>`

						return `
							<li
								data-feedback-card="${comment.id}"
								data-feedback-jump="${comment.timestampMilliseconds}"
								style="border: 1px solid var(--color-border); border-radius: 10px; padding: 10px; cursor: ${isEditing ? 'default' : 'pointer'};"
							>
								${messageBlock}
								<div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
									${renderIconButton({
										title: comment.status === 'done' ? 'Reopen feedback' : 'Mark feedback as done',
										icon: comment.status === 'done' ? icons.reopen : icons.done,
										dataAttributes: `data-feedback-status="${comment.id}" data-feedback-next-status="${comment.status === 'done' ? 'open' : 'done'}"`,
										disabled: this._updatingCommentId === comment.id || isEditing,
										variant: comment.status === 'done' ? 'neutral' : 'success',
									})}
									${canManage ? renderIconButton({
										title: 'Edit feedback',
										icon: icons.edit,
										dataAttributes: `data-feedback-edit="${comment.id}" data-feedback-message="${escapeHtml(comment.message)}"`,
										disabled: this._deletingCommentId === comment.id || this._updatingCommentId === comment.id || isEditing,
									}) : ''}
									${canManage ? renderIconButton({
										title: 'Delete feedback',
										icon: icons.delete,
										dataAttributes: `data-feedback-delete="${comment.id}"`,
										disabled: this._deletingCommentId === comment.id || isEditing,
										variant: 'danger',
									}) : ''}
								</div>
							</li>
						`
					}).join('')}</ul>`

			const showPublicShareAutoOpenToggle = !isPublicShareContext() && this.fileId && this._canManagePublicShareAutoOpen
			const shareButtonStyle = this._publicShareLinkStatus
				? 'display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:8px 14px;border:1px solid var(--color-success);border-radius:10px;background:var(--color-success);color:var(--color-primary-element-text);cursor:pointer;font-weight:600;'
				: 'display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:8px 14px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-main-background);color:var(--color-main-text);cursor:pointer;font-weight:600;'
			const publicShareButton = showPublicShareAutoOpenToggle ? `
				<button
					data-feedback-create-public-share-link
					type="button"
					${this._creatingPublicShareLink ? 'disabled' : ''}
					style="${shareButtonStyle}"
				>
					${icons.link}
					<span>${this._creatingPublicShareLink ? 'Sharing...' : (this._publicShareLinkStatus || 'Share')}</span>
				</button>
			` : '<span></span>'
			const publicShareToggle = showPublicShareAutoOpenToggle ? `
				<label style="display:flex; align-items:center; gap:8px; color: var(--color-text-maxcontrast); font-size: 0.85rem;">
					<input
						data-feedback-public-share-auto-open
						type="checkbox"
						${this._publicShareAutoOpen ? 'checked' : ''}
						${this._savingPublicShareAutoOpen ? 'disabled' : ''}
					>
					<span>Open feedbackpanel in public shares</span>
				</label>
			` : ''
			this.innerHTML = `
				<section style="padding: 16px;">
					<div style="margin-bottom: 16px;">
						<h2 style="margin: 0 0 4px; font-size: 1rem;">Feedback</h2>
						<p style="margin: 0; line-height: 1.4; color: var(--color-text-maxcontrast);">${escapeHtml(this.fileName)}</p>
					</div>
					${error}
					<form data-feedback-form style="display: grid; gap: 8px; margin: 0 0 16px;">
						<p style="margin: 0; font-size: 0.85rem; color: var(--color-text-maxcontrast); line-height: 1.4;">
							Your comment will be saved at this time of the video:
							<strong data-feedback-current-playhead>${formatTimestampWithoutMilliseconds(0)}</strong>
						</p>
						<label style="display: grid; gap: 4px;">
							<span style="font-size: 0.85rem; color: var(--color-text-maxcontrast);">Comment:</span>
							<textarea data-feedback-message rows="3" style="width: 100%; resize: vertical;">${escapeHtml(this._newMessage)}</textarea>
						</label>
						<div style="display:grid; gap:8px;">
							<div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
								${publicShareButton}
								<button type="submit" ${this._saving ? 'disabled' : ''} style="justify-self: end;">${this._saving ? 'Saving...' : 'Add feedback'}</button>
							</div>
							${publicShareToggle}
						</div>
					</form>
					<div style="display: flex; gap: 8px; margin: 0 0 16px;">
						<button
							data-feedback-filter="open"
							type="button"
							title="Show open feedback"
							aria-label="Show open feedback"
							${this._filter === 'open' ? 'disabled' : ''}
							style="${this._filter === 'open' ? activeFilterStyle : inactiveFilterStyle}"
						>Open</button>
						<button
							data-feedback-filter="done"
							type="button"
							title="Show done feedback"
							aria-label="Show done feedback"
							${this._filter === 'done' ? 'disabled' : ''}
							style="${this._filter === 'done' ? activeFilterStyle : inactiveFilterStyle}"
						>Done</button>
					</div>
					${commentList}
				</section>
			`
			this.attachEvents()
			this.applySelectionStyles()
			this.syncCurrentPlayheadLabel()
			this.syncTimelineMarkers()
		}
	}

	window.customElements.define(tagName, TimestampCommentsTab)
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		setupTab()
	}, { once: true })
} else {
	setupTab()
}

window.__feedbackappSidebarRegistered = true
