export type Theme = 'night' | 'day';
export const theme = $state<{ value: Theme }>({ value: 'night' });

export function initTheme() {
	if (typeof document === 'undefined') return;
	const t = document.documentElement.getAttribute('data-theme');
	theme.value = t === 'day' ? 'day' : 'night';
}

export function toggleTheme() {
	theme.value = theme.value === 'night' ? 'day' : 'night';
	if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme.value);
	try {
		localStorage.setItem('mos-theme', theme.value);
	} catch {
		/* private mode etc. */
	}
}
