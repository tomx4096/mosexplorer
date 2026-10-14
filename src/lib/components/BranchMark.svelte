<script lang="ts">
	import { BRANCH_MARK, type BranchSlug } from '$lib/data';
	let { branch, size = 'md' }: { branch: BranchSlug; size?: 'sm' | 'md' | 'lg' } = $props();
	const sizes = { sm: 'w-10 h-10 text-[11px]', md: 'w-14 h-14 text-sm', lg: 'w-20 h-20 text-lg' };
</script>

<span
	class="font-display inline-flex items-center justify-center border-2 shrink-0 {sizes[size]}"
	style="border-color: var(--c-{branch}); color: var(--c-{branch})"
	aria-hidden="true">{BRANCH_MARK[branch]}</span
>
