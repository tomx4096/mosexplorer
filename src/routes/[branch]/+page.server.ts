import { error } from '@sveltejs/kit';
import { branches, getBranch, getCategories, getJobs } from '$lib/data';

export function entries() {
	return branches.map((b) => ({ branch: b.slug }));
}

export async function load({ params }) {
	const branch = getBranch(params.branch);
	if (!branch) error(404, 'No such service');
	const cats = getCategories(branch.slug);
	const jobs = await getJobs(branch.slug);
	// a couple of example job titles per category for the cards
	const samples = Object.fromEntries(
		cats.map((c) => [
			c.slug,
			jobs
				.filter((j) => j.category === c.slug)
				.slice(0, 3)
				.map((j) => j.title)
		])
	);
	return { branch, cats, samples };
}
