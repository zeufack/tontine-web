import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users2 } from "lucide-react";
import { toast } from "sonner";

import { Amount } from "#/components/ui/amount.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { EmptyState } from "#/components/ui/empty-state.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import {
	type PublicTontineSummary,
	publicTontineQueries,
} from "#/features/public-tontines/api";
import { joinTontine } from "#/features/tontines/api";
import type { ContributionFrequency } from "#/lib/backend-client/tontines";
import { useSession } from "#/lib/session-client";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/public-tontines")({
	component: PublicTontinesPage,
});

const FREQUENCY_LABEL: Record<ContributionFrequency, () => string> = {
	daily: m.frequency_daily,
	weekly: m.frequency_weekly,
	biweekly: m.frequency_biweekly,
	monthly: m.frequency_monthly,
	quarterly: m.frequency_quarterly,
	yearly: m.frequency_yearly,
	custom: m.frequency_custom,
};

function PublicTontinesPage() {
	const { data: tontines, isPending } = useQuery(publicTontineQueries.all());
	const { data: session } = useSession();

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">{m.public_tontines_title()}</h1>
					<p className="text-sm text-muted-foreground">
						{m.public_tontines_description()}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button asChild variant="outline" size="sm">
						<Link to="/login" search={{ redirect: "/public-tontines" }}>
							{m.public_tontines_login_cta()}
						</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/register">{m.public_tontines_register_cta()}</Link>
					</Button>
				</div>
			</div>

			{isPending && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			)}

			{!isPending && tontines && tontines.length === 0 && (
				<EmptyState icon={Users2} title={m.public_tontines_empty()} />
			)}

			{!isPending && tontines && tontines.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tontines.map((tontine) => (
						<PublicTontineCard
							key={tontine.id}
							tontine={tontine}
							isAuthenticated={!!session}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function PublicTontineCard({
	tontine,
	isAuthenticated,
}: {
	tontine: PublicTontineSummary;
	isAuthenticated: boolean;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const joinMutation = useMutation({
		mutationFn: () => joinTontine(tontine.id),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: ["tontines", "mine"] });
			if (result.status === "active") {
				toast.success(m.join_success_active({ name: tontine.name }));
				await navigate({
					to: "/app/tontines/$tontineId/overview",
					params: { tontineId: tontine.id },
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
		<Card>
			<CardHeader>
				<CardTitle>{tontine.name}</CardTitle>
				<Badge variant="secondary">
					{FREQUENCY_LABEL[tontine.frequency]()}
				</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-1">
				{tontine.contributionAmount !== undefined && tontine.currency && (
					<Amount
						value={tontine.contributionAmount}
						currency={tontine.currency}
					/>
				)}
				<p className="text-sm text-muted-foreground">
					{m.public_tontines_member_count({ count: tontine.memberCount })}
				</p>
			</CardContent>
			<CardFooter>
				{isAuthenticated ? (
					<Button
						size="sm"
						disabled={joinMutation.isPending}
						onClick={() => joinMutation.mutate()}
					>
						{m.join_cta()}
					</Button>
				) : (
					<Button asChild size="sm" variant="outline">
						<Link to="/login" search={{ redirect: "/public-tontines" }}>
							{m.public_tontines_login_cta()}
						</Link>
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
