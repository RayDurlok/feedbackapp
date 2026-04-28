const feedbackButtonId = 'feedbackapp-viewer-panel-button'
const feedbackTabId = 'feedbackapp-timestamp-comments'
const feedbackTabSelectors = [
	'#tab-button-feedbackapp-timestamp-comments',
	'[aria-controls="tab-panel-feedbackapp-timestamp-comments"]',
	'[data-id="feedbackapp-timestamp-comments"]',
]

let viewerButtonEnabled = null
let viewerButtonConfigPromise = null
let filesApiPromise = null

async function loadFilesApi() {
	if (!filesApiPromise) {
		filesApiPromise = import('@nextcloud/files').catch(() => null)
	}

	return filesApiPromise
}

function isLoggedInFilesViewer() {
	return Boolean(document.head?.dataset?.user) && !/\/s\/[^/]+/.test(window.location.pathname)
}

async function shouldShowViewerButton() {
	if (!isLoggedInFilesViewer()) {
		return false
	}

	if (viewerButtonEnabled !== null) {
		return viewerButtonEnabled
	}

	if (!viewerButtonConfigPromise) {
		viewerButtonConfigPromise = fetch(window.OC.generateUrl('/apps/feedbackapp/settings/viewer-config'), {
			headers: {
				Accept: 'application/json',
				requesttoken: window.OC.requestToken,
			},
			credentials: 'same-origin',
		})
			.then(async (response) => {
				const data = await response.json()
				return response.ok && data.showVideoViewerQuickAccess !== false
			})
			.catch(() => true)
			.then((enabled) => {
				viewerButtonEnabled = enabled
				return enabled
			})
	}

	return viewerButtonConfigPromise
}

function getActiveVideoElement() {
	const videos = [...document.querySelectorAll('.viewer__content .viewer__file-wrapper:not(.viewer__file-wrapper--hidden) video, .plyr video, video')]
	return videos.find((video) => {
		const style = window.getComputedStyle(video)
		const rect = video.getBoundingClientRect()
		return !video.closest('.viewer__file-wrapper--hidden, [aria-hidden="true"], [inert]')
			&& style.display !== 'none'
			&& style.visibility !== 'hidden'
			&& rect.width > 0
			&& rect.height > 0
	}) ?? null
}

function getActiveViewerHeader() {
	const video = getActiveVideoElement()
	if (!video) {
		return null
	}

	const modalRoot = video.closest('.modal-mask')
		?? video.closest('[role="dialog"]')
		?? video.closest('.modal-wrapper')?.closest('.modal-mask, [role="dialog"]')
		?? video.closest('.modal-container')?.closest('.modal-mask, [role="dialog"]')
		?? video.closest('.viewer__content')?.closest('.modal-mask, [role="dialog"]')

	const header = modalRoot?.querySelector('.modal-header')
	if (header) {
		return header
	}

	const activeTitle = document.querySelector('.viewer__content .viewer__file-wrapper:not(.viewer__file-wrapper--hidden)')?.closest('.modal-container')
		?.querySelector('.viewer__file')?.textContent?.trim()

	return [...document.querySelectorAll('.modal-header')]
		.find((candidate) => {
			const style = window.getComputedStyle(candidate)
			const rect = candidate.getBoundingClientRect()
			return style.display !== 'none'
				&& style.visibility !== 'hidden'
				&& rect.width > 0
				&& rect.height > 0
				&& (!activeTitle || candidate.textContent.includes(activeTitle))
		}) ?? null
}

function getActiveViewerRoot() {
	const video = getActiveVideoElement()
	return video?.closest('.modal-mask')
		?? video?.closest('[role="dialog"]')
		?? video?.closest('.modal-wrapper')?.closest('.modal-mask, [role="dialog"]')
		?? video?.closest('.modal-container')?.closest('.modal-mask, [role="dialog"]')
		?? null
}

function getHeaderIconsMenu(header) {
	return header?.querySelector('.icons-menu') ?? null
}

function getSidebarTrigger(header) {
	return header?.querySelector('.unfold-more-horizontal-icon')?.closest('button, [role="button"]')
		?? header?.querySelector('button[aria-label*="Details" i]')
		?? header?.querySelector('button[title*="Details" i]')
		?? document.querySelector('button[aria-label*="Details" i]')
		?? document.querySelector('button[title*="Details" i]')
		?? document.querySelector('button[aria-controls*="app-sidebar" i]')
		?? null
}

function getActiveVideoPath() {
	const source = getActiveVideoElement()?.currentSrc || getActiveVideoElement()?.getAttribute('src') || ''
	if (!source) {
		return null
	}

	try {
		const uid = document.head?.dataset?.user
		const url = new URL(source, window.location.origin)
		const prefix = `/remote.php/dav/files/${encodeURIComponent(uid)}/`
		const offset = url.pathname.indexOf(prefix)
		if (!uid || offset === -1) {
			return null
		}

		const path = url.pathname.slice(offset + prefix.length)
		return path === '' ? null : decodeURIComponent(path)
	} catch {
		return null
	}
}

