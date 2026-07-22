/**
 * Keyword-basierte Relevanz-/Kategorie-Erkennung für rohe Events aus Open-Data-
 * Quellen. Ersetzt keine redaktionelle Prüfung - Ziel ist, den offensichtlich
 * irrelevanten Rest (Ratssitzungen, Weihnachtsmärkte, Seminare, Stadtfestivals)
 * rauszufiltern und den Rest so gut wie möglich einer PARTY_ART_SEED-Kategorie
 * zuzuordnen (siehe `shared/src/constants/index.ts`).
 */

export interface PartyArtRule {
	slug: string;
	patterns: RegExp[];
}

/** Reihenfolge zählt: erster Treffer gewinnt, daher spezifischere Muster zuerst. */
export const PARTY_ART_RULES: PartyArtRule[] = [
	{
		slug: 'schuetzenfeste',
		patterns: [/schützenfest/i, /schützenverein/i, /schützenbruderschaft/i, /schützengilde/i, /königsschie(ß|ss)en/i, /schützenkorps/i]
	},
	{ slug: 'zeltfeten', patterns: [/zeltfete/i, /zeltparty/i, /zeltfest/i] },
	{ slug: 'scheunenfeten', patterns: [/scheunenfete/i, /scheunenparty/i, /scheunenfest/i] },
	{ slug: 'stoppelfeten', patterns: [/stoppelfete/i, /stoppelparty/i] },
	{ slug: 'osterfeuer', patterns: [/osterfeuer/i] },
	{ slug: 'oktoberfeste', patterns: [/oktoberfest/i] },
	{ slug: 'karneval-fasching', patterns: [/karneval/i, /fasching/i, /fastnacht/i, /rosenmontag/i] },
	{ slug: 'maifeste', patterns: [/maifest/i, /maibaum/i, /maifeuer/i, /maiball/i] },
	{
		slug: 'trecker-treck-tractorplling',
		patterns: [/trecker[- ]?treck/i, /tractor[- ]?pulling/i, /traktor[- ]?pulling/i]
	},
	{ slug: 'erntefeste', patterns: [/erntefest/i, /erntedankfest/i, /kartoffelfest/i, /hahnrupfen/i, /weinbergfest/i] },
	{
		slug: 'feuerwehrfeste',
		patterns: [
			/feuerwehrfest/i,
			/feuerwehr.*(jubiläum|jahre)/i,
			/(jubiläum|jahre).*feuerwehr/i,
			/tag der offenen tür.*feuerwehr/i,
			/feuerwehr.*tag der offenen tür/i,
			/feuerwehr.*familienfest/i
		]
	},
	{ slug: 'sportfeste', patterns: [/sportfest/i, /sportverein.*fest/i] },
	{ slug: 'open-air', patterns: [/open[- ]air/i] },
	{
		slug: 'dorffeste',
		patterns: [
			/dorffest/i,
			/ortsfest/i,
			/heimatfest/i,
			/vereinsfest/i,
			/kirmes/i,
			/bördefest/i,
			/runddorffest/i,
			/schul-\s*und\s*heimatfest/i,
			/sommerfest/i
		]
	}
];

/**
 * Breitere Signalwörter: reichen für sich allein nicht für eine spezifische
 * Kategorie, machen ein Event aber plausibel relevant genug für "sonstiges"
 * (z.B. "Deichpartie", "Landjugend"-Veranstaltungen ohne klaren Festtyp).
 */
export const GENERAL_RELEVANCE_PATTERNS: RegExp[] = [
	/landjugend/i,
	/dorfparty/i,
	/dorfpartys/i,
	/volksfest/i,
	/scheune/i,
	/zeltparty/i,
	/jugendfeuerwehr/i,
	/brauchtum/i,
	/kirchweih/i,
	/kirmes/i
];

/**
 * Harte Ausschlüsse - werden vor der Kategorisierung geprüft. Ein Treffer hier
 * verwirft die Zeile unabhängig davon, ob PARTY_ART_RULES sonst matchen würde
 * (AGENTS.md-Vorgabe: keine Ratssitzungen, Weihnachtsmärkte, kommerzielle
 * Stadtfestivals, Fortbildungen).
 */
export const BLOCKLIST_PATTERNS: RegExp[] = [
	/weihnachtsmarkt/i,
	/adventsmarkt/i,
	/christkindlmarkt/i,
	/ratssitzung/i,
	/ausschusssitzung/i,
	/gemeinderat(ssitzung)?/i,
	/stadtratssitzung/i,
	/bürgerversammlung/i,
	/einwohnerversammlung/i,
	/elternabend/i,
	/seminar/i,
	/lehrgang/i,
	/fortbildung/i,
	/schulung/i,
	/prüfung/i,
	/klausurtagung/i,
	/pressekonferenz/i,
	/mitgliederversammlung/i,
	/jahreshauptversammlung/i,
	/delegiertenversammlung/i,
	/wahlkampf/i,
	/info(rmations)?veranstaltung/i,
	/vortrag/i,
	/blutspende/i,
	/flohmarkt/i,
	/second[- ]?hand/i
];

export interface ClassificationResult {
	slug: string;
	matchedText: string;
}

/**
 * Klassifiziert einen Roh-Text (i.d.R. Titel + Kategorie/Tags + kurze
 * Beschreibung) in einen PARTY_ART_SEED-Slug. `null` bedeutet: nicht relevant
 * genug, Zeile sollte verworfen werden (bewusst konservativ statt zu raten).
 */
export function classifyPartyArt(...texts: Array<string | undefined>): ClassificationResult | null {
	const combined = texts.filter(Boolean).join(' \n ');
	if (!combined.trim()) return null;

	for (const blocked of BLOCKLIST_PATTERNS) {
		if (blocked.test(combined)) return null;
	}

	for (const rule of PARTY_ART_RULES) {
		for (const pattern of rule.patterns) {
			const match = pattern.exec(combined);
			if (match) return { slug: rule.slug, matchedText: match[0] };
		}
	}

	for (const pattern of GENERAL_RELEVANCE_PATTERNS) {
		const match = pattern.exec(combined);
		if (match) return { slug: 'sonstiges', matchedText: match[0] };
	}

	return null;
}
