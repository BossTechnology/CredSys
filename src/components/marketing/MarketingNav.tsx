import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface MarketingNavProps {
  locale:   Locale;
  dict:     {
    nav: {
      home: string;
      howItWorks: string;
      credList: string;
      login: string;
      signup: string;
    };
  };
}

export function MarketingNav({ locale, dict }: MarketingNavProps) {
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6">
      <Link
        href={`/${locale}`}
        className="text-sm font-bold tracking-tight text-black shrink-0"
      >
        StartupBoss.org
      </Link>

      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        CredSys
      </span>

      <div className="flex-1 flex items-center gap-5 ml-2">
        <Link href={`/${locale}/how-it-works`} className="text-[8px] font-mono text-cs-500 uppercase tracking-widest hover:text-black transition-colors">
          {dict.nav.howItWorks}
        </Link>
        <Link href={`/${locale}/cred-list`} className="text-[8px] font-mono text-cs-500 uppercase tracking-widest hover:text-black transition-colors">
          {dict.nav.credList}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/login`}
          className="text-[8px] font-mono text-cs-500 uppercase tracking-widest hover:text-black transition-colors"
        >
          {dict.nav.login}
        </Link>
        <Link
          href={`/${locale}/getcred`}
          className="bg-black text-white text-[8px] font-mono uppercase tracking-widest px-4 py-2 hover:opacity-80 transition-opacity"
        >
          {dict.nav.signup}
        </Link>
      </div>
    </nav>
  );
}
