import { fetchFromSource } from './connectors/index.js';
import { appendEventsToCsv, loadExistingFingerprints } from './pipeline/csvWriter.js';
import { dedupeEvents } from './pipeline/dedupe.js';
import { filterRelevant } from './pipeline/filter.js';
import { normalizeItem, type NormalizeStats } from './pipeline/normalize.js';
import { SOURCES } from './sources.js';
import type { NormalizedEvent, SourceConfig } from './types.js';

export interface RunOptions {
	csvPath: string;
	dryRun?: boolean;
	/** Wenn gesetzt, werden nur Quellen mit dieser ID abgefragt (Debugging einzelner Connectoren). */
	onlySourceId?: string;
	/** Überschreibt die Standard-Registry aus `sources.ts` (z.B. für `watchUrls.ts`, das nur die url-watch-Quelle laufen lassen will). */
	sources?: SourceConfig[];
}

interface SourceRunResult {
	source: SourceConfig;
	fetched: number;
	stats: NormalizeStats;
	error?: string;
}

export interface RunSummary {
	perSource: SourceRunResult[];
	totalNormalized: number;
	totalAfterFilter: number;
	totalNew: number;
	written: NormalizedEvent[];
}

function emptyStats(): NormalizeStats {
	return { total: 0, droppedNoTitleOrLink: 0, droppedNoDate: 0, droppedNotRelevant: 0, droppedNoKreis: 0, kept: 0 };
}

export async function runPipeline(options: RunOptions): Promise<RunSummary> {
	const sourceRegistry = options.sources ?? SOURCES;
	const sources = sourceRegistry.filter((s) => s.enabled !== false && (!options.onlySourceId || s.id === options.onlySourceId));

	const perSource: SourceRunResult[] = [];
	const allNormalized: NormalizedEvent[] = [];


	for (const source of sources) {
		console.log(`\n[${source.id}] Quelle wird abgefragt...`);
		const stats = emptyStats();
		try {
			const rawItems = await fetchFromSource(source);
			console.log(`[${source.id}] ${rawItems.length} Roh-Treffer erhalten, werden normalisiert...`);
			for (const item of rawItems) {
				const normalized = normalizeItem(item, source, stats);
				if (normalized) allNormalized.push(normalized);
			}
			perSource.push({ source, fetched: rawItems.length, stats });
		} catch (error) {
			perSource.push({ source, fetched: 0, stats, error: (error as Error).message });
			console.warn(`[${source.id}] Quelle fehlgeschlagen: ${(error as Error).message}`);
		}
	}

	const afterFilter = filterRelevant(allNormalized);
	const seen = loadExistingFingerprints(options.csvPath);
	const newEvents = dedupeEvents(afterFilter, seen);

	if (!options.dryRun) {
		appendEventsToCsv(options.csvPath, newEvents);
	}

	return {
		perSource,
		totalNormalized: allNormalized.length,
		totalAfterFilter: afterFilter.length,
		totalNew: newEvents.length,
		written: newEvents
	};
}
