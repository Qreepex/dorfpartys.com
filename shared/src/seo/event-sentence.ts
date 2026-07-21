/**
 * Baut den SEO-Satz ("XXX findet am XXX um XX in XX statt"), der auf der
 * Event-Detailseite direkt unter dem Titel angezeigt wird.
 *
 * Damit Google mehrere hundert Event-Seiten nicht als Duplicate Content
 * einstuft, wird der Satz nicht immer aus derselben Vorlage gebaut: Anhand
 * der Event-`id` (als Seed) werden mehrere unabhängige Variationsachsen
 * (Satzstruktur, Datumsformat, Uhrzeit-Präposition) deterministisch
 * ausgewählt - dieselbe `id` liefert also immer denselben Satz, verschiedene
 * `id`s streuen über spürbar unterschiedliche Formulierungen.
 *
 * `startDate` kann fehlen oder ein reines Datum ohne Uhrzeit sein (AGENTS.md
 * 5, "Quantität über Qualität" - startDate/addressDescription sind optional),
 * daher deckt die Funktion alle vier Kombinationen aus Datum×Ort ab, jeweils
 * mit und ohne Uhrzeit.
 */

export interface EventSeoSentenceInput {
	/** Event-ID, dient als Seed für die deterministische Variantenwahl. */
	id: string;
	title: string;
	/** ISO-Datum oder ISO-Datetime, oder `null` falls der Termin noch nicht feststeht. */
	startDate: string | null;
	addressDescription: string | null;
	/** Ausweichort, falls keine Adresse hinterlegt ist (z.B. Kreis- oder Bundesland-Name). */
	locationFallback?: string | null;
}

/** FNV-1a-Hash - klein, deterministisch, ausreichend gut gestreut für Varianten-Auswahl. */
function seededIndex(seed: string, axis: string, modulus: number): number {
	const combined = `${seed}::${axis}`;
	let hash = 2166136261;
	for (let i = 0; i < combined.length; i++) {
		hash ^= combined.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash) % modulus;
}

function hasTimeComponent(iso: string): boolean {
	return /T\d{2}:\d{2}/.test(iso);
}

const MONTHS_LONG = [
	'Januar',
	'Februar',
	'März',
	'April',
	'Mai',
	'Juni',
	'Juli',
	'August',
	'September',
	'Oktober',
	'November',
	'Dezember'
];
const WEEKDAYS_LONG = [
	'Sonntag',
	'Montag',
	'Dienstag',
	'Mittwoch',
	'Donnerstag',
	'Freitag',
	'Samstag'
];

/** Datumsphrase ohne führendes "am" (wird von den Satz-Templates ergänzt), 4 Stilvarianten. */
function formatDateVariant(date: Date, variantIndex: number): string {
	const weekday = WEEKDAYS_LONG[date.getDay()];
	const day = date.getDate();
	const month = MONTHS_LONG[date.getMonth()];
	const year = date.getFullYear();
	const monthPadded = String(date.getMonth() + 1).padStart(2, '0');
	const dayPadded = String(day).padStart(2, '0');

	switch (variantIndex) {
		case 0:
			return `${weekday}, den ${day}. ${month} ${year}`;
		case 1:
			return `${day}. ${month} ${year}`;
		case 2:
			return `${weekday}, dem ${day}. ${month} ${year}`;
		default:
			return `${dayPadded}.${monthPadded}.${year}`;
	}
}

/** Uhrzeit inklusive Präposition, z.B. "um 20 Uhr" / "ab 20:30 Uhr". */
function formatTimeClause(date: Date, variantIndex: number): string {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const time = minutes === 0 ? `${hours} Uhr` : `${hours}:${String(minutes).padStart(2, '0')} Uhr`;
	const preposition = variantIndex % 2 === 0 ? 'um' : 'ab';
	return `${preposition} ${time}`;
}

type SentenceBuilder = (title: string, dateVariant: string, timeClause: string, location: string) => string;

const TEMPLATES_DATE_TIME_LOCATION: SentenceBuilder[] = [
	(title, date, time, location) => `${title} findet am ${date} ${time} in ${location} statt.`,
	(title, date, time, location) => `Am ${date} ${time} steigt ${title} in ${location}.`,
	(title, date, time, location) => `${title} in ${location}: Start ist am ${date}, ${time}.`,
	(title, date, time, location) => `Wer zu ${title} will, ist am ${date} ${time} in ${location} richtig.`,
	(title, date, time, location) => `In ${location} heißt es am ${date} ${time}: ${title}.`
];

