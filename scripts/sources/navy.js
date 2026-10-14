// U.S. Navy — navy.com Drupal career pages, discovered via the sitemap.
import { get, load, job, line, pool, titleCase, dedupe } from '../lib/util.js';

const SITEMAP = 'https://www.navy.com/sitemap.xml';
const BASE = 'https://www.navy.com/careers-benefits/careers/';
const SOURCE = 'navy.com';

// navy.com doesn't print the rating abbreviation on every page; these are the
// standard Navy enlisted rating abbreviations for the pages that omit it.
const RATING_FALLBACK = {
	'mass-communication-specialist': 'MC',
	'navy-musician': 'MU',
	'air-traffic-controller': 'AC',
	'retail-services-specialist': 'RS',
	builder: 'BU',
	'construction-mechanic': 'CM',
	'engineering-aide': 'EA',
	'equipment-operator': 'EO',
	steelworker: 'SW',
	utilitiesman: 'UT',
	'missile-technician': 'MT',
	'damage-controlman': 'DC',
	'master-at-arms': 'MA',
	'cryptologic-technician-collection': 'CTR',
	'cryptologic-technician-maintenance': 'CTM',
	'cryptologic-technician-technical': 'CTT',
	'cyber-warfare-technician': 'CWT',
	'aerographers-mate': 'AG',
	'electricians-mate-nuclear': 'EMN',
	'electronics-technician-nuclear': 'ETN',
	'machinists-mate-nuclear': 'MMN',
	'torpedomans-mate': 'TM',
	'explosive-ordnance-disposal-technician': 'EOD',
	'navy-diver': 'ND',
	'navy-seal': 'SO'
};

export async function fetchNavy() {
	const xml = await get(SITEMAP);
	const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(BASE));
	const catUrls = urls.filter((u) => u.slice(BASE.length).split('/').length === 1);
	const jobUrls = urls.filter((u) => u.slice(BASE.length).split('/').length === 2);

	const categories = await pool(
		catUrls,
		async (url) => {
			const $ = load(await get(url));
			const slug = url.slice(BASE.length);
			return {
				branch: 'navy',
				slug,
				name: line($('h1').first().text()).replace(/\s*Careers$/i, '') || titleCase(slug),
				description: line($('meta[name="description"]').attr('content') || '')
			};
		},
		{ label: 'navy categories' }
	);

	const jobs = await pool(
		jobUrls,
		async (url) => {
			const $ = load(await get(url));
			const [category, slug] = url.slice(BASE.length).split('/');
			const node = $('.node--type-career.node--view-mode-full').first();
			if (!node.length) throw new Error('no career node');
			const title = line(node.find('h1').first().text());
			const about = line(node.find('.field--name-field-about').text());
			const sections = {};
			node.find('.field--name-field-sub-comp-accordion-title').each((i, el) => {
				const key = line($(el).text()).toLowerCase();
				const content = $(el).closest('.field--name-field-sub-comp-accordion-title').nextAll('.field--name-field-sub-comp-accordion-content').first();
				const block = content.length ? content : $(el).parent().find('.field--name-field-sub-comp-accordion-content').eq(i);
				sections[key] = block;
			});
			// Fallback pairing by index when the DOM nests differently.
			const titles = node.find('.field--name-field-sub-comp-accordion-title').map((_, el) => line($(el).text()).toLowerCase()).get();
			const contents = node.find('.field--name-field-sub-comp-accordion-content');
			titles.forEach((t, i) => {
				if (!sections[t] || !sections[t].length) sections[t] = contents.eq(i);
			});
			const items = (key) => {
				const b = sections[key];
				if (!b || !b.length) return [];
				const out = [];
				b.find('p, li').each((_, el) => {
					if ($(el).find('li').length) return;
					const t = line($(el).text());
					if (t) out.push(t);
				});
				return dedupe(out);
			};
			const resp = items('responsibilities');
			const duties = sections['responsibilities'] ? sections['responsibilities'].find('li').map((_, el) => line($(el).text())).get() : [];
			const overviewParas = resp.filter((t) => !duties.includes(t));
			const toggles = line(node.find('.field--name-field-comp-toggle-list-options').text());
			const rank = /officer/i.test(toggles) && !/enlisted/i.test(toggles) ? 'officer' : 'enlisted';
			let code = null;
			if (rank === 'enlisted') {
				const codeMatch = (overviewParas.join(' ') + ' ' + about).match(/\(([A-Z]{2,4})s?\)/);
				code = codeMatch ? codeMatch[1] : RATING_FALLBACK[slug] || null;
			}
			const qual = items('qualifications & requirements');
			const education = qual.find((q) => /diploma|degree|bachelor/i.test(q)) || null;
			return job({
				branch: 'navy',
				slug,
				code,
				codeLabel: rank === 'enlisted' ? 'Rating' : 'Designator',
				title,
				rank,
				category,
				tagline: line($('meta[name="description"]').attr('content') || ''),
				overview: [about, ...overviewParas].filter(Boolean).join('\n\n'),
				duties,
				requirements: qual,
				education,
				training: items('training & advancement'),
				skills: [],
				civilianJobs: [],
				components: rank === 'enlisted' || rank === 'officer' ? ['Active Duty', ...(items('part-time opportunities').length ? ['Navy Reserve'] : [])] : [],
				stats: [],
				extra: {
					...(items('work environment').length ? { 'Work environment': items('work environment').join(' ') } : {}),
					...(items('education opportunities').length ? { 'Education opportunities': items('education opportunities').join(' ') } : {}),
					...(items('part-time opportunities').length ? { 'Part-time (Reserve)': items('part-time opportunities').join(' ') } : {})
				},
				source: { name: SOURCE, url }
			});
		},
		{ label: 'navy jobs' }
	);
	return { jobs, categories };
}
