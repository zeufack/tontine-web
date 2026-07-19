import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/_platformStaff/admin/users",
)({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">All users</h1>
			<p className="mt-2 text-muted-foreground">Coming soon.</p>
		</div>
	);
}
