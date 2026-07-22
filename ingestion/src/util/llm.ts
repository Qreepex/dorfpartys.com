import type { LlmConfig } from '../types.js';

const SYSTEM_PROMPT = `Du bekommst den sichtbaren Textinhalt einer Webseite. Prüfe, ob die Seite eine oder mehrere konkrete, in der Zukunft stattfindendene lokale Veranstaltungen ankündigt - insbesondere Schützenfeste, Zeltfeten, Scheunenfeten, Stoppelfeten, Dorffeste, Osterfeuer, Oktoberfeste, Karneval/Fasching, Sportfeste, Feuerwehrfeste, Erntefeste, Maifeste, Trecker-Treck/Tractorpulling, Open Airs oder ähnliche Dorf-/Vereinsfeste. Große kommerzielle Festivals, Stadtfeste großer Städte, Weihnachtsmärkte, reine Vereinssitzungen oder allgemeine Newsartikel ohne konkretes Datum zählen NICHT.

Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt, ohne Markdown-Codeblock, ohne weiteren Text, in genau diesem Format:
[{"found": true oder false, "title": string oder null, "date": string oder null, "location": string oder null, "organizer": string oder null, "bundesland": string oder null, "kreis": string oder null, "description": string oder null}]

- "date": wenn möglich als ISO 8601 (z.B. "2026-08-15T19:00:00"), sonst so genau wie im Text angegeben (z.B. "15.08.2026").
- Bundesland als 2-stellige Abkürzung (z.B. "NW" für Nordrhein-Westfalen, "BY" für Bayern, "HE" für Hessen, "SH" für Schleswig-Holstein, etc.), Kreis als offizieller Name (z.B. "Rhein-Sieg-Kreis", "Landkreis Emsland", etc.) - wenn im Text nicht vorhanden, dann null.
- "location": Ort/Kreis/Adresse, so konkret wie im Text vorhanden. Wenn du von einem Ort genau weißt, in welchem Bundesland und Kreis er liegt, kannst du das ergänzen.
- Wenn keine konkrete Veranstaltung mit erkennbarem Datum vorhanden ist, antworte exakt [].
- Erfinde keine anderen Informationen, die nicht im Text stehen.`;

export interface LlmExtractionResult {
	found: boolean;
	title: string | null;
	date: string | null;
	location: string | null;
	organizer: string | null;
	bundesland: string | null;
	kreis: string | null;
}[]

interface OpenWebUiChatResponse {
	choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Schickt den (bereits auf Klartext reduzierten) Seiteninhalt an eine
 * OpenWebUI-Instanz (OpenAI-kompatible `/api/chat/completions`-Route) und
 * bittet ein dort gehostetes Modell, eine angekündigte Veranstaltung zu
 * extrahieren. Reiner Best-Effort-Fallback für Seiten ohne JSON-LD - siehe
 * README "URL-Watchlist" für Grenzen (Halluzinationsrisiko, Modell-Wahl).
 */
export async function extractEventWithLlm(pageText: string, pageUrl: string, llm: LlmConfig): Promise<LlmExtractionResult | null> {
	const baseUrl = llm.baseUrl.replace(/\/$/, '');
	const response = await fetch(`${baseUrl}/api/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${llm.apiKey}`
		},
		body: JSON.stringify({
			model: llm.model,
			temperature: 0,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: `URL: ${pageUrl}\n\nSeiteninhalt:\n${pageText.slice(0, 8000)}` }
			]
		})
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`OpenWebUI HTTP ${response.status}${body ? `: ${body.slice(0, 500)}` : ''}`);
	}

	console.log(`[extractEventWithLlm] ${pageUrl}: ${response.status} ${response.statusText}`);

	const data = (await response.json()) as OpenWebUiChatResponse;
	const content = data.choices?.[0]?.message?.content;
	if (!content) return null;

	const jsonMatch = /\{[\s\S]*\}/.exec(content);
	if (!jsonMatch) return null;

	try {
		const parsed = JSON.parse(jsonMatch[0]) as LlmExtractionResult;
		return parsed;
	} catch {
		return null;
	}
}
