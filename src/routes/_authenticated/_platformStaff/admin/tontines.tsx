import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/_platformStaff/admin/tontines",
)({
	component: AdminTontinesPage,
});

function AdminTontinesPage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">All tontines</h1>
			<p className="mt-2 text-muted-foreground">Coming soon.</p>
		</div>
	);
}
