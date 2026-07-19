export interface BackendUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
}

export interface BackendLoginResult {
	accessToken: string;
	refreshToken: string;
	user: BackendUser;
}

function getBackendUrl(): string {
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

export async function backendLogin(input: {
	email: string;
	password: string;
}): Promise<BackendLoginResult> {
	const response = await fetch(`${getBackendUrl()}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return response.json();
}

/**
 * The backend's `POST /auth/register` returns the created `User` entity, not
 * a session — there is no accessToken/refreshToken in this response. Callers
 * that want a working session must follow up with `backendLogin` using the
 * same credentials (see `registerAction` in `session-actions.ts`).
 */
export async function backendRegister(input: {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	phoneNumber?: string;
}): Promise<BackendUser> {
	const response = await fetch(`${getBackendUrl()}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return response.json();
}
