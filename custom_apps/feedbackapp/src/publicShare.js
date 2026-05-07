import { getFeedbackHeaders, getPublicShareFilePath, publicConfigUrl } from './shared/api.js'

function isPublicSharePage() {
	return /\/s\/[^/]+/.test(window.location.pathname) && !document.head?.dataset?.user
}

function getPublicVideoTitle() {
	return getPublicShareFilePath()?.split('/').pop()
		|| document.querySelector('video')?.getAttribute('src')?.split('/').pop()
		|| document.querySelector('button[aria-label="Ansicht"]')?.textContent?.trim()
		|| document.title
		|| 'Shared video'
}

function getCurrentPublicVideoKey() {
	return getPublicShareFilePath() ?? getPublicVideoTitle()
}

function getPublicViewerHost() {
	const video = document.querySelector('.plyr video, video')
	if (!video) {
		return document.body
	}

	return video.closest('[role="dialog"]')
		|| video.closest('.modal-wrapper')
		|| video.closest('.modal-container')
		|| video.closest('.viewer')
		|| video.closest('.viewer__content')
		|| video.closest('main#app-content-vue, main.app-content, main')
		|| document.body
}

function isVisibleElement(element) {
	if (!element) {
		return false
	}

	const rect = element.getBoundingClientRect()
	const style = window.getComputedStyle(element)
	return rect.width > 0
		&& rect.height > 0
		&& style.display !== 'none'
		&& style.visibility !== 'hidden'
}

function getPublicViewerHeader() {
	const host = getPublicViewerHost()
	const scopedHeader = [...host.querySelectorAll?.('.modal-header') ?? []].find(isVisibleElement)
	if (scopedHeader) {
		return scopedHeader
	}

	const title = getPublicVideoTitle()
	return [...document.querySelectorAll('.modal-header')]
		.find((header) => isVisibleElement(header) && (!title || header.textContent.includes(title)))
		?? null
}

function getPublicHeaderAnchor(header) {
	const root = header ?? document
	return root.querySelector('.unfold-more-horizontal-icon')?.closest('button, [role="button"]')
		|| root.querySelector('button[aria-label="Close"]')
		|| root.querySelector('button[aria-label="Schließen"]')
		|| root.querySelector('button[aria-label="Actions"]')
		|| root.querySelector('button[aria-label="Aktionen"]')
		|| root.querySelector('button[aria-label="More actions"]')
		|| root.querySelector('button[aria-label="Mehr Aktionen"]')
}

function getPublicHeaderIconsMenu(header) {
	return header?.querySelector('.icons-menu') ?? null
}

function applyPublicShareBrowserTheme() {
	const themeColor = '#111111'
	let themeMeta = document.querySelector('meta[name="theme-color"]')
	if (!themeMeta) {
		themeMeta = document.createElement('meta')
		themeMeta.setAttribute('name', 'theme-color')
		document.head.appendChild(themeMeta)
	}
	themeMeta.setAttribute('content', themeColor)

	let statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
	if (!statusMeta) {
		statusMeta = document.createElement('meta')
		statusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
		document.head.appendChild(statusMeta)
	}
	statusMeta.setAttribute('content', 'black-translucent')

	document.documentElement.style.setProperty('background-color', themeColor, 'important')
	document.body?.style.setProperty('background-color', themeColor, 'important')
}

function enableVideoClickToggle() {
	const video = document.querySelector('.plyr video, video')
	const target = video?.closest('.plyr__video-wrapper') ?? video
	if (!video || !target || target.dataset.feedbackClickToggle === 'true') {
		return
	}

	target.dataset.feedbackClickToggle = 'true'
	let lastToggleAt = 0
	const togglePlayback = (event) => {
		if (event.target.closest?.('.plyr__controls, .plyr__control, button, input, textarea, select, a, #feedbackapp-public-panel')) {
			return
		}

		const now = Date.now()
		if (now - lastToggleAt < 350) {
			return
		}
		lastToggleAt = now

		event.preventDefault()
		event.stopPropagation()
		if (video.paused) {
			void video.play()
		} else {
			video.pause()
		}
	}

	target.addEventListener('pointerup', togglePlayback, true)
	target.addEventListener('click', togglePlayback, true)
}

