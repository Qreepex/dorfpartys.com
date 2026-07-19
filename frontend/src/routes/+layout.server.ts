import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { LayoutServerLoad } from './$types.js';

function isCountry(value: string | undefined): value is Country {
	return !!value && (COUNTRIES as readonly string[]).includes(value);
}

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const country: Country = isCountry(cookies.get('country')) ? (cookies.get('country') as Country) : 'de';

	try {
		const user = await locals.trpc.users.me.query();
		return { user, country };
	} catch {
		return { user: null, country };
	}
};