const TEMPLATES_DATE_TIME: SentenceBuilder[] = [
	(title, date, time) => `${title} findet am ${date} ${time} statt.`,
	(title, date, time) => `Am ${date} ${time} steigt ${title}.`,
	(title, date, time) => `Los geht's bei ${title} am ${date}, ${time}.`,
	(title, date, time) => `${title} startet am ${date} ${time}.`
];

const TEMPLATES_DATE_LOCATION: SentenceBuilder[] = [
	(title, date, _time, location) => `${title} findet am ${date} in ${location} statt.`,
	(title, date, _time, location) => `Am ${date} steigt ${title} in ${location}.`,
	(title, date, _time, location) => `${title} in ${location}: Der Termin ist am ${date}.`,
	(title, date, _time, location) => `Wer zu ${title} will, ist am ${date} in ${location} richtig.`
];

const TEMPLATES_DATE_ONLY: SentenceBuilder[] = [
	(title, date) => `${title} findet am ${date} statt.`,
	(title, date) => `Am ${date} steigt ${title}.`,
	(title, date) => `${title} steht am ${date} an.`,
	(title, date) => `Termin gemerkt? ${title} findet am ${date} statt.`
];

const TEMPLATES_LOCATION_ONLY: Array<(title: string, location: string) => string> = [
	(title, location) => `${title} findet in ${location} statt - der genaue Termin steht noch nicht fest.`,
	(title, location) => `${title} in ${location}: Der Termin wird bald bekanntgegeben.`,
	(title, location) => `In ${location} findet ${title} statt, sobald der Termin feststeht.`,
	(title, location) => `${title} ist in ${location} geplant - Termin folgt.`
];

const TEMPLATES_NONE: Array<(title: string) => string> = [
	(title) => `${title} - Termin und Ort werden in Kürze bekanntgegeben.`,
	(title) => `Für ${title} stehen Termin und Ort noch nicht fest.`,
	(title) => `${title} wird bald mit Termin und Ort veröffentlicht.`,
	(title) => `Details zu ${title} folgen in Kürze.`
];

function pick<T>(seed: string, axis: string, options: T[]): T {
	return options[seededIndex(seed, axis, options.length)];
}

/**
 * Baut den SEO-Einleitungssatz für eine Event-Detailseite. Liefert für
 * dieselbe `input.id` immer denselben Satz; verschiedene `id`s liefern mit
 * hoher Wahrscheinlichkeit unterschiedliche Formulierungen (Satzstruktur,
 * Datumsformat, Uhrzeit-Präposition variieren unabhängig voneinander).
 */
export function buildEventSeoSentence(input: EventSeoSentenceInput): string {
	const { id, title, startDate, addressDescription } = input;
	const location = addressDescription ?? input.locationFallback ?? null;

	if (!startDate) {
		if (location) {
			const builder = pick(id, 'structure', TEMPLATES_LOCATION_ONLY);
			return builder(title, location);
		}
		const builder = pick(id, 'structure', TEMPLATES_NONE);
		return builder(title);
	}

	const date = new Date(startDate);
	const withTime = hasTimeComponent(startDate);
	const dateVariant = formatDateVariant(date, seededIndex(id, 'dateFormat', 4));
	const timeClause = withTime ? formatTimeClause(date, seededIndex(id, 'timeFormat', 2)) : '';

	if (withTime && location) {
		const builder = pick(id, 'structure', TEMPLATES_DATE_TIME_LOCATION);
		return builder(title, dateVariant, timeClause, location);
	}
	if (withTime && !location) {
		const builder = pick(id, 'structure', TEMPLATES_DATE_TIME);
		return builder(title, dateVariant, timeClause, '');
	}
	if (!withTime && location) {
		const builder = pick(id, 'structure', TEMPLATES_DATE_LOCATION);
		return builder(title, dateVariant, timeClause, location);
	}
	const builder = pick(id, 'structure', TEMPLATES_DATE_ONLY);
	return builder(title, dateVariant, timeClause, '');
}
