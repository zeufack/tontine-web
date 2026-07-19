import { faker } from "@faker-js/faker";
import type {
	Contribution,
	ContributionMethod,
	Cycle,
	Member,
	MembershipRole,
	PayoutStrategy,
	Tontine,
	UserProfile,
} from "#/lib/mock-data/schemas";

faker.seed(42);

/** Stand-in for "the logged-in user" until real multi-user auth exists. */
export const CURRENT_USER_ID = "user-current";

const CONTRIBUTION_METHODS: ContributionMethod[] = [
	"mtn_money",
	"orange_money",
	"bank_transfer",
	"cash",
];

function makeMember(tontineId: string, role: MembershipRole): Member {
	return {
		id: faker.string.uuid(),
		tontineId,
		name: faker.person.fullName(),
		email: faker.internet.email(),
		role,
		joinedAt: faker.date.past({ years: 1 }).toISOString(),
		contributionStreak: faker.number.int({ min: 0, max: 12 }),
	};
}

function makeTontine(
	name: string,
	payoutStrategy: PayoutStrategy,
	contributionAmount: number,
): Tontine {
	return {
		id: faker.string.uuid(),
		name,
		currency: "XAF",
		contributionAmount,
		frequency: "monthly",
		payoutStrategy,
		createdAt: faker.date.past({ years: 1 }).toISOString(),
	};
}

const tontines: Tontine[] = [
	makeTontine("Famille Mbala", "rotating", 25000),
	makeTontine("Amis du Quartier", "lottery", 15000),
	makeTontine("Collègues Bureau", "bidding", 50000),
];

const members: Member[] = tontines.flatMap((tontine, index) => {
	const peers = Array.from({ length: 4 }, () =>
		makeMember(tontine.id, "member"),
	);
	const currentUserMember: Member = {
		id: CURRENT_USER_ID,
		tontineId: tontine.id,
		name: "Vous",
		email: "you@example.com",
		role: index === 0 ? "admin" : "member",
		joinedAt: faker.date.past({ years: 1 }).toISOString(),
		contributionStreak: faker.number.int({ min: 0, max: 12 }),
	};
	return [currentUserMember, ...peers];
});

function membersOf(tontineId: string): Member[] {
	return members.filter((member) => member.tontineId === tontineId);
}

function buildStrategyState(tontine: Tontine): Cycle["strategyState"] {
	const peers = membersOf(tontine.id);
	if (tontine.payoutStrategy === "rotating") {
		return {
			kind: "rotating",
			order: peers.map((member) => ({
				memberId: member.id,
				name: member.name,
			})),
			currentBeneficiaryMemberId: peers[0]?.id ?? CURRENT_USER_ID,
		};
	}
	if (tontine.payoutStrategy === "lottery") {
		return {
			kind: "lottery",
			eligibleMemberIds: peers.map((member) => member.id),
			drawDate: faker.date.soon({ days: 7 }).toISOString(),
			pastDraws: [
				{
					cycleNumber: 1,
					winnerMemberId: peers[peers.length - 1]?.id ?? CURRENT_USER_ID,
					drawnAt: faker.date.past({ years: 1 }).toISOString(),
				},
			],
		};
	}
	return {
		kind: "bidding",
		currentHighestBid: Math.round(tontine.contributionAmount * 0.15),
		currentHighestBidderMemberId: peers[1]?.id ?? null,
		deadline: faker.date.soon({ days: 3 }).toISOString(),
		history: [
			{
				memberId: peers[1]?.id ?? CURRENT_USER_ID,
				amount: Math.round(tontine.contributionAmount * 0.15),
				submittedAt: faker.date.recent({ days: 1 }).toISOString(),
			},
		],
	};
}

const cycles: Cycle[] = tontines.map((tontine) => ({
	id: faker.string.uuid(),
	tontineId: tontine.id,
	number: 2,
	potTotal: tontine.contributionAmount * 3,
	status: "active",
	strategyState: buildStrategyState(tontine),
}));

const cycleHistory: Cycle[] = tontines.map((tontine) => ({
	id: faker.string.uuid(),
	tontineId: tontine.id,
	number: 1,
	potTotal: tontine.contributionAmount * membersOf(tontine.id).length,
	status: "closed",
	strategyState: buildStrategyState(tontine),
}));

const contributions: Contribution[] = tontines.flatMap((tontine) => {
	const cycle = cycles.find((c) => c.tontineId === tontine.id);
	if (!cycle) return [];
	const peers = membersOf(tontine.id);
	return peers.slice(0, 3).map((member, index) => ({
		id: faker.string.uuid(),
		tontineId: tontine.id,
		cycleId: cycle.id,
		memberId: member.id,
		amount: tontine.contributionAmount,
		method: CONTRIBUTION_METHODS[index % CONTRIBUTION_METHODS.length],
		status: index === 0 ? "pending" : "validated",
		reference: faker.string.alphanumeric(10).toUpperCase(),
		submittedAt: faker.date.recent({ days: 10 }).toISOString(),
		resolvedAt:
			index === 0 ? undefined : faker.date.recent({ days: 5 }).toISOString(),
	}));
});

