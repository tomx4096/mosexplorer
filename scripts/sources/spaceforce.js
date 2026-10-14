// U.S. Space Force — spaceforce.com is Next.js; each career page embeds its Contentful data.
import { get, load, job, line, pool, dedupe } from '../lib/util.js';

const SITEMAP = 'https://www.spaceforce.com/sitemap-0.xml';
const SOURCE = 'spaceforce.com';

function mdList(md) {
	return (md || '')
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => /^[-*]\s+/.test(l))
		.map((l) => l.replace(/^[-*]\s+/, ''));
}
function mdSections(md) {
	const out = {};
	let cur = '_';
	for (const l of (md || '').split('\n')) {
		const h = l.match(/^#{1,4}\s+(.+)/);
		if (h) {
			cur = h[1].trim().toLowerCase();
			out[cur] = out[cur] || [];
		} else if (l.trim()) (out[cur] = out[cur] || []).push(l.trim());
	}
	return out;
}

export async function fetchSpaceForce() {
	const xml = await get(SITEMAP);
	const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/(enlisted|officer)-careers\/[a-z0-9-]+$/.test(u));

	const jobs = await pool(
		urls,
		async (url) => {
			const $ = load(await get(url));
			const data = JSON.parse($('#__NEXT_DATA__').html()).props.pageProps.data;
			const rank = data.guardianType?.slug === 'officer' ? 'officer' : 'enlisted';
			const q = mdSections(data.qualificationsContent);
			const t = mdSections(data.trainingAndEducationContent);
			const training = [];
			// Training content ends in a two-row markdown table: numbers, then labels.
			const rows = (data.trainingAndEducationContent || '').split('\n').filter((l) => l.startsWith('|') && !/^\|\s*-/.test(l));
			if (rows.length >= 2) {
				const nums = rows[0].split('|').map(line).filter(Boolean);
				const labels = rows[1].split('|').map(line).filter(Boolean);
				nums.forEach((n, i) => labels[i] && training.push(`${n} ${labels[i]}`));
			}
			const status = (t['status upon completion'] || []).join(' ');
			const asvabLine = [...(q['minimum education'] || []), ...(q['qualifications'] || [])].find((s) => /asvab/i.test(s));
			return job({
				branch: 'space-force',
				slug: data.slug,
				code: null,
				codeLabel: 'SFSC',
				title: data.title === data.title.toUpperCase() ? data.title.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : data.title,
				rank,
				category: rank,
				tagline: data.description,
				overview: data.overviewContent,
				duties: mdList(data.dutiesContent),
				requirements: dedupe([...mdList((q['minimum education'] || []).join('\n')), ...mdList((q['qualifications'] || []).join('\n'))]),
				asvab: asvabLine ? asvabLine.replace(/^[-*]\s*/, '') : null,
				education: data.educationLevel || null,
				training: [...training, ...(status ? [`After training: ${status}`] : [])],
				skills: (data.skillsCollection?.items || []).map((s) => s.title),
				civilianJobs: [],
				components: ['Active Duty'],
				stats: [],
				extra: {},
				source: { name: SOURCE, url }
			});
		},
		{ label: 'space force jobs' }
	);
	const categories = [
		{ branch: 'space-force', slug: 'enlisted', name: 'Enlisted Guardians', description: 'Enlisted specialties open to high-school graduates — the operators and analysts who run the Space Force day to day.' },
		{ branch: 'space-force', slug: 'officer', name: 'Officer Careers', description: 'Commissioned roles requiring a bachelor\'s degree: space operations, cyber, intelligence, engineering and acquisition.' }
	];
	return { jobs, categories };
}
