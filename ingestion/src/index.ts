import './env.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from './run.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function parseArgs(argv: string[]) {
	const args = { out: undefined as string | undefined, dryRun: false, source: undefined as string | undefined };
	for (const arg of argv) {
		if (arg === '--dry-run') args.dryRun = true;
		else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
		else if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length);
	}
	return args;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	// Default: data.csv im Repo-Root (../data.csv relativ zu ingestion/), gleiche Datei,
	// die auch die manuelle Recherche bislang befüllt hat.
	const csvPath = args.out ? resolve(process.cwd(), args.out) : resolve(__dirname, '../../data.csv');

	console.log(`Ingestion-Pipeline startet${args.dryRun ? ' (Trockenlauf, es wird nichts geschrieben)' : ''}...`);
	console.log(`Ziel-CSV: ${csvPath}`);

	const summary = await runPipeline({ csvPath, dryRun: args.dryRun, onlySourceId: args.source });

	console.log('\nPro Quelle:');
	for (const result of summary.perSource) {
		if (result.error) {
			console.log(`  - ${result.source.label} [${result.source.id}]: FEHLER - ${result.error}`);
			continue;
		}
		const { stats } = result;
		console.log(
			`  - ${result.source.label} [${result.source.id}]: ${result.fetched} abgerufen, ${stats.kept} relevant ` +
				`(verworfen: ${stats.droppedNoTitleOrLink} ohne Titel/Link, ${stats.droppedNoDate} ohne Datum, ` +
				`${stats.droppedNotRelevant} nicht relevant, ${stats.droppedNoKreis} ohne zuordenbaren Kreis)`
		);
	}

	console.log(
		`\nGesamt: ${summary.totalNormalized} normalisiert -> ${summary.totalAfterFilter} nach Zeitfilter -> ${summary.totalNew} neu (nach Dedupe gegen bestehende CSV)`
	);

	if (args.dryRun) {
		for (const event of summary.written) {
			console.log(`  [DRY-RUN] ${event.datum.toISOString().slice(0, 10)} | ${event.bundesland} | ${event.kreis} | ${event.partyart} | ${event.titel}`);
		}
	} else {
		console.log(`${summary.totalNew} neue Zeile(n) an ${csvPath} angehängt.`);
	}
}

main().catch((error) => {
	console.error('Ingestion-Pipeline abgebrochen:', error);
	process.exitCode = 1;
});
