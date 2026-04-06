export function getPublicShareToken() {
	const match = window.location.pathname.match(/\/s\/([^/]+)/)
	return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function isPublicShareContext() {
	return getPublicShareToken() !== null && !document.head?.dataset?.user
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
		? window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}`)
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${fileId}`)
}

export const createUrl = () => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}`)
		: window.OC.generateUrl('/apps/feedbackapp/api/comments')
}

export const updateStatusUrl = (commentId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}/${commentId}/status`)
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${commentId}/status`)
}

export const updateCommentUrl = (commentId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}/${commentId}`)
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${commentId}`)
}

export const deleteCommentUrl = (commentId) => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? window.OC.generateUrl(`/apps/feedbackapp/public/comments/${encodeURIComponent(token)}/${commentId}`)
		: window.OC.generateUrl(`/apps/feedbackapp/api/comments/${commentId}`)
}

export const publicConfigUrl = () => {
	const token = getPublicShareToken()
	return token && isPublicShareContext()
		? window.OC.generateUrl(`/apps/feedbackapp/public/config/${encodeURIComponent(token)}`)
		: null
}

export const publicShareAutoOpenUrl = (fileId) => {
	return window.OC.generateUrl(`/apps/feedbackapp/api/files/${fileId}/public-share-auto-open`)
}
