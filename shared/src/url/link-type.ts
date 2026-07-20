export const EVENT_LINK_TYPES = ['tiktok', 'instagram', 'facebook', 'website'] as const;
export type EventLinkType = (typeof EVENT_LINK_TYPES)[number];

const EVENT_LINK_TYPE_LABELS: Record<EventLinkType, string> = {
	tiktok: 'TikTok',
	instagram: 'Instagram',
	facebook: 'Facebook',
	website: 'Website'
};

/**
 * Leitet den Link-Typ rein aus der Domain her - `event_link` hat bewusst kein
 * eigenes `type`-Spaltenfeld (AGENTS.md Abschnitt 2), damit z.B. Umzüge auf
 * andere TikTok-/Instagram-Domains oder neue Plattformen keine Migration
 * brauchen. Wird sowohl beim Einreichen (Default-Label, siehe
 * `defaultEventLinkLabel`) als auch auf der Event-Seite (Icon) genutzt.
 */
export function detectEventLinkType(rawUrl: string): EventLinkType {
	// Kein `new URL(...)` hier - `shared` baut ohne "dom"-Lib (Node + Browser
	// gemeinsam genutzt, siehe shared/tsconfig.json), daher reines Regex-Parsing
	// des Hosts statt WHATWG-URL-Parsing.
	const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(rawUrl.trim());
	if (!match) return 'website';
	const host = match[1].split('@').pop()!.split(':')[0].replace(/^www\./i, '').toLowerCase();
	if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
	if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
	if (
		host === 'facebook.com' ||
		host.endsWith('.facebook.com') ||
		host === 'fb.com' ||
		host.endsWith('.fb.com')
	) {
		return 'facebook';
	}
	return 'website';
}

/** Default-Label für einen Link, falls der Veranstalter beim Einreichen keins angibt. */
export function defaultEventLinkLabel(rawUrl: string): string {
	return EVENT_LINK_TYPE_LABELS[detectEventLinkType(rawUrl)];
}