async function fetchActiveVideoFileInfo() {
	const path = getActiveVideoPath()
	if (!path) {
		return null
	}

	const url = new URL(window.OC.generateUrl('/apps/feedbackapp/api/file-info'), window.location.origin)
	url.searchParams.set('path', path)

	const response = await fetch(url.toString(), {
		headers: {
			Accept: 'application/json',
			requesttoken: window.OC.requestToken,
		},
		credentials: 'same-origin',
	})
	const data = await response.json()
	if (!response.ok) {
		return null
	}

	return data.file ?? null
}

function createSidebarNode(fileInfo, FileClass) {
	const source = getActiveVideoElement()?.currentSrc || getActiveVideoElement()?.getAttribute('src')
	if (!source || !fileInfo || !FileClass) {
		return null
	}

	return new FileClass({
		source,
		root: fileInfo.root,
		id: String(fileInfo.id),
		owner: fileInfo.owner,
		mime: fileInfo.mime,
		permissions: fileInfo.permissions,
		size: fileInfo.size,
		displayname: fileInfo.basename,
		attributes: {
			fileid: fileInfo.fileid,
			mime: fileInfo.mime,
			mimetype: fileInfo.mimetype,
		},
	})
}

function focusFeedbackTab() {
	const tab = feedbackTabSelectors
		.map((selector) => document.querySelector(selector))
		.find(Boolean)

	if (tab) {
		tab.click()
		return true
	}

	return false
}

function focusFeedbackTabSoon() {
	let attempts = 0
	const timer = window.setInterval(() => {
		attempts += 1
		if (focusFeedbackTab() || attempts >= 20) {
			window.clearInterval(timer)
		}
	}, 100)
}

async function openFeedbackSidebar(header) {
	const filesApi = await loadFilesApi()
	const fileInfo = await fetchActiveVideoFileInfo()
	const node = createSidebarNode(fileInfo, filesApi?.File)
	const sidebar = filesApi?.getSidebar?.()
	if (node && sidebar?.available) {
		sidebar.open(node, feedbackTabId)
		sidebar.setActiveTab(feedbackTabId)
		focusFeedbackTabSoon()
		return
	}

	const trigger = getSidebarTrigger(header)
	trigger?.click()
	focusFeedbackTabSoon()
}

function createViewerButton(header) {
	const button = document.createElement('button')
	button.id = feedbackButtonId
	button.type = 'button'
	button.textContent = 'Feedback Panel'
	button.title = 'Open Feedback Panel'
	button.setAttribute('aria-label', 'Open Feedback Panel')
	button.style.height = '30px'
	button.style.padding = '0 12px'
	button.style.border = '1px solid var(--color-border)'
	button.style.borderRadius = '999px'
	button.style.background = 'var(--color-main-background)'
	button.style.color = 'var(--color-main-text)'
	button.style.cursor = 'pointer'
	button.style.boxShadow = '0 0 12px rgba(0, 0, 0, 0.12)'
	button.style.fontSize = '12px'
	button.style.fontWeight = '600'
	button.style.whiteSpace = 'nowrap'
	button.style.position = 'relative'
	button.style.zIndex = '2147483647'
	button.style.pointerEvents = 'auto'

	const swallowEvent = (event) => {
		event.preventDefault()
		event.stopPropagation()
	}

	button.addEventListener('pointerdown', swallowEvent)
	button.addEventListener('mousedown', swallowEvent)
	button.addEventListener('click', (event) => {
		swallowEvent(event)
		void openFeedbackSidebar(header)
	})

	return button
}

async function syncFeedbackViewerButton() {
	if (!await shouldShowViewerButton()) {
		document.getElementById(feedbackButtonId)?.remove()
		return
	}

	const header = getActiveViewerHeader()
	const root = getActiveViewerRoot()
	const iconsMenu = getHeaderIconsMenu(header)
	if (!header && !root) {
		document.getElementById(feedbackButtonId)?.remove()
		return
	}

	const existingButton = document.getElementById(feedbackButtonId)
	const button = existingButton ?? createViewerButton(header)
	const sidebarTrigger = getSidebarTrigger(header)
	if (iconsMenu && sidebarTrigger?.parentElement === iconsMenu && button.parentElement !== iconsMenu) {
		iconsMenu.insertBefore(button, sidebarTrigger)
		button.style.marginRight = '8px'
		button.style.position = 'relative'
		button.style.top = ''
		button.style.right = ''
	} else if (iconsMenu && button.parentElement !== iconsMenu) {
		iconsMenu.prepend(button)
		button.style.marginRight = '8px'
		button.style.position = 'relative'
		button.style.top = ''
		button.style.right = ''
	} else if (!iconsMenu && root && button.parentElement !== root) {
		if (window.getComputedStyle(root).position === 'static') {
			root.style.position = 'relative'
		}
		root.appendChild(button)
		button.style.position = 'absolute'
		button.style.top = '10px'
		button.style.right = '58px'
		button.style.marginRight = ''
	}
}

window.setInterval(() => {
	void syncFeedbackViewerButton()
}, 700)

void syncFeedbackViewerButton()

window.__feedbackappFilesPluginLoaded = true
