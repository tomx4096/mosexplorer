import { error } from '@sveltejs/kit';
import { categories, getBranch, getCategory, getJobs } from '$lib/data';

export function entries() {
	return categories.map((c) => ({ branch: c.branch, category: c.slug }));
}

export async function load({ params }) {
	const branch = getBranch(params.branch);
	const category = branch && getCategory(branch.slug, params.category);
	if (!branch || !category) error(404, 'No such career field');
	const jobs = (await getJobs(branch.slug))
		.filter((j) => j.category === category.slug)
		.map(({ branch, category, slug, code, codeLabel, title, rank, subcategory, tagline, ai }) => ({
			branch,
			category,
			slug,
			code,
			codeLabel,
			title,
			rank,
			subcategory,
			tagline,
			ai: ai ? { blurb: ai.blurb } : null
		}));
	return { branch, category, jobs };
}
