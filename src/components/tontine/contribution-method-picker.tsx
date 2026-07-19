import {
	Banknote,
	CreditCard,
	Landmark,
	MoreHorizontal,
	Smartphone,
	Wallet,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	RadioGroup,
	RadioGroupCardItem,
} from "#/components/ui/radio-group.tsx";
import type { ContributionMethod } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

// Order reflects market priority (mobile money primary) per DESIGN.md §9.
// This component is the pluggable seam for a future real payment-gateway
// integration — only this component and its submit handler should need to
// change when that lands.
const METHOD_ORDER: ContributionMethod[] = [
	"mobile_money",
	"bank_transfer",
	"cash",
	"credit_card",
	"digital_wallet",
	"other",
];

const METHOD_ICON: Record<
	ContributionMethod,
	ComponentType<{ className?: string }>
> = {
	mobile_money: Smartphone,
	bank_transfer: Landmark,
	cash: Banknote,
	credit_card: CreditCard,
	digital_wallet: Wallet,
	other: MoreHorizontal,
};

export const CONTRIBUTION_METHOD_LABEL: Record<
	ContributionMethod,
	() => string
> = {
	mobile_money: m.contribution_method_mobile_money,
	bank_transfer: m.contribution_method_bank_transfer,
	cash: m.contribution_method_cash,
	credit_card: m.contribution_method_credit_card,
	digital_wallet: m.contribution_method_digital_wallet,
	other: m.contribution_method_other,
};

export function ContributionMethodPicker({
	value,
	onChange,
}: {
	value: ContributionMethod;
	onChange: (value: ContributionMethod) => void;
}) {
	return (
		<RadioGroup
			value={value}
			onValueChange={onChange}
			className="grid-cols-2 gap-2 sm:grid-cols-3"
		>
			{METHOD_ORDER.map((method) => {
				const Icon = METHOD_ICON[method];
				return (
					<RadioGroupCardItem
						key={method}
						value={method}
						className="flex-row items-center gap-2 p-3"
					>
						<Icon className="size-4 shrink-0" />
						<span className="text-sm">
							{CONTRIBUTION_METHOD_LABEL[method]()}
						</span>
					</RadioGroupCardItem>
				);
			})}
		</RadioGroup>
	);
}
