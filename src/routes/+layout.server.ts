import { branches } from '$lib/data';

export function load() {
	return { totalJobs: branches.reduce((n, b) => n + b.jobCount, 0) };
}
