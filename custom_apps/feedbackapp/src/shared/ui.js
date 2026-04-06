import { escapeHtml } from './formatters.js'

export function renderIconButton({ title, icon, dataAttributes = '', disabled = false, variant = 'neutral', type = 'button' }) {
	const baseStyle = 'display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:36px;padding:0 10px;border-radius:10px;box-sizing:border-box;'
	const variantStyle = variant === 'danger'
		? 'border:1px solid var(--color-error);color:var(--color-error);background:var(--color-main-background);'
		: variant === 'success'
			? 'border:1px solid var(--color-success);color:var(--color-success);background:var(--color-main-background);'
			: variant === 'primary'
				? 'border:1px solid var(--color-primary-element);color:var(--color-primary-element-text);background:var(--color-primary-element);'
				: 'border:1px solid var(--color-border);color:var(--color-text-maxcontrast);background:var(--color-main-background);'

	return `<button type="${type}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" ${dataAttributes} ${disabled ? 'disabled' : ''} style="${baseStyle}${variantStyle}">${icon}</button>`
}
