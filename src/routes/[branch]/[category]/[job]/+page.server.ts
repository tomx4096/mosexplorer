import { error } from '@sveltejs/kit';
import { branches, getBranch, getCategory, getJobs } from '$lib/data';

export async function entries() {
	const out: { branch: string; category: string; job: string }[] = [];
	for (const b of branches) {
		for (const j of await getJobs(b.slug)) out.push({ branch: b.slug, category: j.category, job: j.slug });
	}
	return out;
}

export async function load({ params }) {
	const branch = getBranch(params.branch);
	const category = branch && getCategory(branch.slug, params.category);
	if (!branch || !category) error(404, 'No such career field');
	const jobs = (await getJobs(branch.slug)).filter((j) => j.category === category.slug);
	const idx = jobs.findIndex((j) => j.slug === params.job);
	if (idx < 0) error(404, 'No such job');
	const job = jobs[idx];
	const neighbour = (j: typeof job | undefined) => (j ? { slug: j.slug, code: j.code, title: j.title, branch: j.branch, category: j.category } : null);
	return {
		branch,
		category,
		job,
		prev: neighbour(jobs[idx - 1]),
		next: neighbour(jobs[idx + 1]),
		siblings: jobs.length
	};
}
