<script lang="ts">
	let { items }: { items: { href?: string; label: string }[] } = $props();
</script>

<nav class="text-[10px] tracking-[0.2em] uppercase mb-5 flex flex-wrap gap-x-2 gap-y-1" style="color: var(--fg-dim)" aria-label="Breadcrumb">
	<a href="/" class="hover:text-[var(--accent)]">Root</a>
	{#each items as it}
		<span style="color: var(--fg-faint)">/</span>
		{#if it.href}
			<a href={it.href} class="hover:text-[var(--accent)]">{it.label}</a>
		{:else}
			<span style="color: var(--fg)">{it.label}</span>
		{/if}
	{/each}
</nav>