const publicFeedbackState = {
	panel: null,
	content: null,
	toggleButton: null,
	panelTitle: null,
	element: null,
	host: null,
	videoKey: null,
	config: null,
	configPromise: null,
	hasAppliedInitialState: false,
	isSyncing: false,
	disabled: false,
}

const MOBILE_PANEL_BREAKPOINT = 760
const OVERLAY_PANEL_BREAKPOINT = 1100
const OVERLAY_PANEL_HEIGHT = 'min(32dvh, 340px)'
const OVERLAY_PANEL_MIN_HEIGHT = 200
const OVERLAY_PANEL_MAX_HEIGHT_OFFSET = 120

function shouldOverlayPanel(width = 380) {
	return window.matchMedia?.(`(max-width: ${MOBILE_PANEL_BREAKPOINT}px)`)?.matches
		|| window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches
		|| window.innerWidth <= MOBILE_PANEL_BREAKPOINT
		|| window.innerWidth <= Math.max(OVERLAY_PANEL_BREAKPOINT, width + 720)
}

function getPanelToggleIconSvg() {
	return `
		<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="3.5" y="5.5" width="17" height="13" rx="1.5" stroke="currentColor" stroke-width="2"/>
			<path d="M15 6.5V17.5" stroke="currentColor" stroke-width="2"/>
		</svg>
	`.trim()
}

function applyPanelLayout(isOpen, width) {
	const isOverlay = shouldOverlayPanel(width)
	const main = document.querySelector('main#app-content-vue, main.app-content, main')
	const video = document.querySelector('.plyr video, video')
	const playerRoot = video?.closest('.plyr')
	const videoWrapper = video?.closest('.plyr__video-wrapper')
	const layoutTargets = [playerRoot, videoWrapper].filter(Boolean)

	if (main) {
		main.style.transition = 'padding-right 180ms ease'
		main.style.paddingRight = isOpen && !isOverlay ? `${width}px` : '0'
	}

	layoutTargets.forEach((target) => {
		target.style.transition = 'width 180ms ease, max-width 180ms ease, margin-right 180ms ease'
		target.style.boxSizing = 'border-box'
		target.style.maxWidth = isOpen && !isOverlay ? `calc(100vw - ${width}px)` : ''
		target.style.width = isOpen && !isOverlay ? `calc(100vw - ${width}px)` : ''
		target.style.marginRight = isOpen && !isOverlay ? `${width}px` : ''
	})
}

function applyPanelShellLayout(panel, host) {
	const width = Number.parseInt(panel.dataset.expandedWidth || '380', 10)
	const isOverlay = shouldOverlayPanel(width)
	panel.style.position = isOverlay || host === document.body ? 'fixed' : 'absolute'
	panel.style.top = isOverlay ? 'auto' : (host === document.body ? 'var(--header-height, 50px)' : '48px')
	panel.style.left = isOverlay ? '0' : ''
	panel.style.right = '0'
	panel.style.bottom = '0'
	panel.style.maxWidth = isOverlay ? '100vw' : 'min(38vw, 420px)'
	panel.style.height = isOverlay ? (panel.dataset.overlayHeight ? `${panel.dataset.overlayHeight}px` : OVERLAY_PANEL_HEIGHT) : ''
	panel.style.borderRadius = isOverlay ? '14px 14px 0 0' : '0'
	panel.style.transition = isOverlay
		? 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease'
		: 'width 180ms ease, box-shadow 180ms ease, border-color 180ms ease'
}

