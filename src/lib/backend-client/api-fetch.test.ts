import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api-fetch";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("apiFetch", () => {
	beforeEach(() => {
		process.env.BACKEND_URL = "https://backend.example.test";
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns parsed JSON on success", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { id: "u1" }));

		const result = await apiFetch<{ id: string }>("/users/u1", "token-abc");

		expect(result).toEqual({ id: "u1" });
		expect(fetch).toHaveBeenCalledWith(
			"https://backend.example.test/users/u1",
			expect.objectContaining({ headers: expect.any(Headers) }),
		);
		const [, init] = vi.mocked(fetch).mock.calls[0];
		const headers = init?.headers as Headers;
		expect(headers.get("Authorization")).toBe("Bearer token-abc");
	});

	it("throws a single string message from a non-OK JSON body", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(404, { message: "User not found" }),
		);

		await expect(apiFetch("/users/missing")).rejects.toThrow("User not found");
	});

	it("joins an array-of-messages body into one thrown message", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(400, {
				message: ["email must be an email", "name required"],
			}),
		);

		await expect(apiFetch("/users/u1")).rejects.toThrow(
			"email must be an email, name required",
		);
	});

	it("falls back to a generic status message when the error body isn't JSON", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response("<html>Internal Server Error</html>", { status: 500 }),
		);

		await expect(apiFetch("/users/u1")).rejects.toThrow(
			"Request failed with status 500",
		);
	});

	it("resolves undefined for an empty response body (e.g. DELETE)", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

		await expect(
			apiFetch("/users/u1", "t", { method: "DELETE" }),
		).resolves.toBeUndefined();
	});
});
