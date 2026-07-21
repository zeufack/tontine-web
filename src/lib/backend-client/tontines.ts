import { z } from "zod";
import { apiFetch } from "./api-fetch";

export const contributionFrequencySchema = z.enum([
	"daily",
	"weekly",
	"biweekly",
	"monthly",
	"quarterly",
	"yearly",
	"custom",
]);
export type ContributionFrequency = z.infer<typeof contributionFrequencySchema>;

// `configuration` is a free-form JSON blob on the backend (no fixed schema),
// so a contribution amount isn't a guaranteed field — read it defensively
// wherever the tontine-creation flow happens to have put it.
export const publicTontineSchema = z.object({
	id: z.string(),
	name: z.string(),
	contributionFrequency: contributionFrequencySchema,
	configuration: z.record(z.string(), z.unknown()).nullish(),
	tontineType: z.object({ name: z.string() }),
	participants: z.array(z.unknown()),
});
export type PublicTontine = z.infer<typeof publicTontineSchema>;

/**
 * `GET /tontines/public` is `@Public()` on the backend — no accessToken
 * required, callable from an unauthenticated visitor.
 */
export async function fetchPublicTontines(): Promise<PublicTontine[]> {
	const raw = await apiFetch("/tontines/public");
	return z.array(publicTontineSchema).parse(raw);
}
