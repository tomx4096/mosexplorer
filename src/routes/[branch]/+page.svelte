<script lang="ts">
	import Crumbs from '$lib/components/Crumbs.svelte';
	import BranchMark from '$lib/components/BranchMark.svelte';
	import { fmtDate, yearsSince } from '$lib/data';
	let { data } = $props();
	const b = $derived(data.branch);
</script>

<svelte:head>
	<title>{b.name} jobs — MOS Explorer</title>
	<meta name="description" content="All {b.jobCount} {b.name} specialties in {b.categoryCount} career fields, from {b.source.name}." />
</svelte:head>

<div style="--branch: var(--c-{b.slug})">
	<Crumbs items={[{ label: b.short }]} />

	<header class="flex flex-col sm:flex-row gap-5 sm:items-start mb-8 pb-8 border-b" style="border-color: var(--line)">
		<BranchMark branch={b.slug} size="lg" />
		<div class="flex-1 min-w-0">
			<p class="label mb-1">{b.department} · est. {fmtDate(b.established)} · {yearsSince(b.established)} years</p>
			<h1 class="font-display text-4xl sm:text-6xl leading-none branch-accent">{b.name}</h1>
			<p class="mt-2 text-sm" style="color: var(--fg-dim)">
				<span class="italic">“{b.motto}”</span> · members are {b.members} · jobs are coded by {b.codeLabel}
				({b.codeMeaning.toLowerCase()})
			</p>
			{#if b.ai?.description}
				<p class="mt-4 max-w-2xl leading-relaxed">{b.ai.description}</p>
			{/if}
		</div>
		<dl class="grid grid-cols-3 sm:grid-cols-1 gap-3 text-right shrink-0">
			<div><dt class="label">Fields</dt><dd class="font-display text-2xl" style="color: var(--amber)">{b.categoryCount}</dd></div>
			<div><dt class="label">Enlisted</dt><dd class="font-display text-2xl" style="color: var(--amber)">{b.enlisted}</dd></div>
			<div><dt class="label">Officer</dt><dd class="font-display text-2xl" style="color: var(--amber)">{b.officer}</dd></div>
		</dl>
	</header>

	<div class="flex items-baseline justify-between mb-3">
		<p class="label-accent">Career fields</p>
		<p class="label">{b.categoryCount} on file · source: <a href={b.source.url} class="underline" target="_blank" rel="noopener">{b.source.name}</a></p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
		{#each data.cats as c}
			<a href="/{b.slug}/{c.slug}" class="panel corner hover-row p-4 flex flex-col">
				<div class="flex items-baseline justify-between gap-2">
					<h2 class="font-medium leading-snug branch-accent">{c.name}</h2>
					<span class="label whitespace-nowrap">{c.jobCount} {c.jobCount === 1 ? 'job' : 'jobs'}</span>
				</div>
				<p class="text-xs mt-2 leading-relaxed flex-1 line-clamp-6" style="color: var(--fg-dim)">
					{c.ai?.description ?? c.description ?? ''}
				</p>
				<p class="text-[11px] mt-3 truncate" style="color: var(--fg-faint)">
					{data.samples[c.slug].join(' · ')}{c.jobCount > 3 ? ' · …' : ''}
				</p>
				<p class="label mt-2">
					{#if c.enlisted}{c.enlisted} enlisted{/if}{#if c.enlisted && c.officer} · {/if}{#if c.officer}{c.officer} officer{/if}
				</p>
			</a>
		{/each}
	</div>
</div>
