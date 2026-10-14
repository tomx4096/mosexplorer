<script lang="ts">
	import RankBadge from './RankBadge.svelte';
	import { jobHref, type Job } from '$lib/data';
	type RowJob = Pick<Job, 'branch' | 'category' | 'slug' | 'code' | 'title' | 'rank' | 'tagline'> & { ai: { blurb: string } | null };
	let { job, showBranch = false }: { job: RowJob; showBranch?: boolean } = $props();
</script>

<a href={jobHref(job)} class="hover-row grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[6rem_1fr_auto] gap-3 items-center border-b px-3 py-2.5" style="border-color: var(--line)">
	<span class="font-display text-base leading-none" style="color: var(--c-{job.branch})">{job.code ?? '—'}</span>
	<span class="min-w-0">
		<span class="block truncate font-medium">{job.title}</span>
		{#if job.ai?.blurb || job.tagline}
			<span class="block truncate text-xs" style="color: var(--fg-dim)">{job.ai?.blurb || job.tagline}</span>
		{/if}
	</span>
	<span class="flex items-center gap-2">
		{#if showBranch}<span class="label hidden sm:inline">{job.branch.replace('-', ' ')}</span>{/if}
		<RankBadge rank={job.rank} />
	</span>
</a>
