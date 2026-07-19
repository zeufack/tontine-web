// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale

import { cn } from "#/lib/utils.ts";
import { m } from "#/paraglide/messages";
import { getLocale, locales, setLocale } from "#/paraglide/runtime";

type Locale = (typeof locales)[number];

export default function ParaglideLocaleSwitcher({
	onLocaleChange,
}: {
	onLocaleChange?: (locale: Locale) => void;
}) {
	const currentLocale = getLocale();

	return (
		<fieldset className="flex items-center gap-2 border-0 p-0 m-0">
			<legend className="sr-only">{m.language_label()}</legend>
			<span className="text-sm text-muted-foreground">
				{m.current_locale({ locale: currentLocale })}
			</span>
			<div className="flex gap-1">
				{locales.map((locale) => (
					<button
						key={locale}
						type="button"
						onClick={() => {
							setLocale(locale);
							onLocaleChange?.(locale);
						}}
						aria-pressed={locale === currentLocale}
						className={cn(
							"rounded-full border px-3 py-1 text-sm font-medium transition-colors",
							locale === currentLocale
								? "border-primary bg-primary text-primary-foreground"
								: "border-border bg-background text-foreground hover:bg-accent",
						)}
					>
						{locale.toUpperCase()}
					</button>
				))}
			</div>
		</fieldset>
	);
}
