#!/usr/bin/env node
/**
 * fetch-jobs.js — pulls every job from each service's official site and writes
 * src/lib/data/{branches,categories}.json and src/lib/data/jobs/<branch>.json.
 *
 * Any Claude-generated fields already present in the job files (the `ai` object)
 * are preserved across re-fetches, so this is safe to re-run.
 *
 *   node scripts/fetch-jobs.js            # all branches
 *   BRANCH=navy node scripts/fetch-jobs.js
 *   NO_CACHE=true node scripts/fetch-jobs.js   # ignore scripts/.cache
 */
import { join } from 'node:path';
import { DATA_DIR, writeJson, readJsonIfExists } from './lib/util.js';
import { fetchArmy } from './sources/army.js';
import { fetchMarines } from './sources/marines.js';
import { fetchNavy } from './sources/navy.js';
import { fetchAirForce } from './sources/airforce.js';
import { fetchSpaceForce } from './sources/spaceforce.js';
import { fetchCoastGuard } from './sources/coastguard.js';

export const BRANCHES = [
	{
		slug: 'army',
		name: 'U.S. Army',
		short: 'Army',
		department: 'Department of the Army',
		established: '1775-06-14',
		motto: "This We'll Defend",
		members: 'Soldiers',
		codeLabel: 'MOS',
		codeMeaning: 'Military Occupational Specialty',
		source: { name: 'goarmy.com', url: 'https://www.goarmy.com/careers-and-jobs' },
		fetch: fetchArmy
	},
	{
		slug: 'marines',
		name: 'U.S. Marine Corps',
		short: 'Marines',
		department: 'Department of the Navy',
		established: '1775-11-10',
		motto: 'Semper Fidelis',
		members: 'Marines',
		codeLabel: 'MOS',
		codeMeaning: 'Military Occupational Specialty',
		source: { name: 'NAVMC 1200.1M, the Marine Corps MOS Manual', url: 'https://www.marines.mil/News/Publications/MCPEL/Electronic-Library-Display/Article/4429151/navmc-12001m/' },
		fetch: fetchMarines
	},
	{
		slug: 'navy',
		name: 'U.S. Navy',
		short: 'Navy',
		department: 'Department of the Navy',
		established: '1775-10-13',
		motto: 'Semper Fortis',
		members: 'Sailors',
		codeLabel: 'Rating',
		codeMeaning: 'Enlisted rating (officers carry a designator instead)',
		source: { name: 'navy.com', url: 'https://www.navy.com/careers-benefits/careers' },
		fetch: fetchNavy
	},
	{
		slug: 'air-force',
		name: 'U.S. Air Force',
		short: 'Air Force',
		department: 'Department of the Air Force',
		established: '1947-09-18',
		motto: 'Aim High … Fly-Fight-Win',
		members: 'Airmen',
		codeLabel: 'AFSC',
		codeMeaning: 'Air Force Specialty Code',
		source: { name: 'airforce.com', url: 'https://www.airforce.com/careers' },
		fetch: fetchAirForce
	},
	{
		slug: 'space-force',
		name: 'U.S. Space Force',
		short: 'Space Force',
		department: 'Department of the Air Force',
		established: '2019-12-20',
		motto: 'Semper Supra',
		members: 'Guardians',
		codeLabel: 'SFSC',
		codeMeaning: 'Space Force Specialty Code',
		source: { name: 'spaceforce.com', url: 'https://www.spaceforce.com/careers' },
		fetch: fetchSpaceForce
	},
	{
		slug: 'coast-guard',
		name: 'U.S. Coast Guard',
		short: 'Coast Guard',
		department: 'Department of Homeland Security',
		established: '1790-08-04',
		motto: 'Semper Paratus',
		members: 'Coast Guardsmen',
		codeLabel: 'Rating',
		codeMeaning: 'Enlisted rating',
		source: { name: 'gocoastguard.com', url: 'https://www.gocoastguard.com/careers' },
		fetch: fetchCoastGuard
	}
];

async function main() {
	const only = process.env.BRANCH;
	const branchesOut = readJsonIfExists(join(DATA_DIR, 'branches.json')) || [];
	const categoriesOut = readJsonIfExists(join(DATA_DIR, 'categories.json')) || [];

	for (const b of BRANCHES) {
		if (only && b.slug !== only) continue;
		console.log(`\n▶ ${b.name}`);
		const t0 = Date.now();
		const { jobs, categories } = await b.fetch();
		const file = join(DATA_DIR, 'jobs', `${b.slug}.json`);
		const prev = readJsonIfExists(file) || [];
		const prevById = new Map(prev.map((j) => [j.id, j]));
		const merged = jobs
			.map((j) => ({ ...j, ai: prevById.get(j.id)?.ai ?? null }))
			.sort((a, c) => (a.category + (a.code || a.title)).localeCompare(c.category + (c.code || c.title)));
		writeJson(file, merged);

		const prevCats = new Map(categoriesOut.filter((c) => c.branch === b.slug).map((c) => [c.slug, c]));
		const cats = categories
			.map((c) => ({
				...c,
				jobCount: merged.filter((j) => j.category === c.slug).length,
				enlisted: merged.filter((j) => j.category === c.slug && j.rank === 'enlisted').length,
				officer: merged.filter((j) => j.category === c.slug && j.rank !== 'enlisted').length,
				ai: prevCats.get(c.slug)?.ai ?? null
			}))
			.filter((c) => c.jobCount > 0);
		const rest = categoriesOut.filter((c) => c.branch !== b.slug);
		categoriesOut.length = 0;
		categoriesOut.push(...rest, ...cats);

		const { fetch: _f, ...meta } = b;
		const prevBranch = branchesOut.find((x) => x.slug === b.slug);
		const entry = {
			...meta,
			jobCount: merged.length,
			enlisted: merged.filter((j) => j.rank === 'enlisted').length,
			officer: merged.filter((j) => j.rank !== 'enlisted').length,
			categoryCount: cats.length,
			fetchedAt: new Date().toISOString().slice(0, 10),
			ai: prevBranch?.ai ?? null
		};
		const idx = branchesOut.findIndex((x) => x.slug === b.slug);
		if (idx >= 0) branchesOut[idx] = entry;
		else branchesOut.push(entry);
		console.log(`  ${merged.length} jobs in ${cats.length} categories (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
	}
	const order = BRANCHES.map((b) => b.slug);
	branchesOut.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
	categoriesOut.sort((a, b) => order.indexOf(a.branch) - order.indexOf(b.branch) || a.slug.localeCompare(b.slug));
	writeJson(join(DATA_DIR, 'branches.json'), branchesOut);
	writeJson(join(DATA_DIR, 'categories.json'), categoriesOut);
	console.log('\n✓ wrote src/lib/data');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
