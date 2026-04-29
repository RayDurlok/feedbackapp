export function getPublicShareToken() {
	const match = window.location.pathname.match(/\/s\/([^/]+)/)
	return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function isPublicShareContext() {
	return getPublicShareToken() !== null && !document.head?.dataset?.user
}

function getActivePublicVideoElement() {
	return document.querySelector('.plyr video, video')
}

export function getPublicShareFilePath() {
	if (!isPublicShareContext()) {
		return null
	}

	const token = getPublicShareToken()
	const video = getActivePublicVideoElement()
	const source = video?.currentSrc || video?.getAttribute('src') || ''
	if (!token || source === '') {
		return null
	}

	try {
		const url = new URL(source, window.location.origin)
		const prefix = `/public.php/dav/files/${encodeURIComponent(token)}/`
		const offset = url.pathname.indexOf(prefix)
		if (offset === -1) {
			return null
		}

		const path = url.pathname.slice(offset + prefix.length)
		return path === '' ? null : decodeURIComponent(path)
	} catch {
		return null
	}
}

function withPublicPath(url) {
	const path = getPublicShareFilePath()
	if (!path) {
		return url
	}

	const separator = url.includes('?') ? '&' : '?'
	return `${url}${separator}path=${encodeURIComponent(path)}`
}

export function getPublicGuestId() {
	if (!isPublicShareContext()) {
		return null
	}

	const storageKey = 'feedbackapp-public-guest-id'
	let guestId = null

	try {
		guestId = window.localStorage.getItem(storageKey)
		if (!guestId) {
			guestId = window.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
			window.localStorage.setItem(storageKey, guestId)
		}
	} catch {
		guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
	}

	return guestId
}

export function getFeedbackHeaders({ json = false } = {}) {
	const headers = {
		Accept: 'application/json',
	}

	if (json) {
		headers['Content-Type'] = 'application/json'
	}

	if (window.OC?.requestToken) {
		headers.requesttoken = window.OC.requestToken
	}

	const guestId = getPublicGuestId()
	if (guestId) {
		headers['X-Feedback-Guest-Id'] = guestId
	}

	return headers
}

export const listUrl = (fileId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? withPublicPath(window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}`))
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${fileId}`)
}

export const createUrl = () => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? withPublicPath(window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}`))
		: window.OC.generateUrl('/apps/feedbackapp/api/comments')
}

export const updateStatusUrl = (commentId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? withPublicPath(window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}/${commentId}/status`))
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${commentId}/status`)
}

export const updateCommentUrl = (commentId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? withPublicPath(window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}/${commentId}`))
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${commentId}`)
}

export const deleteCommentUrl = (commentId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? withPublicPath(window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}/${commentId}`))
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${commentId}`)
}

export const publicConfigUrl = () => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? withPublicPath(window.OC.generateUrl(`/apps/feedbackapp/public/config/${encodeURIComponent(token)}`))
		: null
}

export const publicShareAutoOpenUrl = (fileId) => {
	return window.OC.generateUrl(`/apps/feedbackapp/api/files/${fileId}/public-share-auto-open`)
}

export const publicShareLinkUrl = (fileId) => {
	return window.OC.generateUrl(`/apps/feedbackapp/api/files/${fileId}/public-share-link`)
}
