import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">Profile</h1>
			<p className="mt-2 text-muted-foreground">
				User profile and locale preference placeholder.
			</p>
		</div>
	);
}
