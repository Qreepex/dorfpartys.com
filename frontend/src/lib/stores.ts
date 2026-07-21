import { writable } from 'svelte/store';
import type { Notification, User } from '@dorfpartys/shared';

export const userStore = writable<User | null>(null);

// Navbar-Glocke: initial aus dem Root-Layout-Load befüllt (analog zu
// userStore/data.user), danach optimistisch client-seitig aktualisiert, wenn
// eine Notification als gelesen markiert (= gelöscht) wird - kein Re-Fetch
// nötig, siehe Navbar.svelte.
export const notificationsStore = writable<Notification[]>([]);

// Hinweis: Es gab hier früher einen `countryStore` (client-only, nur per
// `.set()` von der Navbar geschrieben). Das war die Ursache eines Bugs: die
// "Nächste Partys"-Liste auf der Landing Page hing an server-geladenen Daten
// (`+page.server.ts`), die vom Store komplett entkoppelt waren - ein Klick auf
// den alten Navbar-Land-Toggle aktualisierte den Store (und damit Texte, die
// direkt aus dem Store lasen) sofort, aber NICHT die eigentliche Event-Liste,
// da SvelteKit den Root-Layout-Load (liest nur `cookies`, nicht `url`) beim
// clientseitigen Redirect zurück zu `/` nicht neu ausführt (kein getrackter
// Dependency-Wechsel). Der neue Land-Toggle auf der Landing Page verlinkt
// stattdessen auf echte `?land=`-URLs, die `+page.server.ts` per
// `url.searchParams` liest - das IST ein von SvelteKit getrackter Dependency,
// wird also bei jeder Client-Navigation zuverlässig neu geladen. Der Country
// kommt jetzt direkt aus `data.country` (Page-Load), nicht mehr aus einem Store.
export function initializeStores(initialUser: User | null, initialNotifications: Notification[] = []) {
	userStore.set(initialUser);
	notificationsStore.set(initialNotifications);
}
