import { QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				// Network-tolerant baseline per DESIGN.md §1 (2G/3G target market)
				// without over-refetching stable views like Members/Dashboard.
				// Time-sensitive views (validation queue, bidding cycle) override
				// these per-query in their own `queryOptions()` factories instead
				// of loosening the global default.
				staleTime: 60_000,
				retry: 2,
				refetchOnWindowFocus: false,
			},
		},
	});

	return {
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
