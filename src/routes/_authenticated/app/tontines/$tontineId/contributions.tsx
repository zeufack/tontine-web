import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/contributions",
)({
	component: ContributionsPage,
});

function ContributionsPage() {
	return (
		<div>
			<h2 className="text-xl font-semibold">Contributions</h2>
			<p className="mt-2 text-muted-foreground">
				My contribution history + record-a-contribution action placeholder.
			</p>
		</div>
	);
}
