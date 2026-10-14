<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { theme, toggleTheme, initTheme } from '$lib/theme.svelte';
	import { branches } from '$lib/data';

	let { totalJobs }: { totalJobs: number } = $props();
	let clock = $state('');
	onMount(() => {
		initTheme();
		const tick = () => {
			const d = new Date();
			clock = d.toISOString().slice(11, 19) + 'Z';
		};
		tick();
		const i = setInterval(tick, 1000);
		return () => clearInterval(i);
	});
</script>

<!-- classification banner: green is the real-world convention for UNCLASSIFIED -->
<div class="text-center text-[10px] tracking-[0.35em] uppercase text-white py-[2px]" style="background: var(--banner)">
	Unclassified
</div>

<header class="sticky top-0 z-40 border-b" style="background: var(--bg); border-color: var(--line)">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-4">
		<a href="/" class="flex items-center gap-3 shrink-0">
			<span class="font-display text-lg leading-none" style="color: var(--accent)">MOS</span>
			<span class="text-[11px] tracking-[0.3em] uppercase">Explorer</span>
		</a>
		<nav class="hidden md:flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase" style="color: var(--fg-dim)">
			{#each branches as b}
				<a
					href="/{b.slug}"
					class="hover:text-[var(--accent)] transition-colors"
					class:text-[var(--accent)]={page.url.pathname.startsWith('/' + b.slug)}>{b.short}</a
				>
			{/each}
		</nav>
		<div class="flex items-center gap-3">
			<a href="/search" class="btn" aria-label="Search">⌕ <span class="hidden sm:inline">Search</span></a>
			<button class="btn" onclick={toggleTheme} aria-label="Toggle day/night">
				{theme.value === 'night' ? '○ Day' : '● Night'}
			</button>
		</div>
	</div>
	<div class="hidden sm:flex max-w-6xl mx-auto px-6 h-5 items-center justify-between text-[9px] tracking-[0.25em] uppercase border-t" style="color: var(--fg-faint); border-color: var(--line)">
		<span>Personnel classification terminal · {branches.length} services · {totalJobs.toLocaleString()} specialties</span>
		<span>{clock || '--:--:--Z'}</span>
	</div>
</header>
