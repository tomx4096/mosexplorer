<script lang="ts">
	import '../app.css';
	import Topbar from '$lib/components/Topbar.svelte';
	let { children, data } = $props();
</script>

<div class="min-h-screen flex flex-col">
	<Topbar totalJobs={data.totalJobs} />
	<main class="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
		{@render children()}
	</main>
	<footer class="border-t mt-12" style="border-color: var(--line)">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-[10px] tracking-[0.15em] uppercase flex flex-wrap gap-x-6 gap-y-2" style="color: var(--fg-faint)">
			<span>MOS Explorer</span>
			<span>Job data from each service's official site or manual</span>
			<span>Blurbs and fun facts written by Claude; check anything that matters with a recruiter</span>
			<span>Not affiliated with the Department of Defense</span>
		</div>
	</footer>
</div>
