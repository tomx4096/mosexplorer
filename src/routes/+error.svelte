<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="py-16 text-center">
	<p class="stamp mb-4">No record</p>
	<h1 class="font-display text-5xl" style="color: var(--accent)">{page.status}</h1>
	<p class="mt-2" style="color: var(--fg-dim)">{page.error?.message ?? 'Nothing at this address.'}</p>
	<a href="/" class="btn mt-6">◂ Back to root</a>
</div>
