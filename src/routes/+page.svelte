<script lang="ts">
	import { onMount } from 'svelte';
	import BranchMark from '$lib/components/BranchMark.svelte';
	import JobRow from '$lib/components/JobRow.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import { fmtDate, yearsSince } from '$lib/data';

	let { data } = $props();
	let visible = $state(false);
	onMount(() => (visible = true));
	const total = $derived(data.branches.reduce((n, b) => n + b.jobCount, 0));
</script>

<svelte:head>
	<title>MOS Explorer — every job in the U.S. military</title>
	<meta name="description" content="Browse every enlisted and officer specialty in the Army, Marine Corps, Navy, Air Force, Space Force and Coast Guard, from the services' own official sources." />
</svelte:head>

<section class="mb-10 pb-8 border-b" style="border-color: var(--line)">
	<p class="label mb-3">▸ System ready · personnel classification terminal · rev 1.0</p>
	<h1 class="font-display text-5xl sm:text-7xl leading-none mb-4" style="color: var(--accent)">
		MOS EXPLORER<span class="cursor"></span>
	</h1>
	<p class="max-w-2xl leading-relaxed" style="color: var(--fg-dim)">
		Every job you can hold in the United States military, pulled from each service's own careers site or
		occupational manual: what the work is, what it takes to qualify, how long the training runs, and a little of
		what it's actually like. Pick a service to start.
	</p>
	<div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px border" style="border-color: var(--line); background: var(--line)">
		{#each [
			['Services', data.branches.length],
			['Career fields', data.categoryCount],
			['Enlisted jobs', data.enlisted],
			['Officer jobs', data.officer]
		] as [label, n]}
			<div class="p-3" style="background: var(--bg-2)">
				<div class="label">{label}</div>
				<div class="font-display text-2xl" style="color: var(--amber)">{n.toLocaleString()}</div>
			</div>
		{/each}
	</div>
</section>

<div class="flex items-baseline justify-between mb-3">
	<p class="label-accent">Select service</p>
	<p class="label">{total.toLocaleString()} specialties on file</p>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
	{#each data.branches as b, i}
		<a
			href="/{b.slug}"
			class="panel corner hover-row p-4 flex gap-4 transition-opacity duration-300"
			style="opacity: {visible ? 1 : 0}; transition-delay: {i * 70}ms; --branch: var(--c-{b.slug})"
		>
			<BranchMark branch={b.slug} />
			<div class="min-w-0 flex-1">
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="font-display text-xl leading-tight branch-accent">{b.name}</h2>
					<span class="label whitespace-nowrap">est. {b.established.slice(0, 4)}</span>
				</div>
				<p class="text-xs mt-1" style="color: var(--fg-dim)">
					{b.ai?.tagline ?? `${b.members}. Motto: ${b.motto}.`}
				</p>
				<dl class="mt-3 grid grid-cols-3 gap-2 text-[11px]">
					<div><dt class="label">Fields</dt><dd>{b.categoryCount}</dd></div>
					<div><dt class="label">Jobs</dt><dd>{b.jobCount}</dd></div>
					<div class="col-span-1"><dt class="label">{b.codeLabel}</dt><dd class="truncate" title={b.codeMeaning}>{b.codeMeaning.split(" (")[0]}</dd></div>
				</dl>
			</div>
		</a>
	{/each}
</div>

{#if data.picks.length}
	<div class="mt-10">
		<Panel title="Random pull · changes daily">
			<div class="-mx-4 -mb-4">
				{#each data.picks as j}
					<JobRow job={j} showBranch />
				{/each}
			</div>
		</Panel>
	</div>
{/if}

<section class="mt-10 grid md:grid-cols-2 gap-6 text-xs leading-relaxed" style="color: var(--fg-dim)">
	<div>
		<p class="label-accent mb-2">What's an MOS?</p>
		<p>
			A Military Occupational Specialty is the Army and Marine Corps term for a job code: 11B is an Army infantryman,
			0311 a Marine rifleman. The Navy and Coast Guard use <em>ratings</em> (an AO is an Aviation Ordnanceman), the Air
			Force and Space Force use <em>specialty codes</em> (2A6X1 is an Aerospace Propulsion specialist). Same idea, six
			dialects.
		</p>
	</div>
	<div>
		<p class="label-accent mb-2">Where this comes from</p>
		<p>
			Each service publishes its own job catalogue: goarmy.com, navy.com, airforce.com, spaceforce.com,
			gocoastguard.com, and for the Marine Corps the MOS Manual (NAVMC 1200.1). That text is reproduced here as
			the official description. The short blurbs, "what it's like" notes and fun facts are written by Claude from
			that material and are labelled as such. Last pulled {fmtDate(data.branches[0].fetchedAt)}.
		</p>
	</div>
</section>
