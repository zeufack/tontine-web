import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/_userApp/tontines/$tontineId/members",
)({
	component: MembersPage,
});

function MembersPage() {
	return (
		<div>
			<h2 className="text-xl font-semibold">Members</h2>
			<p className="mt-2 text-muted-foreground">
				Member list, roles, invite/manage placeholder.
			</p>
		</div>
	);
}
