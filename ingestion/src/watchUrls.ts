import './env.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from './run.js';
import type { UrlWatchSourceConfig } from './types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function parseArgs(argv: string[]) {
	const args = { out: undefined as string | undefined, dryRun: false, urlsFile: undefined as string | undefined };
	for (const arg of argv) {
		if (arg === '--dry-run') args.dryRun = true;
		else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
		else if (arg.startsWith('--urls-file=')) args.urlsFile = arg.slice('--urls-file='.length);
	}
	return args;
}

function buildLlmConfig(): UrlWatchSourceConfig['llm'] {
	const baseUrl = process.env.OPENWEBUI_BASE_URL;
	const apiKey = process.env.OPENWEBUI_API_KEY;
	const model = process.env.OPENWEBUI_MODEL;
	if (!baseUrl || !apiKey || !model) return undefined;
	return { baseUrl, apiKey, model };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const csvPath = args.out ? resolve(process.cwd(), args.out) : resolve(__dirname, '../../data.csv');
	const urlsFile = args.urlsFile ? resolve(process.cwd(), args.urlsFile) : resolve(__dirname, '../urls.txt');

	const llm = buildLlmConfig();
	console.log(`URL-Watchlist startet${args.dryRun ? ' (Trockenlauf, es wird nichts geschrieben)' : ''}...`);
	console.log(`Quelle: ${urlsFile}`);
	console.log(`LLM-Fallback (OpenWebUI): ${llm ? `aktiv (${llm.model} @ ${llm.baseUrl})` : 'nicht konfiguriert - nur JSON-LD-Erkennung, siehe .env.example'}`);
	console.log(`Ziel-CSV: ${csvPath}\n`);

	const urlWatchSource: UrlWatchSourceConfig = {
		connector: 'url-watch',
		id: 'url-watch',
		label: 'URL-Watchlist (urls.txt)',
		urlsFile,
		llm
	};

	const summary = await runPipeline({ csvPath, dryRun: args.dryRun, sources: [urlWatchSource] });

	const result = summary.perSource[0];
	if (result?.error) {
		console.log(`\nFEHLER: ${result.error}`);
	} else if (result) {
		const { stats } = result;
		console.log(
			`\n${result.fetched} Roh-Treffer, ${stats.kept} relevant ` +
				`(verworfen: ${stats.droppedNoTitleOrLink} ohne Titel/Link, ${stats.droppedNoDate} ohne Datum, ` +
				`${stats.droppedNotRelevant} nicht relevant, ${stats.droppedNoKreis} ohne zuordenbaren Kreis)`
		);
	}
	console.log(`${summary.totalNew} neue Zeile(n)${args.dryRun ? ' würden' : ''} an ${csvPath} angehängt${args.dryRun ? '' : '.'}`);

	if (args.dryRun) {
		for (const event of summary.written) {
			console.log(`  [DRY-RUN] ${event.datum.toISOString().slice(0, 10)} | ${event.bundesland} | ${event.kreis} | ${event.partyart} | ${event.titel}`);
		}
	}
}

main().catch((error) => {
	console.error('URL-Watchlist abgebrochen:', error);
	process.exitCode = 1;
});