function updatePanelState(panel, content, toggleButton, isOpen) {
	const width = Number.parseInt(panel.dataset.expandedWidth || '380', 10)
	const isOverlay = shouldOverlayPanel(width)
	panel.dataset.open = isOpen ? 'true' : 'false'
	publicFeedbackState.element?.toggleAttribute('data-feedback-compact-public', isOverlay)
	panel.style.width = isOverlay ? '100vw' : (isOpen ? `${width}px` : '0')
	panel.style.height = isOverlay ? (panel.dataset.overlayHeight ? `${panel.dataset.overlayHeight}px` : OVERLAY_PANEL_HEIGHT) : ''
	panel.style.transform = isOverlay && !isOpen ? 'translateY(calc(100% + 2px))' : 'translateY(0)'
	panel.style.borderLeftColor = isOpen && !isOverlay ? 'var(--color-border)' : 'transparent'
	panel.style.borderTopColor = isOpen && isOverlay ? 'var(--color-border)' : 'transparent'
	panel.style.boxShadow = isOpen
		? (isOverlay ? '0 -12px 28px rgba(0, 0, 0, 0.26)' : '0 0 24px rgba(0, 0, 0, 0.18)')
		: 'none'
	panel.style.pointerEvents = isOpen ? 'auto' : 'none'
	content.style.opacity = isOpen ? '1' : '0'
	content.style.pointerEvents = isOpen ? 'auto' : 'none'
	toggleButton.textContent = 'Feedback Panel'
	toggleButton.title = isOpen ? 'Feedback einklappen' : 'Feedback ausklappen'
	toggleButton.setAttribute('aria-label', isOpen ? 'Feedback einklappen' : 'Feedback ausklappen')
	applyPanelLayout(isOpen, width)
	if (!isOverlay) {
		window.dispatchEvent(new Event('resize'))
	}
}

function getOverlayPanelHeightBounds() {
	const viewportHeight = window.visualViewport?.height ?? window.innerHeight
	return {
		min: Math.min(OVERLAY_PANEL_MIN_HEIGHT, Math.max(160, viewportHeight - OVERLAY_PANEL_MAX_HEIGHT_OFFSET)),
		max: Math.max(OVERLAY_PANEL_MIN_HEIGHT, viewportHeight - OVERLAY_PANEL_MAX_HEIGHT_OFFSET),
	}
}

function setOverlayPanelHeight(panel, height) {
	const { min, max } = getOverlayPanelHeightBounds()
	const nextHeight = Math.min(max, Math.max(min, height))
	panel.dataset.overlayHeight = String(Math.round(nextHeight))
	panel.style.height = `${Math.round(nextHeight)}px`
}

async function fetchPublicConfig() {
	const url = publicConfigUrl()
	if (!url) {
		return { enabled: true, autoOpenSidebar: false }
	}

	try {
		const response = await fetch(url, {
			headers: getFeedbackHeaders(),
			credentials: 'same-origin',
		})
		const data = await response.json()
		if (!response.ok) {
			return { enabled: true, autoOpenSidebar: false }
		}
		return {
			enabled: data.enabled !== false,
			autoOpenSidebar: Boolean(data.autoOpenSidebar),
		}
	} catch {
		return { enabled: true, autoOpenSidebar: false }
	}
}

async function getPublicConfig() {
	if (publicFeedbackState.config) {
		return publicFeedbackState.config
	}

	if (!publicFeedbackState.configPromise) {
		publicFeedbackState.configPromise = fetchPublicConfig()
			.then((config) => {
				publicFeedbackState.config = config
				return config
			})
			.finally(() => {
				publicFeedbackState.configPromise = null
			})
	}

	return publicFeedbackState.configPromise
}

