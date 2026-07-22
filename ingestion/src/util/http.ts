const DEFAULT_TIMEOUT_MS = 20_000;
const USER_AGENT = 'dorfpartys.com-ingestion/1.0 (+https://www.dorfpartys.com; Datenrecherche fuer Dorf-/Vereinsfeste)';

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly url: string
	) {
		super(`HTTP ${status} bei ${url}`);
	}
}

/** fetch() mit Timeout und einem erkennbaren User-Agent - viele Verwaltungsportale blocken anonyme Bots. */
export async function fetchText(url: string, init?: RequestInit): Promise<string> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal,
			headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...init?.headers }
		});
		if (!response.ok) throw new HttpError(response.status, url);
		return await response.text();
	} finally {
		clearTimeout(timeout);
	}
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal,
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...init?.headers }
		});
		if (!response.ok) throw new HttpError(response.status, url);
		return (await response.json()) as T;
	} finally {
		clearTimeout(timeout);
	}
}
