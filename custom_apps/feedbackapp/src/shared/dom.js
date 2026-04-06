export function isElementVisible(element) {
	return Boolean(element) && element.getClientRects().length > 0
}

function getElementArea(element) {
	if (!isElementVisible(element)) {
		return 0
	}

	const rect = element.getBoundingClientRect()
	return Math.max(0, rect.width) * Math.max(0, rect.height)
}

function getVisibleElements(selector) {
	return Array.from(document.querySelectorAll(selector)).filter((element) => {
		return isElementVisible(element)
	})
}

function getActivePlayerRoot() {
	const playerRoots = getVisibleElements('.plyr').filter((root) => {
		return root.querySelector('video') && root.querySelector('input[data-plyr="seek"]')
	})

	if (playerRoots.length === 0) {
		return null
	}

	return playerRoots.sort((left, right) => {
		const leftVideo = left.querySelector('video')
		const rightVideo = right.querySelector('video')
		const leftSeek = left.querySelector('input[data-plyr="seek"]')
		const rightSeek = right.querySelector('input[data-plyr="seek"]')

		const leftScore = (
			((Number(leftSeek?.getAttribute('aria-valuenow')) || 0) > 0 ? 400 : 0) +
			((Number(leftVideo?.currentTime) || 0) > 0 ? 300 : 0) +
			(leftVideo && !leftVideo.paused ? 200 : 0) +
			Math.min(100, Math.round(getElementArea(left) / 10000))
		)
		const rightScore = (
			((Number(rightSeek?.getAttribute('aria-valuenow')) || 0) > 0 ? 400 : 0) +
			((Number(rightVideo?.currentTime) || 0) > 0 ? 300 : 0) +
			(rightVideo && !rightVideo.paused ? 200 : 0) +
			Math.min(100, Math.round(getElementArea(right) / 10000))
		)

		return rightScore - leftScore
	})[0]
}

export function getActiveVideoElement() {
	const playerRoot = getActivePlayerRoot()
	if (playerRoot) {
		return playerRoot.querySelector('video')
	}

	return getVisibleElements('video').sort((left, right) => {
		const leftScore = (
			((Number(left.currentTime) || 0) > 0 ? 300 : 0) +
			(!left.paused ? 200 : 0) +
			Math.min(100, Math.round(getElementArea(left) / 10000))
		)
		const rightScore = (
			((Number(right.currentTime) || 0) > 0 ? 300 : 0) +
			(!right.paused ? 200 : 0) +
			Math.min(100, Math.round(getElementArea(right) / 10000))
		)

		return rightScore - leftScore
	})[0] ?? null
}

export function getActiveSeekInput() {
	const playerRoot = getActivePlayerRoot()
	if (playerRoot) {
		return playerRoot.querySelector('input[data-plyr="seek"]')
	}

	return getVisibleElements('input[data-plyr="seek"]').sort((left, right) => {
		const leftScore = (
			((Number(left.getAttribute('aria-valuenow')) || 0) > 0 ? 300 : 0) +
			Math.min(100, Math.round(getElementArea(left) / 1000))
		)
		const rightScore = (
			((Number(right.getAttribute('aria-valuenow')) || 0) > 0 ? 300 : 0) +
			Math.min(100, Math.round(getElementArea(right) / 1000))
		)

		return rightScore - leftScore
	})[0] ?? null
}

function parseClockTextToSeconds(value) {
	if (typeof value !== 'string' || value.trim() === '') {
		return null
	}

	const parts = value.trim().split(':').map((part) => Number.parseFloat(part))
	if (parts.some((part) => !Number.isFinite(part) || part < 0)) {
		return null
	}

	if (parts.length === 3) {
		return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
	}

	if (parts.length === 2) {
		return (parts[0] * 60) + parts[1]
	}

	if (parts.length === 1) {
		return parts[0]
	}

	return null
}

function parseDurationSecondsFromAriaValueText(value) {
	if (typeof value !== 'string' || value.trim() === '') {
		return null
	}

	const [, durationText = ''] = value.split(' of ')
	return parseClockTextToSeconds(durationText.trim())
}

export function getActivePlaybackDurationSeconds() {
	const seekInput = getActiveSeekInput()
	const video = getActiveVideoElement()

	const candidates = [
		parseDurationSecondsFromAriaValueText(seekInput?.getAttribute('aria-valuetext') ?? ''),
		Number.parseFloat(seekInput?.getAttribute('aria-valuemax') ?? ''),
		Math.max(0, Number(video?.duration) || 0),
	].filter((candidate) => Number.isFinite(candidate) && candidate > 0)

	if (candidates.length === 0) {
		return null
	}

	return Math.max(...candidates)
}

export function getActivePlaybackSeconds() {
	const seekInput = getActiveSeekInput()
	const video = getActiveVideoElement()
	const durationSeconds = getActivePlaybackDurationSeconds() ?? 0

	const ariaValueNow = Number.parseFloat(seekInput?.getAttribute('aria-valuenow') ?? '')
	const ariaValueText = seekInput?.getAttribute('aria-valuetext')?.split(' of ')[0]?.trim() ?? ''
	const ariaValueTextSeconds = parseClockTextToSeconds(ariaValueText)
	const rangeValue = Number.parseFloat(seekInput?.value ?? '')
	const rangeMax = Number.parseFloat(seekInput?.max ?? '')
	const videoCurrentTime = Number(video?.currentTime)

	const rangeDerivedSeconds = durationSeconds > 0 && Number.isFinite(rangeValue) && Number.isFinite(rangeMax) && rangeMax > 0
		? (rangeValue / rangeMax) * durationSeconds
		: null
	const durationCap = durationSeconds > 0 ? durationSeconds + 0.5 : Number.POSITIVE_INFINITY
	const isValid = (candidate) => Number.isFinite(candidate) && candidate >= 0 && candidate <= durationCap

	if (isValid(videoCurrentTime)) {
		return videoCurrentTime
	}

	if (isValid(rangeDerivedSeconds)) {
		return rangeDerivedSeconds
	}

	if (isValid(ariaValueTextSeconds)) {
		return ariaValueTextSeconds
	}

	if (isValid(ariaValueNow)) {
		return ariaValueNow
	}

	return null
}

export function seekActiveVideo(timestampMilliseconds) {
	const video = getActiveVideoElement()
	if (!video) {
		return false
	}

	video.currentTime = Math.max(0, Number(timestampMilliseconds) || 0) / 1000
	return true
}

export function getCurrentUserUid() {
	return document.head?.dataset?.user ?? null
}

export function isVideoNode(node) {
	if (!node) {
		return false
	}

	const mime = node.mime ?? node.mimetype ?? node.attributes?.mime ?? node.attributes?.mimetype ?? ''
	return typeof mime === 'string' && mime.startsWith('video/')
}
