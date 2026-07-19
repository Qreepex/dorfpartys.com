import type { Handle } from '@sveltejs/kit';
import { createBackendClient } from '$lib/trpc-client/index.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.trpc = createBackendClient(event.request.headers.get('cookie'));
	return resolve(event);
};
