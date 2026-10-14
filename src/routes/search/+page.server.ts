import { categories, getAllJobs, jobHref, type SearchEntry } from '$lib/data';

export async function load() {
	const jobs = await getAllJobs();
	const catName = new Map(categories.map((c) => [c.branch + '/' + c.slug, c.name]));
	const index: SearchEntry[] = jobs.map((j) => ({
		id: j.id,
		branch: j.branch,
		code: j.code,
		title: j.title,
		rank: j.rank,
		category: j.category,
		categoryName: catName.get(j.branch + '/' + j.category) ?? j.category,
		blurb: j.ai?.blurb || j.tagline || '',
		href: jobHref(j)
	}));
	return { index };
}
