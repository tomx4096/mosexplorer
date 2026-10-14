// U.S. Marine Corps — marines.com has no per-MOS pages, so we parse the official
// MOS Manual (NAVMC 1200.1M) from marines.mil with pdftotext, plus the recruiting
// "program" codes from marines.com/mission/roles for colour.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { get, load, job, line, dedupe, CACHE_DIR, slugify } from '../lib/util.js';

const MANUAL_PAGE = 'https://www.marines.mil/News/Publications/MCPEL/Electronic-Library-Display/Article/4429151/navmc-12001m/';
const ROLES = 'https://www.marines.com/mission/roles.html';
const SOURCE = 'NAVMC 1200.1M (MOS Manual)';

const MOS_TYPES = (process.env.USMC_MOS_TYPES || 'PMOS').split(',');

function titleCaseCaps(s) {
	const small = new Set(['and', 'of', 'the', 'for', 'to', 'a', 'in', 'on']);
	return s
		.toLowerCase()
		.split(/\s+/)
		.map((w, i) => {
			const cap = (x) => (/^(magtf|c2|cbrn|eod|uas|metoc|usmc|ii|iii|it|hf|ci|humint|mq-9|av-8|f-35)$/.test(x) ? x.toUpperCase() : x.charAt(0).toUpperCase() + x.slice(1));
			// Capitalise each part of slashed or parenthesised words: "signals/electronic" -> "Signals/Electronic".
			const inner = w.replace(/[a-z0-9]+/g, (part) => (i > 0 && small.has(part) && !/[(/]/.test(w) ? part : cap(part)));
			return inner;
		})
		.join(' ');
}

/** "Infantry 55-3016." or "(1) Manager, Personnel 166.117-018. (2) ..." -> clean titles. */
function socTitles(soc) {
	if (!soc || /^none/i.test(soc)) return [];
	return dedupe(
		soc
			.split(/\(\d+\)\s*/)
			.map((s) => line(s).replace(/\s*\d{2,3}[-.]\d{3,4}(?:-\d{3})?\.?\s*$/, '').replace(/[.,;]\s*$/, ''))
			.filter((s) => s && s.length > 2)
	);
}

async function manualText() {
	const txt = join(CACHE_DIR, 'navmc-1200.1M.txt');
	if (existsSync(txt)) return readFileSync(txt, 'utf8');
	const page = await get(MANUAL_PAGE);
	const m = page.match(/href="(https:\/\/www\.marines\.mil\/Portals\/1\/Publications\/NAVMC%201200\.1M[^"]*\.pdf[^"]*)"/i);
	if (!m) throw new Error('could not find NAVMC 1200.1M PDF link');
	const pdfUrl = m[1].replace(/&amp;/g, '&');
	const pdf = await get(pdfUrl, { binary: true });
	const pdfFile = join(CACHE_DIR, 'navmc-1200.1M.pdf');
	writeFileSync(pdfFile, pdf);
	execFileSync('pdftotext', ['-layout', pdfFile, txt]);
	return readFileSync(txt, 'utf8');
}

export function parseManual(text) {
	const lines = text.split('\n');
	// Chapter boundaries: 1 officer, 2 warrant, 3 enlisted, 4+ ignored.
	const chapterAt = (i) => {
		for (const [n, re] of [[4, /^\s*CHAPTER 4\b/], [3, /^\s*CHAPTER 3: ENLISTED/], [2, /^\s*CHAPTER 2\b/], [1, /^\s*CHAPTER 1: OFFICER/]]) {
			if (re.test(lines[i])) return n;
		}
		return null;
	};
	const rankOf = { 1: 'officer', 2: 'warrant', 3: 'enlisted' };
	const isNoise = (l) =>
		/^\s*\d-\d+\s+Enclosure \(\d\)\s*$/.test(l) || /^\s*\d{4}\s+NAVMC 1200\.1M\s*$/.test(l) || /^\s*NAVMC 1200\.1M\s*$/.test(l) || /^\s*Enclosure \(\d\)\s*$/.test(l);

	const occflds = {}; // code -> name
	const entries = [];
	let chapter = 0;
	let occ = null;
	let cur = null;
	let pendingTitle = null;

	const flush = () => {
		if (cur) entries.push(cur);
		cur = null;
	};

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const ch = chapterAt(i);
		if (ch) {
			if (ch === 4) {
				flush();
				break;
			}
			if (ch !== chapter) {
				flush();
				chapter = ch;
			}
			continue;
		}
		if (chapter === 0 || isNoise(raw)) continue;
		const l = raw.replace(/\s+$/, '');

		const occM = l.match(/^\s*\d{4}\.\s+OCCUPATIONAL FIELD (\d{2}),\s*(.+)$/);
		if (occM) {
			flush();
			occ = occM[1];
			let name = occM[2].trim();
			// Titles can wrap onto the next line in all caps.
			const nxt = (lines[i + 1] || '').trim();
			if (/^[A-Z][A-Z ,()&/-]+$/.test(nxt) && !/^MOS\b/.test(nxt)) {
				name += ' ' + nxt;
				i++;
			}
			name = name.replace(/\s+/g, ' ').replace(/\/\s+/g, '/').replace(/CYCBERSPACE/i, 'CYBERSPACE').replace(/ROTORY/i, 'ROTARY');
			occflds[occ] = occflds[occ] || titleCaseCaps(name);
			continue;
		}
		if (!occ) continue;

		let headM = l.match(/^\s*\d+\.\s+MOS (\d{4}),\s+(.+)$/);
		let fromPending = false;
		if (headM) pendingTitle = null;
		else if (pendingTitle) {
			headM = [null, pendingTitle.code, pendingTitle.rest + ' ' + l.trim()];
			pendingTitle = null;
			fromPending = true;
		}
		if (headM) {
			const rest = headM[2].trim();
			const rm = rest.match(/^(.*?)\s*\(([A-Za-z0-9]+ to [A-Za-z0-9]+)\)\s*(PMOS|FMOS|NMOS|EMOS|AMOS|BMOS)\b(.*)$/);
			if (!rm) {
				// A header may wrap onto one more line; after that, give up on it.
				if (!fromPending) pendingTitle = { code: headM[1], rest };
				continue;
			}
			flush();
			cur = {
				code: headM[1],
				title: rm[1].replace(/\s+/g, ' ').trim(),
				ranks: rm[2],
				type: rm[3],
				sponsor: rm[4].replace(/^,\s*/, '').trim(),
				occfld: occ,
				chapter,
				rank: rankOf[chapter],
				body: []
			};
			continue;
		}
		if (cur) cur.body.push(l);
	}
	flush();

	for (const e of entries) {
		const text = e.body.join('\n');
		const sec = (letter, nextLetters) => {
			const re = new RegExp(`^\\s*${letter}\\.\\s+([\\s\\S]*?)(?=^\\s*[${nextLetters}]\\.\\s+[A-Z]|\\Z)`, 'm');
			const m = text.match(re);
			return m ? m[1] : '';
		};
		const summary = sec('a', 'b-h').replace(/^Summary\.?\s*/i, '');
		const prereq = sec('b', 'c-h').replace(/^Prerequisites\.?\s*/i, '');
		const reqs = sec('c', 'd-h').replace(/^Requirements\.?\s*/i, '');
		const duties = sec('d', 'e-h').replace(/^Duties\.?\s*/i, '');
		const soc = sec('e', 'f-h').replace(/^Related Standard Occupational Classification \(SOC\) Title and Code\.?\s*/i, '');
		const related = sec('f', 'g-h').replace(/^Related Military Skill\.?\s*/i, '');
		const items = (s) =>
			dedupe(
				s
					.split(/\n\s*(?=\(\d+\)\s)/)
					.map((x) => line(x).replace(/^\(\d+\)\s*/, ''))
					.filter((x) => x && !/^none\.?$/i.test(x))
			);
		e.summary = line(summary);
		e.prerequisites = items(prereq);
		e.requirements = items(reqs);
		e.duties = line(duties);
		e.soc = line(soc);
		e.related = line(related);
		const scoreRe = /\b(GT|CL|MM|EL|GS|VE|AR|AFQT)\b\s*(?:score\s*)?(?:of\s*)?(\d{2,3})/gi;
		const scores = Array.from(prereq.matchAll(scoreRe), (m) => m[1].toUpperCase() + ' ' + m[2]);
		e.asvab = scores.length ? dedupe(scores).join(' or ') : null;
		delete e.body;
	}
	return { entries, occflds };
}

