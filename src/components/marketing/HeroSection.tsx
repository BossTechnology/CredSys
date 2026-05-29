import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface HeroSectionProps {
  locale: Locale;
  dict: {
    heroTitle:    string;
    heroSubtitle: string;
    ctaPrimary:   string;
    ctaSecondary: string;
  };
}

export function HeroSection({ locale, dict }: HeroSectionProps) {
  return (
    <section className="border-b border-cs-200 bg-white">
      {/* Black accent strip */}
      <div className="bg-black px-7 py-1">
        <span className="text-[14px] font-mono text-sb-default uppercase tracking-widest">
          GetCRED · Build Trust · Become Unstoppable
        </span>
      </div>

      <div className="max-w-[1280px] mx-auto px-7 py-16">
        <div className="max-w-[620px]">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-sb-default" />
            <span className="text-[13px] font-mono text-sb-text uppercase tracking-widest font-semibold">
              CredSys — Accreditation Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            {dict.heroTitle}
          </h1>

          {/* Subtext */}
          <p className="text-sm text-cs-600 leading-relaxed mb-8 max-w-[480px]">
            {dict.heroSubtitle}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/getcred`}
              className="bg-black text-white text-[13px] font-mono font-semibold uppercase tracking-widest px-6 py-3 hover:opacity-80 transition-opacity"
            >
              {dict.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/cred-list`}
              className="border border-cs-300 text-black text-[13px] font-mono uppercase tracking-widest px-6 py-3 hover:border-black transition-colors"
            >
              {dict.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