const profiles: Record<string, UserProfile> = {
	[CURRENT_USER_ID]: {
		id: CURRENT_USER_ID,
		name: "Vous",
		email: "you@example.com",
		locale: "fr",
		mobileMoneyNumbers: [{ provider: "mtn_money", number: "+237 6XX XXX XXX" }],
	},
};

export const mockStore = {
	tontines,
	members,
	cycles,
	cycleHistory,
	contributions,
	profiles,
};

export function findTontine(tontineId: string): Tontine | undefined {
	return tontines.find((tontine) => tontine.id === tontineId);
}

export function findMembership(
	tontineId: string,
	userId: string,
): Member | undefined {
	return members.find(
		(member) => member.tontineId === tontineId && member.id === userId,
	);
}

export function recordContribution(input: {
	tontineId: string;
	memberId: string;
	amount: number;
	method: ContributionMethod;
	reference?: string;
	receiptFileName?: string;
}): Contribution {
	const cycle = cycles.find((c) => c.tontineId === input.tontineId);
	const contribution: Contribution = {
		id: faker.string.uuid(),
		tontineId: input.tontineId,
		cycleId: cycle?.id ?? faker.string.uuid(),
		memberId: input.memberId,
		amount: input.amount,
		method: input.method,
		status: "pending",
		reference: input.reference,
		receiptFileName: input.receiptFileName,
		submittedAt: new Date().toISOString(),
	};
	contributions.push(contribution);
	return contribution;
}

export function validateContribution(
	contributionId: string,
	note?: string,
): Contribution {
	const contribution = contributions.find((c) => c.id === contributionId);
	if (!contribution)
		throw new Error(`Contribution not found: ${contributionId}`);
	contribution.status = "validated";
	contribution.resolvedAt = new Date().toISOString();
	contribution.resolutionNote = note;
	const cycle = cycles.find((c) => c.id === contribution.cycleId);
	if (cycle) cycle.potTotal += contribution.amount;
	return contribution;
}

export function rejectContribution(
	contributionId: string,
	note?: string,
): Contribution {
	const contribution = contributions.find((c) => c.id === contributionId);
	if (!contribution)
		throw new Error(`Contribution not found: ${contributionId}`);
	contribution.status = "rejected";
	contribution.resolvedAt = new Date().toISOString();
	contribution.resolutionNote = note;
	return contribution;
}

export function createTontine(input: {
	name: string;
	currency: string;
	contributionAmount: number;
	frequency: Tontine["frequency"];
	payoutStrategy: PayoutStrategy;
}): Tontine {
	const tontine: Tontine = {
		id: faker.string.uuid(),
		name: input.name,
		currency: input.currency,
		contributionAmount: input.contributionAmount,
		frequency: input.frequency,
		payoutStrategy: input.payoutStrategy,
		createdAt: new Date().toISOString(),
	};
	tontines.push(tontine);
	const owner: Member = {
		id: CURRENT_USER_ID,
		tontineId: tontine.id,
		name: "Vous",
		email: "you@example.com",
		role: "admin",
		joinedAt: tontine.createdAt,
		contributionStreak: 0,
	};
	members.push(owner);
	cycles.push({
		id: faker.string.uuid(),
		tontineId: tontine.id,
		number: 1,
		potTotal: 0,
		status: "active",
		strategyState: buildStrategyState(tontine),
	});
	return tontine;
}

export function submitBid(
	cycleId: string,
	memberId: string,
	amount: number,
): Cycle {
	const cycle = cycles.find((c) => c.id === cycleId);
	if (!cycle) throw new Error(`Cycle not found: ${cycleId}`);
	if (cycle.strategyState.kind !== "bidding") {
		throw new Error("Bids can only be submitted on a bidding-strategy cycle");
	}
	cycle.strategyState.history.push({
		memberId,
		amount,
		submittedAt: new Date().toISOString(),
	});
	if (
		cycle.strategyState.currentHighestBid === null ||
		amount > cycle.strategyState.currentHighestBid
	) {
		cycle.strategyState.currentHighestBid = amount;
		cycle.strategyState.currentHighestBidderMemberId = memberId;
	}
	return cycle;
}

export function inviteMember(tontineId: string, email: string): Member {
	const member: Member = {
		id: faker.string.uuid(),
		tontineId,
		name: faker.person.fullName(),
		email,
		role: "member",
		joinedAt: new Date().toISOString(),
		contributionStreak: 0,
	};
	members.push(member);
	return member;
}

export function removeMember(tontineId: string, memberId: string): void {
	const index = members.findIndex(
		(member) => member.tontineId === tontineId && member.id === memberId,
	);
	if (index !== -1) members.splice(index, 1);
}

export function promoteMember(tontineId: string, memberId: string): Member {
	const member = members.find(
		(m) => m.tontineId === tontineId && m.id === memberId,
	);
	if (!member) throw new Error(`Member not found: ${memberId}`);
	member.role = "admin";
	return member;
}

export function updateProfile(
	userId: string,
	patch: Partial<UserProfile>,
): UserProfile {
	const existing = profiles[userId];
	if (!existing) throw new Error(`Profile not found: ${userId}`);
	profiles[userId] = { ...existing, ...patch };
	return profiles[userId];
}
