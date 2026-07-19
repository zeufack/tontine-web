// TEMP: design-system verification page for the "Design system foundation" step.
// Remove or relocate once real screens exist and this is no longer needed for visual QA.

import { faker } from "@faker-js/faker";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Checkbox } from "#/components/ui/checkbox.tsx";
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
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
	RadioGroup,
	RadioGroupCardItem,
	RadioGroupItem,
} from "#/components/ui/radio-group.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { Stepper } from "#/components/ui/stepper.tsx";
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
import { Textarea } from "#/components/ui/textarea.tsx";

export const Route = createFileRoute("/style-guide")({ component: StyleGuide });

const demoFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Enter a valid email"),
});

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
	const [stepperStep, setStepperStep] = useState(1);

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

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Input, Textarea, Checkbox</h2>
				<div className="flex max-w-sm flex-col gap-4">
					<div className="grid gap-2">
						<Label htmlFor="style-guide-input">Tontine name</Label>
						<Input id="style-guide-input" placeholder="Famille Mbala" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="style-guide-textarea">Note</Label>
						<Textarea
							id="style-guide-textarea"
							placeholder="Optional rejection reason…"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox id="style-guide-checkbox" />
						<Label htmlFor="style-guide-checkbox">
							I confirm this contribution
						</Label>
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Select</h2>
				<Select defaultValue="xaf">
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Currency" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="xaf">XAF</SelectItem>
						<SelectItem value="eur">EUR</SelectItem>
						<SelectItem value="ngn">NGN</SelectItem>
					</SelectContent>
				</Select>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Radio group</h2>
				<RadioGroup defaultValue="member" className="max-w-sm">
					<div className="flex items-center gap-2">
						<RadioGroupItem value="admin" id="style-guide-radio-admin" />
						<Label htmlFor="style-guide-radio-admin">Admin</Label>
					</div>
					<div className="flex items-center gap-2">
						<RadioGroupItem value="member" id="style-guide-radio-member" />
						<Label htmlFor="style-guide-radio-member">Member</Label>
					</div>
				</RadioGroup>

				<RadioGroup defaultValue="rotating" className="grid-cols-3 gap-3">
					<RadioGroupCardItem value="rotating">
						<span className="font-medium">Rotating</span>
						<span className="text-sm text-muted-foreground">
							Fixed order, everyone gets a turn.
						</span>
					</RadioGroupCardItem>
					<RadioGroupCardItem value="lottery">
						<span className="font-medium">Lottery</span>
						<span className="text-sm text-muted-foreground">
							Random draw each cycle.
						</span>
					</RadioGroupCardItem>
					<RadioGroupCardItem value="bidding">
						<span className="font-medium">Bidding</span>
						<span className="text-sm text-muted-foreground">
							Highest bid wins the pot early.
						</span>
					</RadioGroupCardItem>
				</RadioGroup>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Form</h2>
				<DemoForm />
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">Stepper</h2>
				<Stepper
					steps={["Basics", "Strategy", "Invite", "Review"]}
					currentStep={stepperStep}
				/>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => setStepperStep((step) => Math.max(0, step - 1))}
					>
						Back
					</Button>
					<Button
						size="sm"
						onClick={() => setStepperStep((step) => Math.min(3, step + 1))}
					>
						Next
					</Button>
				</div>
			</section>
		</div>
	);
}

function DemoForm() {
	const form = useForm<z.infer<typeof demoFormSchema>>({
		resolver: zodResolver(demoFormSchema),
		defaultValues: { name: "", email: "" },
	});

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(() => toast.success("Form submitted"))}
				className="flex max-w-sm flex-col gap-4"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input placeholder="Your name" {...field} />
							</FormControl>
							<FormDescription>Shown to other members.</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input placeholder="you@example.com" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" size="sm">
					Submit
				</Button>
			</form>
		</Form>
	);
}
