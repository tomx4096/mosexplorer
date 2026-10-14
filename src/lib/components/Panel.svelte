<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, children, class: cls = '' }: { title: string; children: Snippet; class?: string } = $props();
</script>

<section class="panel corner p-4 pt-5 {cls}">
	<span class="panel-title">{title}</span>
	{@render children()}
</section>
