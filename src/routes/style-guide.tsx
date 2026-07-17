// TEMP: design-system verification page for the "Design system foundation" step.
// Remove or relocate once real screens exist and this is no longer needed for visual QA.
import { faker } from "@faker-js/faker";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

import { Amount } from "#/components/ui/amount.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
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
import { Skeleton } from "#/components/ui/skeleton.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/ui/tabs.tsx";

export const Route = createFileRoute("/style-guide")({ component: StyleGuide });

const colorTokens = [
	{ name: "primary", className: "bg-primary" },
	{ name: "secondary", className: "bg-secondary" },
	{ name: "warm-accent", className: "bg-warm-accent" },
	{ name: "success", className: "bg-success" },
	{ name: "warning", className: "bg-warning" },
	{ name: "destructive", className: "bg-destructive" },
	{ name: "muted", className: "bg-muted" },
	{ name: "border", className: "bg-border" },
] as const;

faker.seed(42);
const members = Array.from({ length: 4 }, () => ({
	name: faker.person.fullName(),
	amount: faker.number.int({ min: 5000, max: 250000 }),
}));

function StyleGuide() {
	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-12 p-8">
			<h1 className="text-3xl font-bold">Design system style guide</h1>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Color tokens</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{colorTokens.map((token) => (
						<div key={token.name} className="flex flex-col gap-2">
							<div
								className={`h-16 rounded-lg border border-border ${token.className}`}
							/>
							<span className="text-sm text-muted-foreground">
								{token.name}
							</span>
						</div>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Type scale</h2>
				<p className="text-xs">text-xs — 12px</p>
				<p className="text-sm">text-sm — 14px</p>
				<p className="text-base">text-base — 16px</p>
				<p className="text-lg">text-lg — 20px</p>
				<p className="text-xl">text-xl — 25px</p>
				<p className="text-2xl">text-2xl — 31px</p>
				<p className="text-3xl">text-3xl — 39px</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Button</h2>
				<div className="flex flex-wrap items-center gap-3">
					<Button variant="default">Default</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="destructive">Destructive</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="link">Link</Button>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Button size="sm">Small</Button>
					<Button size="default">Default</Button>
					<Button size="lg">Large</Button>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Badge</h2>
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant="default">Default</Badge>
					<Badge variant="secondary">Secondary</Badge>
					<Badge variant="success">Validated</Badge>
					<Badge variant="warning">Pending</Badge>
					<Badge variant="destructive">Rejected</Badge>
					<Badge variant="outline">Outline</Badge>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Card</h2>
				<Card className="max-w-sm">
					<CardHeader>
						<CardTitle>Family tontine</CardTitle>
						<CardDescription>Pot balance and next payout</CardDescription>
					</CardHeader>
					<CardContent>
						<Amount value={125000} currency="XAF" />
					</CardContent>
					<CardFooter>
						<Button size="sm">View details</Button>
					</CardFooter>
				</Card>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Tabs</h2>
				<Tabs defaultValue="overview" className="max-w-md">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="members">Members</TabsTrigger>
						<TabsTrigger value="cycles">Cycles</TabsTrigger>
					</TabsList>
					<TabsContent value="overview">Overview content.</TabsContent>
					<TabsContent value="members">Members content.</TabsContent>
					<TabsContent value="cycles">Cycles content.</TabsContent>
				</Tabs>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Dialog & Toast</h2>
				<div className="flex flex-wrap gap-3">
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="outline">Open dialog</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Record a contribution</DialogTitle>
								<DialogDescription>
									Confirm the details below.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button>Confirm</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<Button
						variant="outline"
						onClick={() => toast("Contribution recorded")}
					>
						Trigger toast
					</Button>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Table</h2>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Member</TableHead>
							<TableHead className="text-right">Amount</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member.name}>
								<TableCell>{member.name}</TableCell>
								<TableCell className="text-right">
									<Amount value={member.amount} currency="XAF" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Skeleton</h2>
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Amount</h2>
				<div className="flex gap-6">
					<Amount value={45000} currency="XAF" />
					<Amount value={45000} currency="EUR" />
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Empty state</h2>
				<EmptyState
					icon={Wallet}
					title="No contributions yet"
					description="Once a member records a payment, it will show up here."
					action={<Button size="sm">Record a contribution</Button>}
				/>
			</section>
		</div>
	);
}
