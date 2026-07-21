import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	type ContributionFrequency,
	fetchPublicTontines,
} from "#/lib/backend-client/tontines";

export interface PublicTontineSummary {
	id: string;
	name: string;
	frequency: ContributionFrequency;
	memberCount: number;
	/** Both undefined unless `configuration` happens to carry them — neither
	 * is a modeled field on the backend's Tontine entity today. */
	contributionAmount?: number;
	currency?: string;
	tontineTypeName: string;
}

// Mapped to a plain, concrete shape inside the handler itself (rather than
// passed through as the raw backend entity) — createServerFn requires its
// return value to be a statically-verifiable serializable type, which the
// raw entity's `configuration: Record<string, unknown>` / `participants:
// unknown[]` fields aren't.
const fetchPublicTontinesFromBackend = createServerFn({
	method: "GET",
}).handler(async (): Promise<PublicTontineSummary[]> => {
	const tontines = await fetchPublicTontines();
	return tontines.map((tontine) => {
		// `baseContributionAmount` is the key CycleService.startCycle (and
		// TontineType's own defaultConfiguration fixtures) actually use.
		const rawAmount = tontine.configuration?.baseContributionAmount;
		const rawCurrency = tontine.configuration?.currency;
		return {
			id: tontine.id,
			name: tontine.name,
			frequency: tontine.contributionFrequency,
			memberCount: tontine.participants.length,
			contributionAmount: typeof rawAmount === "number" ? rawAmount : undefined,
			currency: typeof rawCurrency === "string" ? rawCurrency : undefined,
			tontineTypeName: tontine.tontineType.name,
		};
	});
});

export async function listPublicTontines(): Promise<PublicTontineSummary[]> {
	return fetchPublicTontinesFromBackend();
}

export const publicTontineQueries = {
	all: () =>
		queryOptions({
			queryKey: ["public-tontines"] as const,
			queryFn: listPublicTontines,
		}),
};
