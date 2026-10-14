<script lang="ts">
	import Crumbs from '$lib/components/Crumbs.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import RankBadge from '$lib/components/RankBadge.svelte';
	import BranchMark from '$lib/components/BranchMark.svelte';
	import { fmtDate, jobHref, RANK_LABEL } from '$lib/data';
	let { data } = $props();
	const b = $derived(data.branch);
	const c = $derived(data.category);
	const j = $derived(data.job);
	const stats = $derived(
		[
			j.asvab ? { label: 'Aptitude (ASVAB)', value: j.asvab } : null,
			j.education ? { label: 'Education', value: j.education } : null,
			j.components.length ? { label: 'Components', value: j.components.join(' · ') } : null,
			j.bonus ? { label: 'Enlistment bonus', value: j.bonus } : null,
			...j.stats
		].filter((s): s is { label: string; value: string } => !!s && !!s.value)
	);
	const paragraphs = $derived(j.overview.split(/\n\s*\n/).filter(Boolean));
</script>

<svelte:head>
	<title>{j.code ? j.code + ' ' : ''}{j.title} — {b.short} — MOS Explorer</title>
	<meta name="description" content={j.ai?.blurb || j.tagline || j.overview.slice(0, 150)} />
</svelte:head>

<div style="--branch: var(--c-{b.slug})">
	<Crumbs items={[{ href: `/${b.slug}`, label: b.short }, { href: `/${b.slug}/${c.slug}`, label: c.name }, { label: j.code ?? j.title }]} />

	<!-- record header -->
	<header class="panel corner p-5 mb-6 fade-in">
		<div class="flex flex-col sm:flex-row gap-5">
			<div class="shrink-0 flex sm:flex-col items-center gap-3">
				<BranchMark branch={b.slug} />
				<RankBadge rank={j.rank} />
			</div>
			<div class="min-w-0 flex-1">
				<p class="label">{b.name} · {c.name}{j.subcategory ? ` · ${j.subcategory}` : ''}</p>
				<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
					{#if j.code}
						<span class="font-display text-5xl sm:text-6xl leading-none branch-accent">{j.code}</span>
					{/if}
					<h1 class="font-display text-2xl sm:text-3xl leading-tight">{j.title}</h1>
				</div>
				<p class="mt-3 text-sm leading-relaxed" style="color: var(--fg-dim)">
					{j.ai?.blurb || j.tagline}
				</p>
				{#if j.ai?.tags?.length}
					<p class="mt-3 flex flex-wrap gap-1.5">
						{#each j.ai.tags as t}
							<span class="text-[10px] tracking-[0.15em] uppercase border px-1.5" style="border-color: var(--line-strong); color: var(--fg-dim)">{t}</span>
						{/each}
					</p>
				{/if}
			</div>
			<dl class="shrink-0 text-[11px] grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2 sm:text-right">
				<div><dt class="label">{j.codeLabel ?? 'Code'}</dt><dd class="branch-accent font-medium">{j.code ?? 'not published'}</dd></div>
				<div><dt class="label">Track</dt><dd>{RANK_LABEL[j.rank]}</dd></div>
				<div><dt class="label">Field</dt><dd>{c.jobCount} {c.jobCount === 1 ? 'job' : 'jobs'}</dd></div>
				<div><dt class="label">Record</dt><dd>{fmtDate(b.fetchedAt)}</dd></div>
			</dl>
		</div>
	</header>

	<div class="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
		<div class="space-y-6 min-w-0">
			{#if j.ai}
				<Panel title="What it's actually like · written by Claude">
					<p class="leading-relaxed">{j.ai.dayToDay}</p>
					{#if j.ai.goodFitIf?.length}
						<p class="label mt-4 mb-1">Good fit if you…</p>
						<ul class="text-sm grid sm:grid-cols-2 gap-x-6">
							{#each j.ai.goodFitIf as g}<li class="before:content-['▸'] before:mr-2 before:text-[var(--accent)]">{g}</li>{/each}
						</ul>
					{/if}
				</Panel>
			{/if}

			{#if paragraphs.length}
				<Panel title="Official description · {j.source.name}">
					<div class="prose-mos leading-relaxed">
						{#each paragraphs as p}<p>{p}</p>{/each}
					</div>
				</Panel>
			{/if}

			{#if j.duties.length}
				<Panel title="Duties">
					<ul class="space-y-1.5 text-sm">
						{#each j.duties as d}<li class="pl-4 -indent-4 before:content-['▸'] before:mr-2 before:text-[var(--accent)]">{d}</li>{/each}
					</ul>
				</Panel>
			{/if}

			{#if j.requirements.length}
				<Panel title="Requirements">
					<ul class="space-y-1.5 text-sm">
						{#each j.requirements as r}<li class="pl-4 -indent-4 before:content-['□'] before:mr-2 before:text-[var(--amber)]">{r}</li>{/each}
					</ul>
				</Panel>
			{/if}

			{#if j.training.length}
				<Panel title="Training pipeline">
					<ol class="space-y-2 text-sm">
						{#each j.training as t, i}
							<li class="grid grid-cols-[2rem_1fr] gap-2">
								<span class="font-display branch-accent">{String(i + 1).padStart(2, '0')}</span>
								<span>{t}</span>
							</li>
						{/each}
					</ol>
				</Panel>
			{/if}

			{#each Object.entries(j.extra) as [k, v]}
				{#if !/^https?:/.test(v)}
					<Panel title={k}>
						<div class="prose-mos text-sm leading-relaxed">
							{#each v.split(/\n+/) as p}<p>{p}</p>{/each}
						</div>
					</Panel>
				{/if}
			{/each}
		</div>

		<aside class="space-y-6">
			{#if j.ai?.funFact}
				<Panel title="Fun fact · written by Claude">
					<p class="text-sm leading-relaxed">{j.ai.funFact}</p>
				</Panel>
			{/if}

			{#if stats.length}
				<Panel title="Stats">
					<dl class="text-sm space-y-3">
						{#each stats as s}
							<div>
								<dt class="label">{s.label}</dt>
								<dd class="leading-snug">{s.value}</dd>
							</div>
						{/each}
					</dl>
				</Panel>
			{/if}

			{#if j.skills.length}
				<Panel title="Skills you'll pick up">
					<ul class="text-sm space-y-1">
						{#each j.skills as s}<li>· {s}</li>{/each}
					</ul>
				</Panel>
			{/if}

			{#if j.civilianJobs.length}
				<Panel title="Civilian equivalents">
					<ul class="text-sm space-y-1">
						{#each j.civilianJobs as s}<li>· {s}</li>{/each}
					</ul>
				</Panel>
			{/if}

			{#if j.extra.Video}
				<Panel title="Video">
					<a href={j.extra.Video} target="_blank" rel="noopener" class="text-sm underline">Watch on YouTube ↗</a>
				</Panel>
			{/if}

			<Panel title="Source">
				<p class="text-xs leading-relaxed" style="color: var(--fg-dim)">
					Official text from <a href={j.source.url} target="_blank" rel="noopener" class="underline" style="color: var(--fg)">{j.source.name}</a>, pulled {fmtDate(b.fetchedAt)}.
					{#if j.ai}The blurb, "what it's like", tags and fun fact were written by Claude ({j.ai.model}) from that text and may be imperfect.{/if}
					Requirements change; confirm with a recruiter.
				</p>
			</Panel>
		</aside>
	</div>

	<nav class="mt-8 grid grid-cols-2 gap-3 text-xs" aria-label="Previous and next job">
		{#if data.prev}
			<a href={jobHref(data.prev)} class="panel hover-row p-3"><span class="label">◂ Previous</span><br /><span class="branch-accent font-display">{data.prev.code ?? ''}</span> {data.prev.title}</a>
		{:else}<span></span>{/if}
		{#if data.next}
			<a href={jobHref(data.next)} class="panel hover-row p-3 text-right"><span class="label">Next ▸</span><br /><span class="branch-accent font-display">{data.next.code ?? ''}</span> {data.next.title}</a>
		{/if}
	</nav>
</div>
