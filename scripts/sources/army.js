// U.S. Army — goarmy.com exposes the JSON its job pages render from.
import { getJson, get, job, line, stripBullet, titleCase, slugify, dedupe } from '../lib/util.js';

const ALL_JOBS = 'https://www.goarmy.com/bin/aemservlet/cmtjobs.en.json';
const APP_STATE =
	'https://www.goarmy.com/etc.clientlibs/goarmy/clientlibs/clientlib-site/resources/js/chunks/allJobsAppState.js';

const SOURCE = 'goarmy.com';

export async function fetchArmy() {
	const raw = await getJson(ALL_JOBS);
	// Category display names live in the site's JS bundle.
	const appState = await get(APP_STATE);
	const catNames = {};
	const m = appState.match(/category:(\{[^}]*\})/);
	if (m) {
		for (const [, k, v] of m[1].matchAll(/"?([a-z-]+)"?:"([^"]+)"/g)) catNames[k] = v;
	}

	const jobs = [];
	for (const r of raw) {
		if (r.Status && !/live/i.test(r.Status)) continue;
		if (!r.moscode || !r.mos_title || !r.category || !r.group) continue;
		const requirements = dedupe([
			...String(r.requirements || '')
				.split(/\n|•/)
				.map(stripBullet)
				.filter(Boolean)
				.filter((s) => !/ASVAB Score/i.test(s) && !/weeks? of/i.test(s)),
			...(r.Requirements2 || []).map(stripBullet)
		]);
		const rank =
			r['Position Type Warrant Officer']?.trim() === 'true' && r.position_type !== 'Enlisted'
				? 'warrant'
				: r.position_type === 'Officer'
					? 'officer'
					: 'enlisted';
		const training = (r.testing_requirements || []).map(line).filter((t) => !/^\d+\s+ASVAB/i.test(t));
		const bonus = r.bonus_status === 'true' && r.bonus_amount ? `Up to $${Number(r.bonus_amount).toLocaleString('en-US')}` : null;
		const path = String(r.path || slugify(r.mos_title)).replace(/\/$/, '');
		const slug = path.toLowerCase();
		jobs.push(
			job({
				branch: 'army',
				slug,
				code: r.moscode.trim().toUpperCase(),
				codeLabel: 'MOS',
				title: r.mos_title,
				rank,
				category: r.category,
				subcategory: titleCase(r.group),
				tagline: r['Basic Job Explanation'] || r.mos_description_short || '',
				overview: r['MOS job overview'] || r.mos_description_short || '',
				duties: [],
				requirements,
				asvab: r.minimum_asvab_line_score || null,
				education: null,
				training,
				skills: dedupe((r.Skills || []).map(line)),
				civilianJobs: (r['Civilian Jobs Sort'] || []).map(stripBullet),
				components: r.component || [],
				bonus,
				stats: [
					{ label: 'Entry level', value: r.entry_level_requirement === 'true' ? 'Yes' : 'No' },
					{ label: 'Hours', value: (r.hours || []).join(' / ') }
				],
				extra: r.additional_details ? { 'Additional details': line(r.additional_details) } : {},
				source: { name: SOURCE, url: (r.english_url || r.url_path_nextgen || '').replace(/\/$/, '') }
			})
		);
	}

	const categories = [];
	for (const slug of [...new Set(jobs.map((j) => j.category))]) {
		categories.push({
			branch: 'army',
			slug,
			name: catNames[slug] || titleCase(slug),
			description: '',
			subcategories: [...new Set(jobs.filter((j) => j.category === slug).map((j) => j.subcategory))].sort()
		});
	}
	return { jobs, categories };
}
