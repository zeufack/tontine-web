import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getCurrentSession } from "#/lib/get-session";
import { logoutAction } from "#/lib/session-actions";

export const sessionQueryKey = ["session"] as const;

export function useSession() {
	const { data, isPending } = useQuery({
		queryKey: sessionQueryKey,
		queryFn: () => getCurrentSession(),
	});
	return { data: data ?? null, isPending };
}

export function useSignOut() {
	const queryClient = useQueryClient();
	const router = useRouter();
	return async () => {
		await logoutAction();
		await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		// Re-runs beforeLoad for the currently matched routes so
		// `_authenticated`'s guard sees the cleared session and redirects to
		// /login — invalidating the query alone doesn't affect the route tree.
		await router.invalidate();
	};
}