function syncPublicFeedbackPanel(panel, panelTitle, element) {
	const nextKey = getCurrentPublicVideoKey()
	if (!nextKey || panel.dataset.videoKey === nextKey) {
		return
	}

	panel.dataset.videoKey = nextKey
	const nextTitle = getPublicVideoTitle()
	panelTitle.textContent = nextTitle
	panelTitle.title = nextTitle
	element.setAttribute('data-feedback-public-title', nextTitle)
	element.refreshPublicShareContext?.()
}

async function mountPublicFeedbackPanel() {
	if (!isPublicSharePage()) {
		return
	}

	applyPublicShareBrowserTheme()

	const ensureMounted = async () => {
		if (publicFeedbackState.isSyncing || publicFeedbackState.disabled) {
			return
		}

		if (!document.querySelector('.plyr__video-wrapper')) {
			return
		}
		enableVideoClickToggle()

		publicFeedbackState.isSyncing = true
		try {
		const config = await getPublicConfig()
		if (!config.enabled) {
			publicFeedbackState.disabled = true
			return
		}

		const host = getPublicViewerHost()
		if (host !== document.body && window.getComputedStyle(host).position === 'static') {
			host.style.position = 'relative'
		}

		if (!publicFeedbackState.panel) {
			const panel = document.createElement('aside')
			panel.id = 'feedbackapp-public-panel'
			panel.dataset.expandedWidth = '380'
			panel.dataset.open = 'false'
			panel.style.right = '0'
			panel.style.bottom = '0'
			panel.style.width = '0'
			panel.style.maxWidth = 'min(38vw, 420px)'
			panel.style.minWidth = '0'
			panel.style.background = 'var(--color-main-background)'
			panel.style.borderLeft = '1px solid var(--color-border)'
			panel.style.borderLeftColor = 'transparent'
			panel.style.borderTop = '1px solid transparent'
			panel.style.boxSizing = 'border-box'
			panel.style.overflow = 'hidden'
			panel.style.zIndex = '2147483646'
			panel.style.boxShadow = 'none'
			panel.style.pointerEvents = 'none'
			panel.style.transition = 'width 180ms ease, box-shadow 180ms ease, border-color 180ms ease'

			const content = document.createElement('div')
			content.style.height = '100%'
			content.style.display = 'flex'
			content.style.flexDirection = 'column'
			content.style.background = 'var(--color-main-background)'
			content.style.opacity = '0'
			content.style.pointerEvents = 'none'
			content.style.transition = 'opacity 120ms ease'

			const panelHeader = document.createElement('div')
			panelHeader.style.display = 'flex'
			panelHeader.style.alignItems = 'center'
			panelHeader.style.justifyContent = 'flex-end'
			panelHeader.style.gap = '12px'
			panelHeader.style.padding = '12px 16px'
			panelHeader.style.borderBottom = '1px solid var(--color-border)'
			panelHeader.style.background = 'var(--color-main-background)'
			panelHeader.style.flex = '0 0 auto'

			const panelTitle = document.createElement('strong')
			panelTitle.style.fontSize = '14px'
			panelTitle.style.fontWeight = '700'
			panelTitle.style.color = 'var(--color-main-text)'
			panelTitle.style.display = 'none'

			const collapseButton = document.createElement('button')
			collapseButton.type = 'button'
			collapseButton.innerHTML = getPanelToggleIconSvg()
			collapseButton.title = 'Feedback einklappen'
			collapseButton.setAttribute('aria-label', 'Feedback einklappen')
			collapseButton.style.height = '32px'
			collapseButton.style.width = '32px'
			collapseButton.style.padding = '0'
			collapseButton.style.border = '1px solid var(--color-border)'
			collapseButton.style.borderRadius = '8px'
			collapseButton.style.background = 'var(--color-main-background)'
			collapseButton.style.color = 'var(--color-main-text)'
			collapseButton.style.cursor = 'pointer'
			collapseButton.style.display = 'inline-flex'
			collapseButton.style.alignItems = 'center'
			collapseButton.style.justifyContent = 'center'

			panelHeader.appendChild(panelTitle)
			panelHeader.appendChild(collapseButton)

			const panelBody = document.createElement('div')
			panelBody.style.flex = '1 1 auto'
			panelBody.style.minHeight = '0'
			panelBody.style.overflow = 'auto'

			const resizeHandle = document.createElement('button')
			resizeHandle.type = 'button'
			resizeHandle.title = 'Feedbackpanel height'
			resizeHandle.setAttribute('aria-label', 'Feedbackpanel height')
			resizeHandle.innerHTML = '<span aria-hidden="true">=</span>'
			resizeHandle.style.display = 'none'
			resizeHandle.style.position = 'absolute'
			resizeHandle.style.top = '0'
			resizeHandle.style.left = '50%'
			resizeHandle.style.transform = 'translate(-50%, calc(-50% + 1px))'
			resizeHandle.style.zIndex = '1'
			resizeHandle.style.alignItems = 'center'
			resizeHandle.style.justifyContent = 'center'
			resizeHandle.style.width = '64px'
			resizeHandle.style.height = '24px'
			resizeHandle.style.padding = '0'
			resizeHandle.style.border = '0'
			resizeHandle.style.borderRadius = '0 0 8px 8px'
			resizeHandle.style.background = 'transparent'
			resizeHandle.style.color = 'var(--color-text-maxcontrast)'
			resizeHandle.style.cursor = 'ns-resize'
			resizeHandle.style.fontSize = '17px'
			resizeHandle.style.fontWeight = '700'
			resizeHandle.style.lineHeight = '1'
			resizeHandle.style.touchAction = 'none'
			resizeHandle.style.userSelect = 'none'

			const element = document.createElement('feedbackapp-timestamp-comments-tab')
			element.style.display = 'block'
			element.style.minHeight = '100%'
			element.addEventListener('feedbackapp-close-public-panel', () => {
				updatePanelState(panel, content, toggleButton, false)
			})
			resizeHandle.addEventListener('pointerdown', (event) => {
				if (!shouldOverlayPanel()) {
					return
				}

				event.preventDefault()
				event.stopPropagation()
				resizeHandle.setPointerCapture?.(event.pointerId)
				const startY = event.clientY
				const startHeight = panel.getBoundingClientRect().height

				const onMove = (moveEvent) => {
					moveEvent.preventDefault()
					moveEvent.stopPropagation()
					const nextHeight = startHeight + startY - moveEvent.clientY
					if (nextHeight < getOverlayPanelHeightBounds().min - 40) {
						updatePanelState(panel, content, toggleButton, false)
						onEnd(moveEvent)
						return
					}

					setOverlayPanelHeight(panel, nextHeight)
				}
				const onEnd = (endEvent) => {
					endEvent?.stopPropagation?.()
					resizeHandle.releasePointerCapture?.(event.pointerId)
					window.removeEventListener('pointermove', onMove, true)
					window.removeEventListener('pointerup', onEnd, true)
					window.removeEventListener('pointercancel', onEnd, true)
				}

				window.addEventListener('pointermove', onMove, true)
				window.addEventListener('pointerup', onEnd, true)
				window.addEventListener('pointercancel', onEnd, true)
			})
			panelBody.appendChild(element)
			content.appendChild(panelBody)
			panel.appendChild(resizeHandle)
			panel.appendChild(content)

			const toggleButton = document.createElement('button')
			toggleButton.type = 'button'
			toggleButton.textContent = 'Feedback Panel'
			toggleButton.style.height = '30px'
			toggleButton.style.padding = '0 12px'
			toggleButton.style.border = '1px solid var(--color-border)'
			toggleButton.style.borderRadius = '999px'
			toggleButton.style.background = 'var(--color-main-background)'
			toggleButton.style.color = 'var(--color-main-text)'
			toggleButton.style.cursor = 'pointer'
			toggleButton.style.boxShadow = '0 0 12px rgba(0, 0, 0, 0.12)'
			toggleButton.style.fontSize = '12px'
			toggleButton.style.fontWeight = '600'
			toggleButton.style.whiteSpace = 'nowrap'
			toggleButton.style.zIndex = '2147483647'
			toggleButton.style.pointerEvents = 'auto'
			const swallowEvent = (event) => {
				event.preventDefault()
				event.stopPropagation()
			}
			toggleButton.addEventListener('pointerdown', swallowEvent)
			toggleButton.addEventListener('mousedown', swallowEvent)
			toggleButton.addEventListener('click', (event) => {
				swallowEvent(event)
				updatePanelState(panel, content, toggleButton, panel.dataset.open !== 'true')
			})
			collapseButton.addEventListener('pointerdown', swallowEvent)
			collapseButton.addEventListener('mousedown', swallowEvent)
			collapseButton.addEventListener('click', (event) => {
				swallowEvent(event)
				updatePanelState(panel, content, toggleButton, false)
			})
			publicFeedbackState.panel = panel
			publicFeedbackState.content = content
			publicFeedbackState.toggleButton = toggleButton
			publicFeedbackState.panelTitle = panelTitle
			publicFeedbackState.element = element
			publicFeedbackState.resizeHandle = resizeHandle
		}

		const { panel, content, toggleButton, panelTitle, element } = publicFeedbackState
		applyPanelShellLayout(panel, host)
		publicFeedbackState.resizeHandle.style.display = shouldOverlayPanel() ? 'inline-flex' : 'none'

		if (panel.parentElement !== host) {
			host.appendChild(panel)
			publicFeedbackState.host = host
		}

		const viewerHeader = getPublicViewerHeader()
		const headerAnchor = getPublicHeaderAnchor(viewerHeader)
		const iconsMenu = getPublicHeaderIconsMenu(viewerHeader)
		if (headerAnchor?.parentElement && toggleButton.parentElement !== headerAnchor.parentElement) {
			headerAnchor.parentElement.insertBefore(toggleButton, headerAnchor)
			toggleButton.style.position = 'relative'
			toggleButton.style.top = ''
			toggleButton.style.right = ''
			toggleButton.style.marginRight = '8px'
		} else if (!headerAnchor?.parentElement && iconsMenu && toggleButton.parentElement !== iconsMenu) {
			iconsMenu.prepend(toggleButton)
			toggleButton.style.position = 'relative'
			toggleButton.style.top = ''
			toggleButton.style.right = ''
			toggleButton.style.marginRight = '8px'
		} else if (!headerAnchor?.parentElement && !iconsMenu && toggleButton.parentElement !== document.body) {
			toggleButton.style.position = 'fixed'
			toggleButton.style.top = '10px'
			toggleButton.style.right = '16px'
			toggleButton.style.marginRight = ''
			document.body.appendChild(toggleButton)
		}

		syncPublicFeedbackPanel(panel, panelTitle, element)
		publicFeedbackState.videoKey = getCurrentPublicVideoKey()
		if (!publicFeedbackState.hasAppliedInitialState) {
			updatePanelState(panel, content, toggleButton, config.autoOpenSidebar)
			publicFeedbackState.hasAppliedInitialState = true
		} else if (publicFeedbackState.layoutMode !== (shouldOverlayPanel() ? 'overlay' : 'desktop')) {
			updatePanelState(panel, content, toggleButton, panel.dataset.open === 'true')
		}
		publicFeedbackState.layoutMode = shouldOverlayPanel() ? 'overlay' : 'desktop'
	} finally {
		publicFeedbackState.isSyncing = false
	}
	}

	void ensureMounted()
	window.setInterval(() => {
		void ensureMounted()
	}, 700)
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mountPublicFeedbackPanel, { once: true })
} else {
	mountPublicFeedbackPanel()
}

window.__feedbackappPublicShareLoaded = true
