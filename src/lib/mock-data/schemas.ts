import { z } from "zod";

export const payoutStrategySchema = z.enum(["rotating", "lottery", "bidding"]);
export type PayoutStrategy = z.infer<typeof payoutStrategySchema>;

export const membershipRoleSchema = z.enum(["admin", "member"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const membershipSchema = z.object({
	role: membershipRoleSchema,
});
export type Membership = z.infer<typeof membershipSchema>;

export const tontineFrequencySchema = z.enum(["weekly", "biweekly", "monthly"]);
export type TontineFrequency = z.infer<typeof tontineFrequencySchema>;

// Matches the real backend's TontineStatus enum (see DESIGN.md §11) — richer
// than a simple active/inactive flag.
export const tontineStatusSchema = z.enum([
	"draft",
	"active",
	"paused",
	"completed",
	"cancelled",
]);
export type TontineStatus = z.infer<typeof tontineStatusSchema>;

export const tontineSchema = z.object({
	id: z.string(),
	name: z.string(),
	currency: z.string().length(3),
	contributionAmount: z.number().positive(),
	frequency: tontineFrequencySchema,
	payoutStrategy: payoutStrategySchema,
	status: tontineStatusSchema,
	createdAt: z.string(),
});
export type Tontine = z.infer<typeof tontineSchema>;

const cycleMemberRefSchema = z.object({
	memberId: z.string(),
	name: z.string(),
});

export const rotatingStrategyStateSchema = z.object({
	kind: z.literal("rotating"),
	order: z.array(cycleMemberRefSchema),
	currentBeneficiaryMemberId: z.string(),
});

export const lotteryStrategyStateSchema = z.object({
	kind: z.literal("lottery"),
	eligibleMemberIds: z.array(z.string()),
	drawDate: z.string().nullable(),
	pastDraws: z.array(
		z.object({
			cycleNumber: z.number().int().positive(),
			winnerMemberId: z.string(),
			drawnAt: z.string(),
		}),
	),
});

export const biddingStrategyStateSchema = z.object({
	kind: z.literal("bidding"),
	currentHighestBid: z.number().positive().nullable(),
	currentHighestBidderMemberId: z.string().nullable(),
	deadline: z.string(),
	history: z.array(
		z.object({
			memberId: z.string(),
			amount: z.number().positive(),
			submittedAt: z.string(),
		}),
	),
});

export const cycleStrategyStateSchema = z.discriminatedUnion("kind", [
	rotatingStrategyStateSchema,
	lotteryStrategyStateSchema,
	biddingStrategyStateSchema,
]);
export type CycleStrategyState = z.infer<typeof cycleStrategyStateSchema>;

export const cycleStatusSchema = z.enum(["active", "closed"]);
export type CycleStatus = z.infer<typeof cycleStatusSchema>;

export const cycleSchema = z.object({
	id: z.string(),
	tontineId: z.string(),
	number: z.number().int().positive(),
	potTotal: z.number().nonnegative(),
	status: cycleStatusSchema,
	strategyState: cycleStrategyStateSchema,
});
export type Cycle = z.infer<typeof cycleSchema>;

export const contributionMethodSchema = z.enum([
	"mtn_money",
	"orange_money",
	"bank_transfer",
	"cash",
]);
export type ContributionMethod = z.infer<typeof contributionMethodSchema>;

export const contributionStatusSchema = z.enum([
	"pending",
	"validated",
	"rejected",
]);
export type ContributionStatus = z.infer<typeof contributionStatusSchema>;

export const contributionSchema = z.object({
	id: z.string(),
	tontineId: z.string(),
	cycleId: z.string(),
	memberId: z.string(),
	amount: z.number().positive(),
	method: contributionMethodSchema,
	status: contributionStatusSchema,
	reference: z.string().optional(),
	receiptFileName: z.string().optional(),
	submittedAt: z.string(),
	resolvedAt: z.string().optional(),
	resolutionNote: z.string().optional(),
});
export type Contribution = z.infer<typeof contributionSchema>;

export const memberSchema = z.object({
	id: z.string(),
	tontineId: z.string(),
	name: z.string(),
	email: z.string().email(),
	role: membershipRoleSchema,
	joinedAt: z.string(),
	contributionStreak: z.number().int().nonnegative(),
});
export type Member = z.infer<typeof memberSchema>;

export const platformTontineSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	memberCount: z.number().int().nonnegative(),
	potTotal: z.number().nonnegative(),
	payoutStrategy: payoutStrategySchema,
});
export type PlatformTontineSummary = z.infer<
	typeof platformTontineSummarySchema
>;

export const platformUserSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	tontineCount: z.number().int().nonnegative(),
});
export type PlatformUserSummary = z.infer<typeof platformUserSummarySchema>;

export const platformStatsSchema = z.object({
	totalTontines: z.number().int().nonnegative(),
	totalUsers: z.number().int().nonnegative(),
	totalPotValue: z.number().nonnegative(),
});
export type PlatformStats = z.infer<typeof platformStatsSchema>;

export const userProfileSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	locale: z.enum(["fr", "en"]),
	mobileMoneyNumbers: z.array(
		z.object({
			provider: z.enum(["mtn_money", "orange_money"]),
			number: z.string(),
		}),
	),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
