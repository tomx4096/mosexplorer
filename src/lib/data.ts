// Types for the generated data in src/lib/data/*.json plus server-side accessors.
import branchesJson from '$lib/data/branches.json';
import categoriesJson from '$lib/data/categories.json';

export type Rank = 'enlisted' | 'officer' | 'warrant';
export type BranchSlug = 'army' | 'marines' | 'navy' | 'air-force' | 'space-force' | 'coast-guard';

export interface JobAi {
	blurb: string;
	dayToDay: string;
	funFact: string;
	goodFitIf: string[];
	tags: string[];
	model?: string;
	generatedAt?: string;
}

export interface Job {
	id: string;
	branch: BranchSlug;
	slug: string;
	code: string | null;
	codeLabel: string | null;
	title: string;
	rank: Rank;
	category: string;
	subcategory: string | null;
	tagline: string;
	overview: string;
	duties: string[];
	requirements: string[];
	asvab: string | null;
	education: string | null;
	training: string[];
	skills: string[];
	civilianJobs: string[];
	components: string[];
	bonus: string | null;
	stats: { label: string; value: string }[];
	extra: Record<string, string>;
	source: { name: string; url: string };
	ai: JobAi | null;
}

export interface Category {
	branch: BranchSlug;
	slug: string;
	name: string;
	description: string;
	subcategories?: string[];
	programs?: { code: string; name: string; headline: string; blurb: string }[];
	jobCount: number;
	enlisted: number;
	officer: number;
	ai: { description: string; funFact: string } | null;
}

export interface Branch {
	slug: BranchSlug;
	name: string;
	short: string;
	department: string;
	established: string;
	motto: string;
	members: string;
	codeLabel: string;
	codeMeaning: string;
	source: { name: string; url: string };
	jobCount: number;
	enlisted: number;
	officer: number;
	categoryCount: number;
	fetchedAt: string;
	ai: { tagline: string; description: string } | null;
}

/** Lightweight record used by the search page. */
export interface SearchEntry {
	id: string;
	branch: BranchSlug;
	code: string | null;
	title: string;
	rank: Rank;
	category: string;
	categoryName: string;
	blurb: string;
	href: string;
}

export const branches = branchesJson as Branch[];
export const categories = categoriesJson as Category[];

export function getBranch(slug: string): Branch | undefined {
	return branches.find((b) => b.slug === slug);
}

export function getCategories(branch: string): Category[] {
	return categories.filter((c) => c.branch === branch);
}

export function getCategory(branch: string, slug: string): Category | undefined {
	return categories.find((c) => c.branch === branch && c.slug === slug);
}

const jobCache = new Map<string, Job[]>();
export async function getJobs(branch: string): Promise<Job[]> {
	if (!jobCache.has(branch)) {
		const mod = await import(`./data/jobs/${branch}.json`);
		jobCache.set(branch, (mod.default ?? mod) as Job[]);
	}
	return jobCache.get(branch)!;
}

export async function getAllJobs(): Promise<Job[]> {
	const all = await Promise.all(branches.map((b) => getJobs(b.slug)));
	return all.flat();
}

export const RANK_LABEL: Record<Rank, string> = {
	enlisted: 'Enlisted',
	officer: 'Officer',
	warrant: 'Warrant'
};

export const BRANCH_MARK: Record<BranchSlug, string> = {
	army: 'USA',
	marines: 'USMC',
	navy: 'USN',
	'air-force': 'USAF',
	'space-force': 'USSF',
	'coast-guard': 'USCG'
};

export function jobHref(j: Pick<Job, 'branch' | 'category' | 'slug'>): string {
	return `/${j.branch}/${j.category}/${j.slug}`;
}

export function fmtDate(iso: string): string {
	const d = new Date(iso + 'T00:00:00Z');
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function yearsSince(iso: string): number {
	return Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000));
}
