<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import Crumbs from '$lib/components/Crumbs.svelte';
	import RankBadge from '$lib/components/RankBadge.svelte';
	import { branches, BRANCH_MARK } from '$lib/data';

	let { data } = $props();
	let q = $state('');
	let branch = $state('');
	let input: HTMLInputElement;
	onMount(() => {
		q = page.url.searchParams.get('q') ?? '';
		input?.focus();
	});
	$effect(() => {
		if (typeof window === 'undefined') return;
		const u = new URL(window.location.href);
		if (q) u.searchParams.set('q', q);
		else u.searchParams.delete('q');
		replaceState(u, {});
	});
	const terms = $derived(q.toLowerCase().split(/\s+/).filter(Boolean));
	const results = $derived.by(() => {
		if (!terms.length && !branch) return [];
		return data.index
			.filter((e) => !branch || e.branch === branch)
			.map((e) => {
				const hay = `${e.code ?? ''} ${e.title} ${e.categoryName} ${e.blurb}`.toLowerCase();
				let score = 0;
				for (const t of terms) {
					const word = new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
					if (e.code?.toLowerCase() === t) score += 10;
					else if (e.code?.toLowerCase().startsWith(t)) score += 5;
					if (word.test(e.title.toLowerCase())) score += 3;
					if (word.test(hay)) score += 1;
					else if (t.length >= 5 && hay.includes(t)) score += 0.5; // allow in-word match for longer terms
					else return null;
				}
				return { e, score };
			})
			.filter((x): x is { e: (typeof data.index)[number]; score: number } => !!x)
			.sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title))
			.slice(0, 200);
	});
</script>

<svelte:head><title>Search — MOS Explorer</title></svelte:head>

<Crumbs items={[{ label: 'Search' }]} />
<h1 class="font-display text-4xl leading-none mb-4" style="color: var(--accent)">Search<span class="cursor"></span></h1>

<div class="flex flex-col sm:flex-row gap-2 mb-4">
	<input class="terminal" bind:this={input} bind:value={q} placeholder="code or keyword · 11B, corpsman, 2A6X1, drone, diver…" aria-label="Search jobs" />
	<select class="terminal sm:w-52" bind:value={branch} aria-label="Service">
		<option value="">All services</option>
		{#each branches as b}<option value={b.slug}>{b.name}</option>{/each}
	</select>
</div>

<p class="label mb-2">
	{#if terms.length || branch}{results.length}{results.length === 200 ? '+' : ''} results{:else}{data.index.length.toLocaleString()} specialties indexed · type to search{/if}
</p>

<div class="border-t border-x" style="border-color: var(--line)">
	{#each results as { e }}
		<a href={e.href} class="hover-row grid grid-cols-[3rem_6rem_1fr_auto] gap-3 items-center border-b px-3 py-2" style="border-color: var(--line)">
			<span class="font-display text-[11px]" style="color: var(--c-{e.branch})">{BRANCH_MARK[e.branch]}</span>
			<span class="font-display" style="color: var(--c-{e.branch})">{e.code ?? '—'}</span>
			<span class="min-w-0">
				<span class="block truncate font-medium">{e.title}</span>
				<span class="block truncate text-xs" style="color: var(--fg-dim)">{e.categoryName}{e.blurb ? ` · ${e.blurb}` : ''}</span>
			</span>
			<RankBadge rank={e.rank} />
		</a>
	{/each}
</div>
