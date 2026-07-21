export function getBackendUrl(): string {
	const url = process.env.BACKEND_URL;
	if (!url) {
		throw new Error(
			"BACKEND_URL is not configured — set it in .env.local to the tontine_backend API's base URL.",
		);
	}
	return url;
}

async function parseErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) return body.message.join(", ");
		if (body.message) return body.message;
	} catch {
		// response body wasn't JSON — fall through to the generic message below
	}
	return `Request failed with status ${response.status}`;
}

/**
 * Shared fetch helper for every backend-client resource module: attaches the
 * bearer token when present, throws a normalized error (via
 * parseErrorMessage) on a non-OK response, and tolerates empty response
 * bodies (e.g. a 200 with no body from a DELETE).
 */
export async function apiFetch<T>(
	path: string,
	accessToken?: string,
	init?: RequestInit,
): Promise<T> {
	const headers = new Headers(init?.headers);
	if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
	if (init?.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${getBackendUrl()}${path}`, {
		...init,
		headers,
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}

	const text = await response.text();
	return (text ? JSON.parse(text) : undefined) as T;
}
