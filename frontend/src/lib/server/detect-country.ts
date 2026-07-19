import { COUNTRIES, type Country } from '@dorfpartys/shared';

/**
 * Erste Länder-Vermutung aus dem `Accept-Language`-Header - kein externer
 * Aufruf (z.B. IP-Geolocation-Dienst), damit die "kein Tracking"-Position der
 * Seite (siehe Landingpage) nicht unterlaufen wird. Wird clientseitig per
 * Zeitzone verfeinert (siehe Navbar.svelte).
 */
export function detectCountryFromAcceptLanguage(header: string | null): Country {
	if (!header) return 'de';

	// z.B. "de-AT,de;q=0.9,en;q=0.8" -> Regionen in Reihenfolge ihrer Gewichtung.
	const regions = header
		.split(',')
		.map((part) => part.trim().split(';')[0])
		.map((locale) => locale.split('-')[1]?.toLowerCase())
		.filter((region): region is string => Boolean(region));

	for (const region of regions) {
		if ((COUNTRIES as readonly string[]).includes(region)) {
			return region as Country;
		}
	}
	return 'de';
}
