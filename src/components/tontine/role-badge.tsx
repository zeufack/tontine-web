import { Badge } from "#/components/ui/badge.tsx";
import type { MembershipRole } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

const ROLE_VARIANT: Record<MembershipRole, "default" | "outline"> = {
	admin: "default",
	member: "outline",
};

const ROLE_LABEL: Record<MembershipRole, () => string> = {
	admin: m.role_admin,
	member: m.role_member,
};

export function RoleBadge({ role }: { role: MembershipRole }) {
	return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]()}</Badge>;
}
