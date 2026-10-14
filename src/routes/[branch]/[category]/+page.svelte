<script lang="ts">
	import Crumbs from '$lib/components/Crumbs.svelte';
	import JobRow from '$lib/components/JobRow.svelte';
	import Panel from '$lib/components/Panel.svelte';
	let { data } = $props();
	const b = $derived(data.branch);
	const c = $derived(data.category);
	let rankFilter = $state<'all' | 'enlisted' | 'officer'>('all');
	const filtered = $derived(data.jobs.filter((j) => rankFilter === 'all' || (rankFilter === 'officer' ? j.rank !== 'enlisted' : j.rank === 'enlisted')));
	const groups = $derived.by(() => {
		const m = new Map<string, typeof filtered>();
		for (const j of filtered) {
			const k = j.subcategory ?? '';
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(j);
		}
		return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0]));
	});
</script>

<svelte:head>
	<title>{c.name} — {b.short} jobs — MOS Explorer</title>
	<meta name="description" content="{c.jobCount} {b.name} jobs in {c.name}." />
</svelte:head>

<div style="--branch: var(--c-{b.slug})">
	<Crumbs items={[{ href: `/${b.slug}`, label: b.short }, { label: c.name }]} />

	<header class="mb-6">
		<p class="label mb-1">{b.name} · career field</p>
		<h1 class="font-display text-3xl sm:text-5xl leading-none branch-accent">{c.name}</h1>
		<p class="mt-3 max-w-2xl leading-relaxed">{c.ai?.description ?? c.description}</p>
		{#if c.ai?.funFact}
			<p class="mt-3 text-xs max-w-2xl" style="color: var(--fg-dim)"><span class="label-accent">Note ·</span> {c.ai.funFact}</p>
		{/if}
	</header>

	{#if c.programs?.length}
		<div class="mb-6">
			<Panel title="Recruiting programs that feed this field">
				<ul class="grid sm:grid-cols-2 gap-3 text-xs">
					{#each c.programs as p}
						<li>
							<span class="font-display text-base branch-accent">{p.code}</span>
							<span class="font-medium">{p.name}</span>
							{#if p.headline}<span style="color: var(--fg-dim)"> — {p.headline}</span>{/if}
						</li>
					{/each}
				</ul>
				<p class="label mt-3">From marines.com: recruits pick a program; the specific MOS is assigned later.</p>
			</Panel>
		</div>
	{/if}

	<div class="flex flex-wrap items-center justify-between gap-3 mb-3">
		<p class="label-accent">{filtered.length} of {data.jobs.length} jobs</p>
		<div class="flex gap-1" role="group" aria-label="Filter by rank">
			{#each [['all', 'All'], ['enlisted', 'Enlisted'], ['officer', 'Officer']] as [v, label]}
				<button class="btn" aria-pressed={rankFilter === v} onclick={() => (rankFilter = v as typeof rankFilter)}>{label}</button>
			{/each}
		</div>
	</div>

	<div class="border-t border-x" style="border-color: var(--line)">
		{#each groups as [sub, jobs]}
			{#if sub}
				<div class="label px-3 py-2 border-b" style="background: var(--bg-3); border-color: var(--line)">{sub}</div>
			{/if}
			{#each jobs as j}
				<JobRow job={j} />
			{/each}
		{/each}
		{#if !filtered.length}
			<p class="p-6 text-center text-xs border-b" style="color: var(--fg-dim); border-color: var(--line)">No {rankFilter} jobs in this field.</p>
		{/if}
	</div>
</div>
