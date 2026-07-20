import { useSession, useSignOut } from "#/lib/session-client";

export default function SessionHeader() {
	const { data: session, isPending } = useSession();
	const signOut = useSignOut();

	if (isPending) {
		return (
			<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
		);
	}

	if (session?.user) {
		const initials =
			`${session.user.firstName?.charAt(0) ?? ""}${session.user.lastName?.charAt(0) ?? ""}`.toUpperCase() ||
			"U";

		return (
			<div className="flex items-center gap-2">
				<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
					<span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
						{initials}
					</span>
				</div>
				<button
					type="button"
					onClick={() => {
						signOut().catch((error) => {
							console.error("Sign out failed", error);
						});
					}}
					className="flex-1 h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
				>
					Sign out
				</button>
			</div>
		);
	}

	return null;
}
