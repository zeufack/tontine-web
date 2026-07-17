import { cn } from "#/lib/utils.ts";
import { getLocale } from "#/paraglide/runtime";

type AmountProps = {
	value: number;
	currency: string;
	locale?: string;
	className?: string;
};

function Amount({ value, currency, locale, className }: AmountProps) {
	const formatted = new Intl.NumberFormat(locale ?? getLocale(), {
		style: "currency",
		currency,
	}).format(value);

	return (
		<span className={cn("font-medium tabular-nums", className)}>
			{formatted}
		</span>
	);
}

export { Amount };
