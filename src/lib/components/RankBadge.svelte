<script lang="ts">
	import { RANK_LABEL, type Rank } from '$lib/data';
	let { rank }: { rank: Rank } = $props();
	const style: Record<Rank, string> = {
		enlisted: 'border-color: var(--accent); color: var(--accent)',
		officer: 'border-color: var(--amber); color: var(--amber)',
		warrant: 'border-color: var(--fg-dim); color: var(--fg-dim)'
	};
</script>

<span class="inline-block border px-1.5 py-[1px] text-[9px] tracking-[0.2em] uppercase leading-tight" style={style[rank]}>
	{RANK_LABEL[rank]}
</span>
