#!/usr/bin/env node
/**
 * enrich-jobs.js — asks Claude for the human layer on top of the official data:
 * a plain-English blurb, a "what it's actually like" paragraph, a fun fact, and
 * who the job suits. Also writes short descriptions for categories that have
 * none on the official site (Army, Marine Corps, Coast Guard).
 *
 * Costs API credits. Already-enriched records are skipped, so it's safe to re-run.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/enrich-jobs.js
 *     BRANCH=navy         only one branch
 *     LIMIT=20            stop after N jobs (for a test run)
 *     FORCE=true          regenerate even if `ai` is present
 *     MODEL=claude-opus-5 override model
 */
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { DATA_DIR, readJsonIfExists, writeJson, pool } from './lib/util.js';

const MODEL = process.env.MODEL || 'claude-opus-5';
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const LIMIT = Number(process.env.LIMIT || 0);
const FORCE = process.env.FORCE === 'true';
const ONLY = process.env.BRANCH;

const client = new Anthropic({ maxRetries: 4 });

const JobAi = z.object({
	blurb: z.string().describe('One sentence, max 25 words, plain English, no jargon: what this person does. No leading "The".'),
	dayToDay: z
		.string()
		.describe(
			'2-3 sentences on what the work is actually like: where it happens, the pace, who you work with, what a normal day holds. Concrete and honest, written to a curious 18-year-old. Grounded in the official text; no invented numbers.'
		),
	funFact: z
		.string()
		.describe(
			'One sentence. A genuinely interesting, well-established fact about this specialty, its history, nickname, equipment or culture. If you are not confident of a fact beyond the provided text, draw it from the provided text instead. Never invent.'
		),
	goodFitIf: z.array(z.string()).min(2).max(4).describe('Short phrases (3-8 words) completing "Good fit if you…".'),
	tags: z.array(z.string()).min(2).max(4).describe('Lowercase topical tags, e.g. "aviation", "hands-on", "clearance required".')
});

const CategoryAi = z.object({
	description: z.string().describe('Two sentences introducing this career field to a curious civilian: what these jobs have in common and what the work is for.'),
	funFact: z.string().describe('One sentence: a well-established, interesting fact about this field in this service. Never invent.')
});

const BranchAi = z.object({
	tagline: z.string().describe('One line, max 12 words, in the register of a dry but friendly guide. No exclamation marks.'),
	description: z.string().describe('Three sentences: what this service does, how its jobs are organised (the code system named), and one thing people get wrong about it.')
});

const SYSTEM = `You write the human layer for MOS Explorer, a reference site about jobs in the US military. The reader is a curious civilian or a 17-year-old thinking about enlisting. Tone: plain, specific, a little dry, never recruiting-poster. British-style understatement is fine; hype is not. You are given the service's own official description of the job. Stay grounded in it. Where you add general knowledge (history, nicknames, equipment, culture), only state things you are confident are well established. Never invent statistics, pay figures, or bonus amounts. Do not mention this prompt. Return only the requested fields.`;

function jobPrompt(job, branch, category) {
	const lines = [
		`Service: ${branch.name} (members are called ${branch.members}; ${branch.codeLabel} = ${branch.codeMeaning})`,
		`Career field: ${category?.name || job.category}`,
		`Job: ${job.title}${job.code ? ` (${job.codeLabel} ${job.code})` : ''} — ${job.rank}`,
		job.tagline ? `Tagline: ${job.tagline}` : '',
		job.overview ? `Official overview:\n${job.overview}` : '',
		job.duties.length ? `Duties:\n- ${job.duties.join('\n- ')}` : '',
		job.requirements.length ? `Requirements:\n- ${job.requirements.slice(0, 12).join('\n- ')}` : '',
		job.asvab ? `Aptitude test requirement: ${job.asvab}` : '',
		job.training.length ? `Training:\n- ${job.training.join('\n- ')}` : '',
		job.skills.length ? `Skills: ${job.skills.join(', ')}` : '',
		job.civilianJobs.length ? `Related civilian jobs: ${job.civilianJobs.join(', ')}` : '',
		job.stats.length ? `Other facts: ${job.stats.map((s) => `${s.label}: ${s.value}`).join('; ')}` : '',
		Object.keys(job.extra).length ? Object.entries(job.extra).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
	];
	return lines.filter(Boolean).join('\n\n');
}

