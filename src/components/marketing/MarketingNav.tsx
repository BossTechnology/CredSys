import Image from "next/image";
import Link  from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface MarketingNavProps {
  locale: Locale;
}

export function MarketingNav({ locale }: MarketingNavProps) {
  const isEs = locale === "es";

  return (
    <nav className="h-14 bg-white border-b border-cs-200 flex items-center px-7 gap-6">
      {/* Logo */}
      <Link href={`/${locale}`} className="shrink-0">
        <Image
          src="/StartupBoss_Logo1.png"
          alt="StartupBoss.org"
          width={180}
          height={22}
          className="object-contain"
          priority
        />
      </Link>

      <div className="flex-1" />

      {/* Sign In */}
      <Link
        href={`/${locale}/login`}
        className="text-[8px] font-mono text-cs-500 uppercase tracking-widest hover:text-black transition-colors"
      >
        {isEs ? "Iniciar Sesión" : "Sign In"}
      </Link>
    </nav>
  );
}
