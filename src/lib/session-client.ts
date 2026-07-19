import { useQuery, useQueryClient } from "@tanstack/react-query";
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
	return async () => {
		await logoutAction();
		await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
	};
}
