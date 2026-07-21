import { applyAction, deserialize } from '$app/forms';
import type { ActionResult } from '@sveltejs/kit';

export const DEFAULT_ACTION_ERROR = 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';

export interface ActionOutcome<T = Record<string, unknown>> {
	ok: boolean;
	/** Rohe `data` des ActionResult, sofern `success`/`failure` (nie bei `error`/`redirect`). */
	data?: T;
	/** Immer ein anzeigbarer String, nie ein Objekt - sicher direkt ins Template interpolierbar. */
	error?: string;
	fieldErrors?: Record<string, string[]>;
}

/**
 * POSTet FormData an eine SvelteKit-Form-Action (`?/name`) per fetch, ohne
 * Seiten-Reload - Ersatz für den früher an mehreren Stellen duplizierten
 * `fetch(...) + response.json()`-Code (u.a. mit dem `_data=json`-Bug in
 * AvatarUpload.svelte/ImageUpload.svelte, der auf ein 404 lief). Nutzt wie
 * SvelteKits eigenes `use:enhance` `deserialize()` statt `response.json()`,
 * weil Action-Antworten devalue-kodiert sind, nicht schlichtes JSON - ein
 * `response.json()` auf einer Fehlerantwort (`type: 'error'`) liefert sonst
 * ein verschachteltes Objekt statt eines Strings, das ungeprüft im Template
 * gerendert als "[object Object]" auftaucht.
 *
 * Ruft zusätzlich `applyAction()` auf, damit SvelteKits Client-Runtime bei
 * `redirect` navigiert und `page.form`/`page.status` konsistent bleiben.
 */
export async function callAction<T = Record<string, unknown>>(
	actionUrl: string,
	body: FormData
): Promise<ActionOutcome<T>> {
	let result: ActionResult;
	try {
		const response = await fetch(actionUrl, { method: 'POST', body });
		result = deserialize(await response.text());
	} catch {
		return {
			ok: false,
			error: 'Netzwerkfehler - bitte überprüfe deine Verbindung und versuch es erneut.'
		};
	}

	if (result.type === 'success') {
		await applyAction(result);
		return { ok: true, data: result.data as T };
	}

	if (result.type === 'failure') {
		const data = (result.data ?? {}) as Record<string, unknown>;
		return {
			ok: false,
			data: data as T,
			error: typeof data.error === 'string' ? data.error : undefined,
			fieldErrors:
				data.fieldErrors && typeof data.fieldErrors === 'object'
					? (data.fieldErrors as Record<string, string[]>)
					: undefined
		};
	}

	if (result.type === 'redirect') {
		await applyAction(result);
		return { ok: true };
	}

	// result.type === 'error': ein unerwarteter Fehler (geworfene Exception,
	// unbekannte Action, ...). Bewusst KEIN `applyAction(result)` hier -
	// SvelteKits `applyAction` ersetzt bei `type: 'error'` die komplette Seite
	// durch die nächste `+error.svelte`-Boundary (`set_nearest_error_page`),
	// das würde das gerade ausgefüllte Formular wegreißen. Stattdessen nur
	// eine anzeigbare Fehlermeldung zurückgeben - `result.error` ist ein
	// `App.Error`-Objekt (i.d.R. `{ message: string }`), niemals direkt rendern.
	const message =
		result.error && typeof result.error === 'object' && 'message' in result.error
			? String((result.error as { message?: unknown }).message ?? '')
			: '';
	return { ok: false, error: message || DEFAULT_ACTION_ERROR };
}
