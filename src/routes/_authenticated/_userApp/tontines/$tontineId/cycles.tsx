import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/_userApp/tontines/$tontineId/cycles",
)({
	component: CyclesPage,
});

function CyclesPage() {
	return (
		<div>
			<h2 className="text-xl font-semibold">Cycles</h2>
			<p className="mt-2 text-muted-foreground">
				Cycle history and current cycle mechanics placeholder.
			</p>
		</div>
	);
}
