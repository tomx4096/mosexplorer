// U.S. Coast Guard — gocoastguard.com is backed by a Drupal JSON:API at cms.gocoastguard.com.
import { getJson, job, line, htmlToItems, htmlToText, dedupe, slugify } from '../lib/util.js';

const API = 'https://cms.gocoastguard.com/jsonapi/node/';
const SITE = 'https://www.gocoastguard.com';
const SOURCE = 'gocoastguard.com';

// The six filters gocoastguard.com uses for enlisted ratings, in its own order.
const RATE_CATEGORIES = {
	aviation: 'Aviation',
	business: 'Business',
	stem: 'STEM',
	'law-enforcement': 'Law Enforcement',
	communications: 'Communications',
	'first-response': 'First Response'
};

export async function fetchCoastGuard() {
	const rates = await getJson(`${API}rate?page%5Blimit%5D=50&include=field_paragraph_skills`);
	const officers = await getJson(`${API}officer_career?page%5Blimit%5D=50&include=field_paragraphs`);
	const incById = (res) => Object.fromEntries((res.included || []).map((i) => [i.id, i]));

	const jobs = [];
	const rateInc = incById(rates);
	for (const n of rates.data) {
		const a = n.attributes;
		if (a.status === false) continue;
		const cats = (a.field_rate_cat || []).map(slugify);
		const skills = (n.relationships.field_paragraph_skills?.data || []).map((r) => rateInc[r.id]?.attributes?.field_title).filter(Boolean);
		const training = htmlToItems(a.field_rate_training?.value);
		const overview = htmlToText(a.body?.value);
		const components = ['Active Duty', ...(a.field_rate_is_reserve ? ['Reserve'] : [])];
		jobs.push(
			job({
				branch: 'coast-guard',
				slug: a.path.alias.split('/').pop(),
				code: a.field_rate_abbr,
				codeLabel: 'Rating',
				title: a.title,
				rank: 'enlisted',
				category: cats[0] || 'stem',
				subcategory: null,
				tagline: a.field_subtitle || '',
				overview,
				duties: [],
				requirements: htmlToItems(a.field_rate_are_you?.value).map((s) => `Are you ${s.charAt(0).toLowerCase()}${s.slice(1)}`.replace(/\?$/, '?')),
				education: null,
				training,
				skills,
				civilianJobs: htmlToItems(a.field_rate_careers?.value),
				components,
				stats: [{ label: 'Also tagged', value: (a.field_rate_cat || []).slice(1).join(', ') }],
				extra: a.field_youtube?.video_id ? { Video: `https://youtu.be/${a.field_youtube.video_id}` } : {},
				source: { name: SOURCE, url: SITE + a.path.alias }
			})
		);
	}

	const offInc = incById(officers);
	for (const n of officers.data) {
		const a = n.attributes;
		const paras = (n.relationships.field_paragraphs?.data || []).map((r) => offInc[r.id]).filter(Boolean);
		const sections = paras.map((p) => ({ title: line(p.attributes.field_title || ''), html: p.attributes.field_body?.value || '' }));
		const intro = sections.filter((s) => !s.title).map((s) => htmlToText(s.html)).join('\n\n');
		const training = sections.filter((s) => /training/i.test(s.title)).flatMap((s) => htmlToItems(s.html));
		const how = sections.filter((s) => /how to|become|path/i.test(s.title)).flatMap((s) => htmlToItems(s.html));
		const extra = {};
		for (const s of sections) {
			if (!s.title || /training|how to|become|path/i.test(s.title)) continue;
			extra[s.title] = htmlToText(s.html);
		}
		jobs.push(
			job({
				branch: 'coast-guard',
				slug: a.path.alias.split('/').pop(),
				code: null,
				codeLabel: 'Specialty',
				title: a.title + ' Officer',
				rank: 'officer',
				category: 'officer',
				tagline: a.field_subtitle || '',
				overview: intro,
				duties: [],
				requirements: how,
				training,
				skills: [],
				civilianJobs: [],
				components: ['Active Duty', 'Reserve'],
				stats: [],
				extra,
				source: { name: SOURCE, url: SITE + a.path.alias }
			})
		);
	}

	const categories = Object.entries(RATE_CATEGORIES)
		.filter(([slug]) => jobs.some((j) => j.category === slug))
		.map(([slug, name]) => ({ branch: 'coast-guard', slug, name: `${name} ratings`, description: '' }));
	categories.push({ branch: 'coast-guard', slug: 'officer', name: 'Officer specialties', description: 'The seven career fields Coast Guard officers serve in after commissioning.' });
	return { jobs, categories };
}
