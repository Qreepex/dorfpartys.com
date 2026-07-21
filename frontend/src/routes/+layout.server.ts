import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { LayoutServerLoad } from './$types.js';

function isCountry(value: string | undefined): value is Country {
	return !!value && (COUNTRIES as readonly string[]).includes(value);
}

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const country: Country = isCountry(cookies.get('country'))
		? (cookies.get('country') as Country)
		: 'de';

	try {
		const user = await locals.trpc.users.me.query();
		// notifications.list läuft nur für eingeloggte Nutzer (protectedProcedure) -
		// hier bereits im try-Block, da ohne User sowieso keine Notifications
		// existieren können.
		const notifications = await locals.trpc.notifications.list.query();
		return { user, country, notifications };
	} catch {
		return { user: null, country, notifications: [] };
	}
};