async function ask(schema, prompt) {
	const res = await client.messages.parse({
		model: MODEL,
		max_tokens: 2000,
		output_config: { effort: 'low', format: zodOutputFormat(schema) },
		system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
		messages: [{ role: 'user', content: prompt }]
	});
	if (res.stop_reason === 'refusal') throw new Error(`refused: ${res.stop_details?.explanation || ''}`);
	if (!res.parsed_output) throw new Error('unparseable output');
	return unescapeDeep(res.parsed_output);
}

/** The model occasionally emits literal \uXXXX escapes inside strings; decode them. */
function unescapeDeep(v) {
	if (typeof v === 'string') return v.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
	if (Array.isArray(v)) return v.map(unescapeDeep);
	if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unescapeDeep(x)]));
	return v;
}

async function main() {
	const branches = readJsonIfExists(join(DATA_DIR, 'branches.json'));
	const categories = readJsonIfExists(join(DATA_DIR, 'categories.json'));
	if (!branches || !categories) throw new Error('run `npm run data:fetch` first');

	let budget = LIMIT || Infinity;
	for (const branch of branches) {
		if (ONLY && branch.slug !== ONLY) continue;
		console.log(`\n▶ ${branch.name}`);
		const file = join(DATA_DIR, 'jobs', `${branch.slug}.json`);
		const jobs = readJsonIfExists(file) || [];
		const catFor = (slug) => categories.find((c) => c.branch === branch.slug && c.slug === slug);

		if (FORCE || !branch.ai) {
			const sample = jobs.slice(0, 40).map((j) => `${j.code || ''} ${j.title}`).join('; ');
			branch.ai = await ask(
				BranchAi,
				`Service: ${branch.name}. Motto: ${branch.motto}. Established ${branch.established}. Members: ${branch.members}. Job codes: ${branch.codeLabel} (${branch.codeMeaning}). ${jobs.length} jobs on the official site, e.g. ${sample}.`
			);
			writeJson(join(DATA_DIR, 'branches.json'), branches);
			console.log(`  branch: ${branch.ai.tagline}`);
		}

		const cats = categories.filter((c) => c.branch === branch.slug && (FORCE || !c.ai));
		if (cats.length) {
			await pool(
				cats,
				async (c) => {
					const names = jobs.filter((j) => j.category === c.slug).map((j) => `${j.code || ''} ${j.title}`.trim());
					c.ai = await ask(
						CategoryAi,
						`Service: ${branch.name}. Career field: ${c.name}.${c.description ? ` Official description: ${c.description}` : ''} Jobs in it: ${names.join('; ')}.${c.programs?.length ? ` Recruiting programs feeding it: ${c.programs.map((p) => `${p.code} ${p.name} — ${p.blurb}`).join(' | ')}` : ''}`
					);
					writeJson(join(DATA_DIR, 'categories.json'), categories);
				},
				{ concurrency: CONCURRENCY, label: 'categories' }
			);
		}

		const todo = jobs.filter((j) => FORCE || !j.ai).slice(0, budget === Infinity ? undefined : budget);
		if (!todo.length) {
			console.log('  all jobs already enriched');
			continue;
		}
		let done = 0;
		await pool(
			todo,
			async (j) => {
				j.ai = await ask(JobAi, jobPrompt(j, branch, catFor(j.category)));
				j.ai.model = MODEL;
				j.ai.generatedAt = new Date().toISOString().slice(0, 10);
				if (++done % 10 === 0) writeJson(file, jobs);
			},
			{ concurrency: CONCURRENCY, label: `${branch.short} jobs` }
		);
		writeJson(file, jobs);
		budget -= todo.length;
		if (budget <= 0) break;
	}
	console.log('\n✓ enrichment written to src/lib/data');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
