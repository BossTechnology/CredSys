"use client";

import Image       from "next/image";
import Link        from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { LangDropdown } from "@/components/ui/LangDropdown";

interface MarketingNavProps {
  locale: Locale;
  showSignIn?: boolean;
}

export function MarketingNav({
  locale,
  showSignIn = true,
}: MarketingNavProps) {
  const isEs = locale === "es";

  return (
    <nav className="h-14 bg-white border-b border-cs-200 flex items-center px-7 gap-6">
      <Link href={`/${locale}`} className="shrink-0">
        <Image
          src="/logo.png"
          alt="StartupBoss.org"
          width={220}
          height={40}
          className="object-contain"
          priority
        />
      </Link>

      <div className="flex-1" />

      <LangDropdown />

      {showSignIn && (
        <Link
          href={`/${locale}/login`}
          className="text-[13px] font-mono text-cs-500 tracking-[.03em] hover:text-black transition-colors"
        >
          {isEs ? "Iniciar Sesión" : "Sign In"}
        </Link>
      )}
    </nav>
  );
}
