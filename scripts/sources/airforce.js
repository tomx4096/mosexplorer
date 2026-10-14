// U.S. Air Force — airforce.com career pages, discovered via the sitemap.
import { get, load, job, line, pool, titleCase, dedupe } from '../lib/util.js';

const SITEMAP = 'https://www.airforce.com/sitemap.xml';
const BASE = 'https://www.airforce.com/careers/';
const SOURCE = 'airforce.com';
const SKIP = /\/careers\/(career-finder|specialty-careers)/;

export async function fetchAirForce() {
	const xml = await get(SITEMAP);
	const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(BASE) && !SKIP.test(u));
	const catUrls = urls.filter((u) => u.slice(BASE.length).split('/').length === 1);
	const jobUrls = urls.filter((u) => u.slice(BASE.length).split('/').length >= 2);

	const categories = await pool(
		catUrls,
		async (url) => {
			const $ = load(await get(url));
			const slug = url.slice(BASE.length);
			return {
				branch: 'air-force',
				slug,
				name: titleCase(slug),
				description: line($('meta[name="description"]').attr('content') || '')
			};
		},
		{ label: 'air force categories' }
	);

	const jobs = await pool(
		jobUrls,
		async (url) => {
			const $ = load(await get(url));
			const parts = url.slice(BASE.length).split('/');
			const category = parts[0];
			const slug = parts[parts.length - 1]; // pilot/bomber-pilot -> bomber-pilot
			const info = {};
			$('.information-nav-wrapper').each((_, el) => {
				const k = line($(el).find('.information-title').text()).replace(/:$/, '').toLowerCase();
				info[k] = line($(el).find('.information-sub-title').text());
			});
			if (!info.afsc && !info.rank) return null; // hub / overview page, not a job
			const title = line($('title').text()).replace(/\s*[-|]\s*U\.?S\.? Air Force.*$/i, '');
			const eyebrow = line($('.hero-content-title').text()).replace(line($('.hero-content-title h1').text()), '');
			const rank = /officer/i.test(info.rank || eyebrow) ? 'officer' : 'enlisted';
			// First content heading after the hero carries the tagline + intro paragraph.
			let tagline = '';
			let overview = '';
			$('.content-heading').each((_, el) => {
				if (tagline) return;
				const h = line($(el).find('h2').first().text());
				if (!h || /ready for you|your future is waiting|requirements|training/i.test(h)) return;
				tagline = h;
				overview = $(el).find('p').map((_, p) => line($(p).text())).get().filter(Boolean).join('\n\n');
			});
			const duties = $('.card-items .link-card-item').map((_, el) => line($(el).text())).get();
			const training = [];
			$('.stage-col').each((_, el) => {
				const name = line($(el).find('.stage-name').text());
				const value = line($(el).text()).replace(name, '').trim();
				if (name && value) training.push(`${titleCase(name.toLowerCase().replace(/\s+/g, '-'))}: ${value}`);
			});
			const groups = {};
			$('.accordion-item').each((_, el) => {
				const t = line($(el).find('.js-item-title').first().text());
				if (!t) return;
				const items = [];
				$(el).find('.accordion-detail').find('p, li').each((_, x) => {
					if ($(x).find('li').length) return;
					const s = line($(x).text());
					if (s) items.push(s);
				});
				if (!items.length) {
					const whole = line($(el).find('.accordion-detail').text());
					if (whole) items.push(whole);
				}
				groups[t.toLowerCase()] = dedupe(items);
			});
			const asvab = (groups['asvab score requirements'] || []).join('; ') || null;
			const education = (groups['minimum education'] || []).filter((s) => !/^\*/.test(s)).join(' ') || null;
			const requirements = dedupe([...(groups['qualifications'] || []), ...(groups['minimum education'] || []).filter((s) => !/^\*/.test(s))]);
			const components = (info.component || '')
				.split(/(?=Air Force|Air National|Space Force)/)
				.map(line)
				.filter(Boolean);
			return job({
				branch: 'air-force',
				slug,
				code: info.afsc || null,
				codeLabel: 'AFSC',
				title,
				rank,
				category,
				subcategory: parts.length > 2 && parts[1] === 'pilot' ? 'Pilot' : null,
				tagline,
				overview: overview || line($('meta[name="description"]').attr('content') || ''),
				duties,
				requirements,
				asvab,
				education,
				training,
				skills: [],
				civilianJobs: [],
				components,
				stats: [],
				extra: eyebrow.includes('Specialty') ? { Track: 'Officer specialty (direct commission)' } : {},
				source: { name: SOURCE, url }
			});
		},
		{ label: 'air force jobs' }
	);
	return { jobs, categories };
}
