import { branches, categories, getAllJobs } from '$lib/data';

export async function load() {
	const jobs = await getAllJobs();
	// A rotating handful of jobs for the "random pull" panel.
	const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
	const picks = [...jobs]
		.filter((j) => j.ai)
		.sort((a, b) => (hash(a.id + seed) % 1000) - (hash(b.id + seed) % 1000))
		.slice(0, 5)
		.map(({ branch, category, slug, code, title, rank, tagline, ai }) => ({ branch, category, slug, code, title, rank, tagline, ai }));
	return {
		branches,
		categoryCount: categories.length,
		enlisted: jobs.filter((j) => j.rank === 'enlisted').length,
		officer: jobs.filter((j) => j.rank !== 'enlisted').length,
		picks
	};
}

function hash(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return Math.abs(h);
}
