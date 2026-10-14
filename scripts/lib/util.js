// Shared helpers for the data-fetch scripts: cached HTTP, concurrency, text cleanup.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const DATA_DIR = join(ROOT, 'src', 'lib', 'data');
export const CACHE_DIR = join(ROOT, 'scripts', '.cache');
mkdirSync(CACHE_DIR, { recursive: true });

// Some .mil hosts 403 anything that doesn't look like a real browser.
export const HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9'
};

const NO_CACHE = process.env.NO_CACHE === 'true';

/** Fetch a URL as text, caching the body on disk keyed by URL. */
export async function get(url, { binary = false, retries = 3 } = {}) {
	const key = createHash('md5').update(url).digest('hex');
	const file = join(CACHE_DIR, key + (binary ? '.bin' : '.txt'));
	if (!NO_CACHE && existsSync(file)) return binary ? readFileSync(file) : readFileSync(file, 'utf8');
	let lastErr;
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
			if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
			const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
			writeFileSync(file, body);
			return body;
		} catch (err) {
			lastErr = err;
			await sleep(500 * (attempt + 1));
		}
	}
	throw lastErr;
}

export async function getJson(url) {
	return JSON.parse(await get(url));
}

export function load(html) {
	return cheerio.load(html);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run fn over items with limited concurrency, reporting progress. */
export async function pool(items, fn, { concurrency = 4, label = 'items' } = {}) {
	const results = new Array(items.length);
	let next = 0;
	let done = 0;
	const failures = [];
	async function worker() {
		while (next < items.length) {
			const i = next++;
			try {
				results[i] = await fn(items[i], i);
			} catch (err) {
				failures.push({ item: items[i], err });
				results[i] = null;
			}
			done++;
			process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker));
	process.stdout.write('\n');
	for (const f of failures) console.error(`  ⚠ ${String(f.item).slice(0, 80)}: ${f.err.message}`);
	return results.filter((r) => r != null);
}

export function clean(s) {
	return (s || '')
		.replace(/ /g, ' ')
		.replace(/[ \t\r\f\v]+/g, ' ')
		.replace(/\s*\n\s*/g, '\n')
		.trim();
}

/** One-line whitespace normalisation. */
export function line(s) {
	return (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function slugify(s) {
	return line(s)
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[’']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function titleCase(slug) {
	return slug
		.split('-')
		.map((w) => (w === 'and' ? '&' : w === 'rpa' || w === 'tacp' || w === 'jag' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(' ');
}

/** Text of an HTML fragment, as a list of paragraphs / list items. */
export function htmlToItems(html) {
	if (!html) return [];
	const $ = cheerio.load(`<div id="r">${html}</div>`);
	const out = [];
	$('#r')
		.find('p, li, h3, h4')
		.each((_, el) => {
			if ($(el).find('li').length) return; // container; children will be visited
			const t = line($(el).text());
			if (t) out.push(t);
		});
	if (!out.length) {
		const t = line($('#r').text());
		if (t) out.push(t);
	}
	return dedupe(out);
}

export function htmlToText(html) {
	if (!html) return '';
	const $ = cheerio.load(`<div id="r">${html}</div>`);
	$('#r').find('li').each((_, el) => $(el).prepend('• '));
	$('#r').find('p, li, br, h1, h2, h3, h4, div').each((_, el) => $(el).append('\n'));
	return clean($('#r').text());
}

export function dedupe(arr) {
	const seen = new Set();
	return arr.filter((x) => {
		const k = typeof x === 'string' ? x.toLowerCase() : JSON.stringify(x);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

export function stripBullet(s) {
	return line(s).replace(/^[•·\-–*]\s*/, '');
}

export function writeJson(file, data) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(data, null, '\t') + '\n');
}

export function readJsonIfExists(file) {
	return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** Build a normalised job record with every field present. */
export function job(fields) {
	return {
		id: `${fields.branch}/${fields.slug}`,
		branch: fields.branch,
		slug: fields.slug,
		code: fields.code ?? null,
		codeLabel: fields.codeLabel ?? null,
		title: line(fields.title),
		rank: fields.rank ?? 'enlisted', // enlisted | officer | warrant
		category: fields.category,
		subcategory: fields.subcategory ?? null,
		tagline: line(fields.tagline || ''),
		overview: clean(fields.overview || ''),
		duties: (fields.duties || []).map(line).filter(Boolean),
		requirements: (fields.requirements || []).map(line).filter(Boolean),
		asvab: fields.asvab ? line(fields.asvab) : null,
		education: fields.education ? line(fields.education) : null,
		training: (fields.training || []).map(line).filter(Boolean),
		skills: (fields.skills || []).map(line).filter(Boolean),
		civilianJobs: (fields.civilianJobs || []).map(line).filter(Boolean),
		components: (fields.components || []).map(line).filter(Boolean),
		bonus: fields.bonus ? line(fields.bonus) : null,
		stats: (fields.stats || []).filter((s) => s && s.value),
		extra: fields.extra || {},
		source: fields.source
	};
}
