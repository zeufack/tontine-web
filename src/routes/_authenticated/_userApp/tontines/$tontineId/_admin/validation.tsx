import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/_userApp/tontines/$tontineId/_admin/validation",
)({
	component: ValidationPage,
});

function ValidationPage() {
	return (
		<div>
			<h2 className="text-xl font-semibold">Validation</h2>
			<p className="mt-2 text-muted-foreground">
				Pending contributions queue placeholder (admin-only).
			</p>
		</div>
	);
}
