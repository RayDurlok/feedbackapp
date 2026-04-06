function isPublicSharePage() {
	return /\/s\/[^/]+/.test(window.location.pathname) && !document.head?.dataset?.user
}

function getPublicVideoTitle() {
	return document.querySelector('video')?.getAttribute('src')?.split('/').pop()
		|| document.querySelector('button[aria-label="Ansicht"]')?.textContent?.trim()
		|| document.title
		|| 'Shared video'
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

function getPublicHeaderAnchor() {
	return document.querySelector('button[aria-label="Close"]')
		|| document.querySelector('button[aria-label="Actions"]')
		|| document.querySelector('button[aria-label="More actions"]')
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
	const main = document.querySelector('main#app-content-vue, main.app-content, main')
	const video = document.querySelector('.plyr video, video')
	const playerRoot = video?.closest('.plyr')
	const videoWrapper = video?.closest('.plyr__video-wrapper')
	const layoutTargets = [playerRoot, videoWrapper].filter(Boolean)

	if (main) {
		main.style.transition = 'padding-right 180ms ease'
		main.style.paddingRight = isOpen ? `${width}px` : '0'
	}

	layoutTargets.forEach((target) => {
		target.style.transition = 'width 180ms ease, max-width 180ms ease, margin-right 180ms ease'
		target.style.boxSizing = 'border-box'
		target.style.maxWidth = isOpen ? `calc(100vw - ${width}px)` : ''
		target.style.width = isOpen ? `calc(100vw - ${width}px)` : ''
		target.style.marginRight = isOpen ? `${width}px` : ''
	})
}

function updatePanelState(panel, content, toggleButton, isOpen) {
	const width = Number.parseInt(panel.dataset.expandedWidth || '380', 10)
	panel.dataset.open = isOpen ? 'true' : 'false'
	panel.style.width = isOpen ? `${width}px` : '0'
	panel.style.borderLeftColor = isOpen ? 'var(--color-border)' : 'transparent'
	panel.style.boxShadow = isOpen ? '0 0 24px rgba(0, 0, 0, 0.18)' : 'none'
	panel.style.pointerEvents = isOpen ? 'auto' : 'none'
	content.style.opacity = isOpen ? '1' : '0'
	content.style.pointerEvents = isOpen ? 'auto' : 'none'
	toggleButton.textContent = 'Feedback Panel'
	toggleButton.title = isOpen ? 'Feedback einklappen' : 'Feedback ausklappen'
	toggleButton.setAttribute('aria-label', isOpen ? 'Feedback einklappen' : 'Feedback ausklappen')
	applyPanelLayout(isOpen, width)
	window.dispatchEvent(new Event('resize'))
}

function mountPublicFeedbackPanel() {
	if (!isPublicSharePage()) {
		return
	}

	let attempts = 0
	const timer = window.setInterval(() => {
		attempts += 1

		if (!document.querySelector('.plyr__video-wrapper')) {
			if (attempts >= 40) {
				window.clearInterval(timer)
			}
			return
		}

		if (document.querySelector('#feedbackapp-public-panel')) {
			window.clearInterval(timer)
			return
		}

		const host = getPublicViewerHost()
		if (host !== document.body && window.getComputedStyle(host).position === 'static') {
			host.style.position = 'relative'
		}

		const panel = document.createElement('aside')
		panel.id = 'feedbackapp-public-panel'
		panel.dataset.expandedWidth = '380'
		panel.style.position = host === document.body ? 'fixed' : 'absolute'
		panel.style.top = host === document.body ? 'var(--header-height, 50px)' : '48px'
		panel.style.right = '0'
		panel.style.bottom = '0'
		panel.style.width = '380px'
		panel.style.maxWidth = 'min(38vw, 420px)'
		panel.style.minWidth = '0'
		panel.style.background = 'var(--color-main-background)'
		panel.style.borderLeft = '1px solid var(--color-border)'
		panel.style.boxSizing = 'border-box'
		panel.style.overflow = 'hidden'
		panel.style.zIndex = '2147483646'
		panel.style.transition = 'width 180ms ease, box-shadow 180ms ease, border-color 180ms ease'

		const content = document.createElement('div')
		content.style.height = '100%'
		content.style.display = 'flex'
		content.style.flexDirection = 'column'
		content.style.background = 'var(--color-main-background)'
		content.style.transition = 'opacity 120ms ease'

		const panelHeader = document.createElement('div')
		panelHeader.style.display = 'flex'
		panelHeader.style.alignItems = 'center'
		panelHeader.style.justifyContent = 'space-between'
		panelHeader.style.gap = '12px'
		panelHeader.style.padding = '12px 16px'
		panelHeader.style.borderBottom = '1px solid var(--color-border)'
		panelHeader.style.background = 'var(--color-main-background)'
		panelHeader.style.flex = '0 0 auto'

		const panelTitle = document.createElement('strong')
		panelTitle.textContent = 'Feedback'
		panelTitle.style.fontSize = '14px'
		panelTitle.style.fontWeight = '700'
		panelTitle.style.color = 'var(--color-main-text)'

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
		collapseButton.addEventListener('click', () => {
			updatePanelState(panel, content, toggleButton, false)
		})

		panelHeader.appendChild(panelTitle)
		panelHeader.appendChild(collapseButton)

		const panelBody = document.createElement('div')
		panelBody.style.flex = '1 1 auto'
		panelBody.style.minHeight = '0'
		panelBody.style.overflow = 'auto'

		const element = document.createElement('feedbackapp-timestamp-comments-tab')
		element.setAttribute('data-feedback-public-title', getPublicVideoTitle())
		element.style.display = 'block'
		element.style.minHeight = '100%'
		panelBody.appendChild(element)
		content.appendChild(panelHeader)
		content.appendChild(panelBody)
		panel.appendChild(content)

		const toggleButton = document.createElement('button')
		toggleButton.type = 'button'
		toggleButton.textContent = 'Feedback Panel'
		toggleButton.title = 'Feedback einklappen'
		toggleButton.setAttribute('aria-label', 'Feedback einklappen')
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
		toggleButton.style.position = 'relative'
		toggleButton.addEventListener('click', () => {
			updatePanelState(panel, content, toggleButton, panel.dataset.open !== 'true')
		})

		const headerAnchor = getPublicHeaderAnchor()
		if (headerAnchor?.parentElement) {
			headerAnchor.parentElement.insertBefore(toggleButton, headerAnchor)
			toggleButton.style.marginRight = '8px'
		} else {
			toggleButton.style.position = 'fixed'
			toggleButton.style.top = '10px'
			toggleButton.style.right = '388px'
			document.body.appendChild(toggleButton)
		}

		host.appendChild(panel)
		updatePanelState(panel, content, toggleButton, true)
		window.clearInterval(timer)
	}, 300)
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mountPublicFeedbackPanel, { once: true })
} else {
	mountPublicFeedbackPanel()
}

window.__feedbackappPublicShareLoaded = true
