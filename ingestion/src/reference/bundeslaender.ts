/**
 * Kompakte Bundesland/Kreis-Referenz für die Ingestion-Pipeline, unabhängig vom
 * Backend gehalten (dieses Package läuft als eigenständiges Batch-Tool, siehe
 * README). Namen sind bewusst deckungsgleich mit `backend/src/db/seed/data.ts`
 * gehalten, damit importierte Kreisnamen 1:1 zu den späteren DB-Werten passen.
 *
 * Nur Deutschland ist aktuell befüllt - die Quellen in `sources.ts` sind bislang
 * DE-fokussiert. Für AT/CH müsste zusätzlich eine kollisionsfreie Codierung
 * gefunden werden (z.B. "AT-ST" für Steiermark vs. "ST" für Sachsen-Anhalt).
 */

export interface BundeslandRef {
	/** ISO-3166-2:DE-Kürzel ohne Präfix, z.B. "SH", "NW". */
	code: string;
	name: string;
	kreise: string[];
}

export const BUNDESLAENDER_DE: BundeslandRef[] = [
	{
		code: 'SH',
		name: 'Schleswig-Holstein',
		kreise: [
			'Flensburg',
			'Kiel',
			'Lübeck',
			'Neumünster',
			'Dithmarschen',
			'Herzogtum Lauenburg',
			'Nordfriesland',
			'Ostholstein',
			'Pinneberg',
			'Plön',
			'Rendsburg-Eckernförde',
			'Schleswig-Flensburg',
			'Segeberg',
			'Steinburg',
			'Stormarn'
		]
	},
	{
		code: 'HH',
		name: 'Hamburg',
		kreise: ['Hamburg', 'Hamburg-Mitte', 'Altona', 'Eimsbüttel', 'Hamburg-Nord', 'Wandsbek', 'Bergedorf', 'Harburg']
	},
	{
		code: 'NI',
		name: 'Niedersachsen',
		kreise: [
			'Braunschweig',
			'Delmenhorst',
			'Emden',
			'Oldenburg (Stadt)',
			'Osnabrück (Stadt)',
			'Salzgitter',
			'Wilhelmshaven',
			'Wolfsburg',
			'Region Hannover',
			'Ammerland',
			'Aurich',
			'Celle',
			'Cloppenburg',
			'Cuxhaven',
			'Diepholz',
			'Emsland',
			'Friesland',
			'Gifhorn',
			'Goslar',
			'Göttingen',
			'Grafschaft Bentheim',
			'Hameln-Pyrmont',
			'Harburg (Landkreis)',
			'Heidekreis',
			'Helmstedt',
			'Hildesheim',
			'Holzminden',
			'Leer',
			'Lüchow-Dannenberg',
			'Lüneburg',
			'Nienburg/Weser',
			'Northeim',
			'Oldenburg (Landkreis)',
			'Osnabrück (Landkreis)',
			'Osterholz',
			'Peine',
			'Rotenburg (Wümme)',
			'Schaumburg',
			'Stade',
			'Uelzen',
			'Vechta',
			'Verden',
			'Wesermarsch',
			'Wittmund',
			'Wolfenbüttel'
		]
	},
	{
		code: 'HB',
		name: 'Bremen',
		kreise: ['Bremen', 'Bremen (Stadt)', 'Bremerhaven']
	},
	{
		code: 'NW',
		name: 'Nordrhein-Westfalen',
		kreise: [
			'Bielefeld',
			'Bochum',
			'Bonn',
			'Bottrop',
			'Dortmund',
			'Duisburg',
			'Düsseldorf',
			'Essen',
			'Gelsenkirchen',
			'Hagen',
			'Hamm',
			'Herne',
			'Köln',
			'Krefeld',
			'Leverkusen',
			'Mönchengladbach',
			'Mülheim an der Ruhr',
			'Münster',
			'Oberhausen',
			'Remscheid',
			'Solingen',
			'Wuppertal',
			'Städteregion Aachen',
			'Borken',
			'Coesfeld',
			'Düren',
			'Ennepe-Ruhr-Kreis',
			'Euskirchen',
			'Gütersloh',
			'Heinsberg',
			'Herford',
			'Hochsauerlandkreis',
			'Höxter',
			'Kleve',
			'Lippe',
			'Märkischer Kreis',
			'Mettmann',
			'Minden-Lübbecke',
			'Oberbergischer Kreis',
			'Olpe',
			'Paderborn',
			'Recklinghausen',
			'Rhein-Erft-Kreis',
			'Rhein-Kreis Neuss',
			'Rheinisch-Bergischer Kreis',
			'Rhein-Sieg-Kreis',
			'Siegen-Wittgenstein',
			'Soest',
			'Steinfurt',
			'Unna',
			'Viersen',
			'Warendorf',
			'Wesel'
		]
	},
	{
		code: 'HE',
		name: 'Hessen',
		kreise: [
			'Darmstadt',
			'Frankfurt am Main',
			'Kassel (Stadt)',
			'Offenbach am Main',
			'Wiesbaden',
			'Bergstraße',
			'Darmstadt-Dieburg',
			'Fulda',
			'Gießen',
			'Groß-Gerau',
			'Hersfeld-Rotenburg',
			'Hochtaunuskreis',
			'Kassel (Landkreis)',
			'Lahn-Dill-Kreis',
			'Limburg-Weilburg',
			'Main-Kinzig-Kreis',
			'Main-Taunus-Kreis',
			'Marburg-Biedenkopf',
			'Odenwaldkreis',
			'Offenbach (Landkreis)',
			'Rheingau-Taunus-Kreis',
			'Schwalm-Eder-Kreis',
			'Vogelsbergkreis',
			'Waldeck-Frankenberg',
			'Werra-Meißner-Kreis',
			'Wetteraukreis'
		]
	},
	{
		code: 'RP',
		name: 'Rheinland-Pfalz',
		kreise: [
			'Frankenthal (Pfalz)',
			'Kaiserslautern (Stadt)',
			'Koblenz',
			'Landau in der Pfalz',
			'Ludwigshafen am Rhein',
			'Mainz',
			'Neustadt an der Weinstraße',
			'Pirmasens',
			'Speyer',
			'Trier (Stadt)',
			'Worms',
			'Zweibrücken',
			'Ahrweiler',
			'Altenkirchen (Westerwald)',
			'Alzey-Worms',
			'Bad Dürkheim',
			'Bad Kreuznach',
			'Bernkastel-Wittlich',
			'Birkenfeld',
			'Cochem-Zell',
			'Donnersbergkreis',
			'Eifelkreis Bitburg-Prüm',
			'Germersheim',
			'Kaiserslautern (Landkreis)',
			'Kusel',
			'Mainz-Bingen',
			'Mayen-Koblenz',
			'Neuwied',
			'Rhein-Hunsrück-Kreis',
			'Rhein-Lahn-Kreis',
			'Rhein-Pfalz-Kreis',
			'Südliche Weinstraße',
			'Südwestpfalz',
			'Trier-Saarburg',
			'Vulkaneifel',
			'Westerwaldkreis'
		]
	},
	{
		code: 'BW',
		name: 'Baden-Württemberg',
		kreise: [
			'Baden-Baden',
			'Freiburg im Breisgau',
			'Heidelberg',
			'Heilbronn (Stadt)',
			'Karlsruhe (Stadt)',
			'Mannheim',
			'Pforzheim',
			'Stuttgart',
			'Ulm',
			'Alb-Donau-Kreis',
			'Biberach',
			'Böblingen',
			'Bodenseekreis',
			'Breisgau-Hochschwarzwald',
			'Calw',
			'Emmendingen',
			'Enzkreis',
			'Esslingen',
			'Freudenstadt',
			'Göppingen',
			'Heidenheim',
			'Heilbronn (Landkreis)',
			'Hohenlohekreis',
			'Karlsruhe (Landkreis)',
			'Konstanz',
			'Lörrach',
			'Ludwigsburg',
			'Main-Tauber-Kreis',
			'Neckar-Odenwald-Kreis',
			'Ortenaukreis',
			'Ostalbkreis',
			'Rastatt',
			'Ravensburg',
			'Rems-Murr-Kreis',
			'Reutlingen',
			'Rhein-Neckar-Kreis',
			'Rottweil',
			'Schwäbisch Hall',
			'Schwarzwald-Baar-Kreis',
			'Sigmaringen',
			'Tübingen',
			'Tuttlingen',
			'Waldshut',
			'Zollernalbkreis'
		]
	},
	{
		code: 'BY',
		name: 'Bayern',
		kreise: [
			'Amberg',
			'Ansbach (Stadt)',
			'Aschaffenburg (Stadt)',
			'Augsburg (Stadt)',
			'Bamberg (Stadt)',
			'Bayreuth (Stadt)',
			'Coburg (Stadt)',
			'Erlangen',
			'Fürth (Stadt)',
			'Hof (Stadt)',
			'Ingolstadt',
			'Kaufbeuren',
			'Kempten (Allgäu)',
			'Landshut (Stadt)',
			'Memmingen',
			'München (Stadt)',
			'Nürnberg',
			'Passau (Stadt)',
			'Regensburg (Stadt)',
			'Rosenheim (Stadt)',
			'Schwabach',
			'Schweinfurt (Stadt)',
			'Straubing',
			'Weiden in der Oberpfalz',
			'Würzburg (Stadt)',
			'Aichach-Friedberg',
			'Altötting',
			'Amberg-Sulzbach',
			'Ansbach (Landkreis)',
			'Aschaffenburg (Landkreis)',
			'Augsburg (Landkreis)',
			'Bad Kissingen',
			'Bad Tölz-Wolfratshausen',
			'Bamberg (Landkreis)',
			'Bayreuth (Landkreis)',
			'Berchtesgadener Land',
			'Cham',
			'Coburg (Landkreis)',
			'Dachau',
			'Deggendorf',
			'Dillingen an der Donau',
			'Dingolfing-Landau',
			'Donau-Ries',
			'Ebersberg',
			'Eichstätt',
			'Erding',
			'Erlangen-Höchstadt',
			'Forchheim',
			'Freising',
			'Freyung-Grafenau',
			'Fürstenfeldbruck',
			'Fürth (Landkreis)',
			'Garmisch-Partenkirchen',
			'Günzburg',
			'Haßberge',
			'Hof (Landkreis)',
			'Kelheim',
			'Kitzingen',
			'Kronach',
			'Kulmbach',
			'Landsberg am Lech',
			'Landshut (Landkreis)',
			'Lichtenfels',
			'Lindau (Bodensee)',
			'Main-Spessart',
			'Miesbach',
			'Miltenberg',
			'Mühldorf am Inn',
			'München (Landkreis)',
			'Neuburg-Schrobenhausen',
			'Neumarkt in der Oberpfalz',
			'Neustadt an der Aisch-Bad Windsheim',
			'Neustadt an der Waldnaab',
			'Neu-Ulm',
			'Nürnberger Land',
			'Oberallgäu',
			'Ostallgäu',
			'Passau (Landkreis)',
			'Pfaffenhofen an der Ilm',
			'Regen',
			'Regensburg (Landkreis)',
			'Rhön-Grabfeld',
			'Rosenheim (Landkreis)',
			'Roth',
			'Rottal-Inn',
			'Schwandorf',
			'Schweinfurt (Landkreis)',
			'Starnberg',
			'Straubing-Bogen',
			'Tirschenreuth',
			'Traunstein',
			'Unterallgäu',
			'Weilheim-Schongau',
			'Weißenburg-Gunzenhausen',
			'Wunsiedel im Fichtelgebirge',
			'Würzburg (Landkreis)'
		]
	},
	{
		code: 'SL',
		name: 'Saarland',
		kreise: ['Regionalverband Saarbrücken', 'Merzig-Wadern', 'Neunkirchen', 'Saarlouis', 'Saarpfalz-Kreis', 'St. Wendel']
	},
	{
		code: 'BE',
		name: 'Berlin',
		kreise: [
			'Berlin',
			'Mitte',
			'Friedrichshain-Kreuzberg',
			'Pankow',
			'Charlottenburg-Wilmersdorf',
			'Spandau',
			'Steglitz-Zehlendorf',
			'Tempelhof-Schöneberg',
			'Neukölln',
			'Treptow-Köpenick',
			'Marzahn-Hellersdorf',
			'Lichtenberg',
			'Reinickendorf'
		]
	},
	{
		code: 'BB',
		name: 'Brandenburg',
		kreise: [
			'Brandenburg an der Havel',
			'Cottbus',
			'Frankfurt (Oder)',
			'Potsdam',
			'Barnim',
			'Dahme-Spreewald',
			'Elbe-Elster',
			'Havelland',
			'Märkisch-Oderland',
			'Oberhavel',
			'Oberspreewald-Lausitz',
			'Oder-Spree',
			'Ostprignitz-Ruppin',
			'Potsdam-Mittelmark',
			'Prignitz',
			'Spree-Neiße',
			'Teltow-Fläming',
			'Uckermark'
		]
	},
	{
		code: 'MV',
		name: 'Mecklenburg-Vorpommern',
		kreise: [
			'Rostock',
			'Rostock (Stadt)',
			'Schwerin',
			'Landkreis Rostock',
			'Ludwigslust-Parchim',
			'Mecklenburgische Seenplatte',
			'Nordwestmecklenburg',
			'Vorpommern-Greifswald',
			'Vorpommern-Rügen'
		]
	},
	{
		code: 'SN',
		name: 'Sachsen',
		kreise: [
			'Chemnitz',
			'Dresden',
			'Leipzig (Stadt)',
			'Bautzen',
			'Erzgebirgskreis',
			'Görlitz',
			'Leipzig (Landkreis)',
			'Meißen',
			'Mittelsachsen',
			'Nordsachsen',
			'Sächsische Schweiz-Osterzgebirge',
			'Vogtlandkreis',
			'Zwickau'
		]
	},
	{
		code: 'ST',
		name: 'Sachsen-Anhalt',
		kreise: [
			'Dessau-Roßlau',
			'Halle (Saale)',
			'Magdeburg',
			'Altmarkkreis Salzwedel',
			'Anhalt-Bitterfeld',
			'Börde',
			'Burgenlandkreis',
			'Harz',
			'Jerichower Land',
			'Mansfeld-Südharz',
			'Saalekreis',
			'Salzlandkreis',
			'Stendal',
			'Wittenberg'
		]
	},
	{
		code: 'TH',
		name: 'Thüringen',
		kreise: [
			'Erfurt',
			'Gera',
			'Jena',
			'Suhl',
			'Weimar',
			'Altenburger Land',
			'Eichsfeld',
			'Gotha',
			'Greiz',
			'Hildburghausen',
			'Ilm-Kreis',
			'Kyffhäuserkreis',
			'Nordhausen',
			'Saale-Holzland-Kreis',
			'Saale-Orla-Kreis',
			'Saalfeld-Rudolstadt',
			'Schmalkalden-Meiningen',
			'Sömmerda',
			'Sonneberg',
			'Unstrut-Hainich-Kreis',
			'Wartburgkreis',
			'Weimarer Land'
		]
	}
];