async function fetchPrograms() {
	const $ = load(await get(ROLES));
	const programs = [];
	$('.cmp-accordion__item').each((_, el) => {
		const t = line($(el).find('.cmp-accordion__title').first().text());
		const m = t.match(/^([A-Z]{2}):\s*(.+)$/);
		if (!m) return;
		const occ = [];
		$(el)
			.find('table tr')
			.each((_, tr) => {
				const cells = $(tr).find('td').map((_, td) => line($(td).text())).get();
				if (cells.length >= 2 && /^\d{4}$/.test(cells[0])) occ.push(cells[0].slice(0, 2));
			});
		programs.push({
			code: m[1],
			name: titleCaseCaps(m[2]),
			headline: line($(el).find('.headline').first().text()),
			blurb: line($(el).find('.body-copy p').first().text()),
			occflds: dedupe(occ)
		});
	});
	return programs;
}

export async function fetchMarines() {
	const text = await manualText();
	const { entries, occflds } = parseManual(text);
	let programs = [];
	try {
		programs = await fetchPrograms();
	} catch (e) {
		console.warn('  marines.com programs unavailable:', e.message);
	}
	const keep = entries.filter((e) => MOS_TYPES.includes(e.type) && !/^8\d|^9\d/.test(e.occfld));
	// The manual lists some MOSs twice (summary tables + full entry); keep the fullest one.
	const bySlug = new Map();
	for (const e of keep) {
		const slug = `${e.code}-${slugify(e.title)}`;
		const prev = bySlug.get(slug);
		if (!prev || (e.summary || '').length > (prev.summary || '').length) bySlug.set(slug, e);
	}
	const jobs = [];
	for (const [slug, e] of bySlug) {
		const programsFor = programs.filter((p) => p.occflds.includes(e.occfld));
		jobs.push(
			job({
				branch: 'marines',
				slug,
				code: e.code,
				codeLabel: 'MOS',
				title: e.title,
				rank: e.rank,
				category: `occfld-${e.occfld}`,
				subcategory: null,
				tagline: '',
				overview: e.summary,
				duties: [],
				requirements: dedupe([...e.prerequisites, ...e.requirements]),
				asvab: e.asvab,
				education: null,
				training: e.requirements.filter((r) => /course|school|complete/i.test(r)),
				skills: [],
				civilianJobs: socTitles(e.soc),
				components: ['Active Duty', 'Reserve'],
				stats: [
					{ label: 'Grade range', value: e.ranks },
					{ label: 'MOS type', value: e.type },
					{ label: 'Sponsor', value: e.sponsor },
					{ label: 'Related SOC', value: e.soc && !/^none/i.test(e.soc) ? e.soc : '' },
					{ label: 'Related MOS', value: e.related && !/^none/i.test(e.related) ? e.related : '' },
					{ label: 'Recruiting program', value: programsFor.map((p) => `${p.code} ${p.name}`).join('; ') }
				],
				extra: e.duties && !/refer to/i.test(e.duties) ? { Duties: e.duties } : {},
				source: { name: SOURCE, url: MANUAL_PAGE }
			})
		);
	}
	const categories = Object.entries(occflds)
		.filter(([code]) => jobs.some((j) => j.category === `occfld-${code}`))
		.sort()
		.map(([code, name]) => ({
			branch: 'marines',
			slug: `occfld-${code}`,
			name: `${code} ${name}`,
			description: '',
			programs: programs.filter((p) => p.occflds.includes(code)).map((p) => ({ code: p.code, name: p.name, headline: p.headline, blurb: p.blurb }))
		}));
	return { jobs, categories };
}
