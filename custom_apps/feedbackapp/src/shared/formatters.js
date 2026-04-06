export function formatTimestamp(totalMilliseconds) {
	const milliseconds = Math.max(0, Math.round(Number(totalMilliseconds) || 0))
	const hours = Math.floor(milliseconds / 3600000)
	const minutes = Math.floor((milliseconds % 3600000) / 60000)
	const seconds = Math.floor((milliseconds % 60000) / 1000)
	const remainingMilliseconds = milliseconds % 1000

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
	}

	return `${minutes}:${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
}

export function formatTimestampWithoutMilliseconds(totalMilliseconds) {
	const milliseconds = Math.max(0, Math.round(Number(totalMilliseconds) || 0))
	const totalSeconds = Math.floor(milliseconds / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
	}

	return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatCreatedAt(unixTimestampSeconds) {
	const timestamp = Number(unixTimestampSeconds) || 0
	if (timestamp <= 0) {
		return ''
	}

	const date = new Date(timestamp * 1000)
	const now = new Date()
	const diffMs = date.getTime() - now.getTime()
	const absDiffMs = Math.abs(diffMs)
	const minuteMs = 60 * 1000
	const hourMs = 60 * minuteMs
	const dayMs = 24 * hourMs

	if (absDiffMs < dayMs) {
		const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
		if (absDiffMs < minuteMs) {
			return relativeFormatter.format(0, 'minute')
		}

		if (absDiffMs < hourMs) {
			const minutes = diffMs < 0
				? Math.min(-1, Math.ceil(diffMs / minuteMs))
				: Math.max(1, Math.floor(diffMs / minuteMs))
			return relativeFormatter.format(minutes, 'minute')
		}

		const hours = diffMs < 0
			? Math.min(-1, Math.ceil(diffMs / hourMs))
			: Math.max(1, Math.floor(diffMs / hourMs))
		return relativeFormatter.format(hours, 'hour')
	}

	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date)
}

export function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}
