import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { TontineStatusBadge } from "#/components/tontine/tontine-status-badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { EmptyState } from "#/components/ui/empty-state.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { joinTontine, tontineQueries } from "#/features/tontines/api";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/home")({
	validateSearch: (search: Record<string, unknown>) => ({
		unauthorized: search.unauthorized === true,
	}),
	component: DashboardPage,
});

function DashboardPage() {
	const { unauthorized } = Route.useSearch();
	const navigate = useNavigate();
	const { data: tontines, isPending } = useQuery(tontineQueries.mine());

	useEffect(() => {
		if (unauthorized) {
			toast.error("You don't have access to that section.");
			void navigate({
				to: "/app/home",
				search: { unauthorized: undefined },
				replace: true,
			});
		}
	}, [unauthorized, navigate]);

	return (
		<div className="p-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-2xl font-bold">{m.dashboard_title()}</h1>
				<div className="flex gap-2">
					<Button asChild variant="outline" size="sm">
						<Link to="/public-tontines">{m.dashboard_browse_public_cta()}</Link>
					</Button>
					<JoinByIdDialog />
				</div>
			</div>

			{isPending && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			)}

			{!isPending && tontines && tontines.length === 0 && (
				<EmptyState
					className="mt-6"
					icon={Wallet}
					title={m.dashboard_empty_title()}
					description={m.dashboard_empty_description()}
					action={
						<Button asChild size="sm">
							<Link to="/app/tontines/new">{m.dashboard_empty_cta()}</Link>
						</Button>
					}
				/>
			)}

			{!isPending && tontines && tontines.length > 0 && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tontines.map((tontine) => (
						<Card key={tontine.id}>
							<CardHeader>
								<div className="flex items-center justify-between gap-2">
									<CardTitle>{tontine.name}</CardTitle>
									<TontineStatusBadge status={tontine.status} />
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									{m.dashboard_participant_count({
										count: tontine.participantCount,
									})}
								</p>
							</CardContent>
							<CardFooter>
								<Button asChild size="sm">
									<Link
										to="/app/tontines/$tontineId/overview"
										params={{ tontineId: tontine.id }}
									>
										{m.dashboard_view_details_cta()}
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * The only real way today to join a non-public tontine: there's no
 * invitation-code lookup endpoint on the backend (the `invitationCode`
 * field is write-only, set at creation) — `POST /tontines/join` takes the
 * tontine's real id directly, so that's what a private-tontine invite has
 * to share.
 */
function JoinByIdDialog() {
	const [open, setOpen] = useState(false);
	const [tontineId, setTontineId] = useState("");
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const joinMutation = useMutation({
		mutationFn: () => joinTontine(tontineId.trim()),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: ["tontines", "mine"] });
			setOpen(false);
			setTontineId("");
			if (result.status === "active") {
				toast.success(m.join_success_active_generic());
				await navigate({
					to: "/app/tontines/$tontineId/overview",
					params: { tontineId: result.id },
					search: { unauthorized: false, role: undefined },
				});
			} else {
				toast.success(m.join_success_pending());
			}
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : m.join_error());
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">{m.dashboard_join_cta()}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{m.join_by_id_dialog_title()}</DialogTitle>
					<DialogDescription>
						{m.join_by_id_dialog_description()}
					</DialogDescription>
				</DialogHeader>
				<Input
					value={tontineId}
					onChange={(event) => setTontineId(event.target.value)}
					placeholder={m.join_by_id_label()}
				/>
				<DialogFooter>
					<Button
						disabled={!tontineId.trim() || joinMutation.isPending}
						onClick={() => joinMutation.mutate()}
					>
						{m.join_by_id_submit_cta()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