const KREIS_PREFIX_PATTERN = /^(landkreis|kreis|stadtkreis|stadt|gemeinde|amt|ldkr\.?)\s+/i;

/** Normalisiert Freitext für den Kreis-Abgleich: Präfixe weg, Umlaute vereinheitlicht, lowercase. */
function normalizeForMatch(text: string): string {
	return text
		.trim()
		.replace(KREIS_PREFIX_PATTERN, '')
		.toLowerCase()
		.replace(/ß/g, 'ss')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/[.,]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export interface KreisMatch {
	bundeslandCode: string;
	bundeslandName: string;
	kreisName: string;
}

const KREIS_INDEX = new Map<string, KreisMatch>();
for (const bundesland of BUNDESLAENDER_DE) {
	for (const kreisName of bundesland.kreise) {
		const key = normalizeForMatch(kreisName);
		// Erster Eintrag gewinnt bei Kollisionen (z.B. "Kassel" taucht nur einmal auf,
		// da Stadt/Landkreis-Varianten unterschiedliche Klammerzusätze tragen).
		if (!KREIS_INDEX.has(key)) {
			KREIS_INDEX.set(key, { bundeslandCode: bundesland.code, bundeslandName: bundesland.name, kreisName });
		}
	}
}

const BUNDESLAND_BY_CODE = new Map(BUNDESLAENDER_DE.map((b) => [b.code, b]));

/**
 * Versucht, Freitext (Ortsname, Kreisname, "Landkreis X" etc.) einem bekannten
 * Kreis zuzuordnen. Bei `restrictToBundesland` wird nur innerhalb dieses Landes
 * gesucht (schneller + präziser, wenn die Quelle ohnehin nur ein Land abdeckt).
 * Gibt `null` zurück statt zu raten, wenn nichts passt (siehe Pipeline-Policy:
 * lieber Zeile verwerfen als einen falschen Kreis erfinden).
 */
export function matchKreis(rawText: string, restrictToBundesland?: string): KreisMatch | null {
	if (!rawText) return null;
	const normalized = normalizeForMatch(rawText);
	if (!normalized) return null;

	const direct = KREIS_INDEX.get(normalized);
	if (direct && (!restrictToBundesland || direct.bundeslandCode === restrictToBundesland)) {
		return direct;
	}

	// Fallback: Teilstring-Suche (z.B. "Ortsteil Biesdorf, Landkreis Märkisch-Oderland"
	// oder "34590 Wabern" -> Ortsname ohne exakten Kreistreffer). Längster Treffer gewinnt,
	// um z.B. "Rhein-Kreis Neuss" vor "Neuss" (falls je als eigener Eintrag vorhanden) zu bevorzugen.
	const candidates = restrictToBundesland
		? (BUNDESLAND_BY_CODE.get(restrictToBundesland)?.kreise ?? [])
		: [...KREIS_INDEX.values()].map((m) => m.kreisName);

	let best: KreisMatch | null = null;
	for (const kreisName of candidates) {
		const key = normalizeForMatch(kreisName);
		if (normalized.includes(key) || key.includes(normalized)) {
			const match = KREIS_INDEX.get(key);
			if (match && (!best || match.kreisName.length > best.kreisName.length)) {
				best = match;
			}
		}
	}
	return best;
}

export function getBundeslandByCode(code: string): BundeslandRef | undefined {
	return BUNDESLAND_BY_CODE.get(code.toUpperCase());
}
