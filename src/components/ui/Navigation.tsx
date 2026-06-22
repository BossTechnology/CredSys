"use client";

import { cn }    from "@/lib/utils";
import Image      from "next/image";
import Link       from "next/link";
import { usePathname } from "next/navigation";
import { LangDropdown } from "@/components/ui/LangDropdown";
import type { Locale } from "@/lib/i18n/types";

// =============================================
// Inline nav dict — minimal translations for client components
// =============================================

const NAV_DICT: Record<Locale, {
  signOut: string;
  admin: string;
  evaluator: string;
  startup: string;
  accelerator: string;
  investor: string;
  pendingActivation: string;
}> = {
  en: {
    signOut: "Sign Out",
    admin: "Admin",
    evaluator: "Evaluator",
    startup: "Startup",
    accelerator: "Accelerator",
    investor: "Investor",
    pendingActivation: "Pending Activation",
  },
  es: {
    signOut: "Cerrar Sesión",
    admin: "Admin",
    evaluator: "Evaluador",
    startup: "Startup",
    accelerator: "Aceleradora",
    investor: "Inversionista",
    pendingActivation: "Activación Pendiente",
  },
};

// =============================================
// Shared nav link helper
// =============================================

interface NavLinkProps {
  href:     string;
  label:    string;
  dark?:    boolean;  // true = black bg (admin), false = white bg (portal)
}

function NavLink({ href, label, dark = false }: NavLinkProps) {
  const pathname = usePathname();
  const active   = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "text-[13px] font-mono uppercase tracking-widest pb-0.5 transition-colors",
        dark
          ? active
            ? "text-white border-b border-white font-bold"
            : "text-cs-500 hover:text-cs-btn"
          : active
          ? "text-black border-b-2 border-black font-bold"
          : "text-cs-500 hover:text-cs-btn"
      )}
    >
      {label}
    </Link>
  );
}

// =============================================
// AdminNav
// =============================================

const ADMIN_NAV = [
  { label: "Overview",      href: "/admin/overview"      },
  { label: "Evaluators",    href: "/admin/evaluators"    },
  { label: "Accreditations",href: "/admin/accreditations"},
  { label: "Competitions",  href: "/admin/competitions"  },
  { label: "Startups",      href: "/admin/startups"      },
  { label: "Cred List",     href: "/admin/cred-list"     },
];

interface AdminNavProps { onSignOut?: () => void; locale?: Locale }

export function AdminNav({ onSignOut, locale = "en" }: AdminNavProps) {
  const t = NAV_DICT[locale];
  return (
    <nav className="h-12 bg-black flex items-center px-7 gap-6 shrink-0">
      <Link href="/admin/overview" className="shrink-0">
        <Image src="/logo.png" alt="StartupBoss.org" width={160} height={28}
               className="object-contain"
               style={{ filter: "invert(1)", mixBlendMode: "screen" }}
               priority />
      </Link>
      <span className="text-[14px] font-mono text-cs-600 uppercase tracking-widest border-l border-cs-700 pl-4 shrink-0">
        {t.admin}
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} dark />
        ))}
      </div>
      <LangDropdown dark />
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[12px] font-mono text-cs-500 uppercase tracking-widest hover:text-white transition-colors"
        >
          {t.signOut}
        </button>
      )}
    </nav>
  );
}

// =============================================
// EvaluatorNav
// =============================================

const EVALUATOR_NAV = [
  { label: "Dashboard",    href: "/app/evaluator/dashboard"    },
  { label: "Assignments",  href: "/app/evaluator/assignments"  },
  { label: "Scoring",      href: "/app/evaluator/scoring"      },
  { label: "Profile",      href: "/app/evaluator/profile"      },
];

interface EvaluatorNavProps { onSignOut?: () => void; locale?: Locale }

export function EvaluatorNav({ onSignOut, locale = "en" }: EvaluatorNavProps) {
  const t = NAV_DICT[locale];
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link href="/app/evaluator/dashboard" className="shrink-0">
        <Image src="/logo.png" alt="StartupBoss.org" width={160} height={28}
               className="object-contain" priority />
      </Link>
      <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        {t.evaluator}
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {EVALUATOR_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      <LangDropdown />
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
        >
          {t.signOut}
        </button>
      )}
    </nav>
  );
}

// =============================================
// StartupNav
// =============================================

const STARTUP_NAV = [
  { label: "Dashboard",     href: "/app/startup/dashboard"     },
  { label: "Accreditation", href: "/app/startup/accreditation" },
  { label: "Competitions",  href: "/app/startup/competitions"  },
  { label: "Profile",       href: "/app/startup/profile"       },
];

interface StartupNavProps { onSignOut?: () => void; locale?: Locale }

export function StartupNav({ onSignOut, locale = "en" }: StartupNavProps) {
  const t = NAV_DICT[locale];
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link href="/app/startup/dashboard" className="shrink-0">
        <Image src="/logo.png" alt="StartupBoss.org" width={160} height={28}
               className="object-contain" priority />
      </Link>
      <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        {t.startup}
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {STARTUP_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      <LangDropdown />
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
        >
          {t.signOut}
        </button>
      )}
    </nav>
  );
}

// =============================================
// AcceleratorNav
// =============================================

const ACCELERATOR_NAV = [
  { label: "Dashboard",    href: "/app/accelerator/dashboard"    },
  { label: "Portfolio",    href: "/app/accelerator/portfolio"    },
  { label: "Competitions", href: "/app/accelerator/competitions" },
  { label: "Profile",      href: "/app/accelerator/profile"      },
];

interface AcceleratorNavProps { onSignOut?: () => void; locale?: Locale }

export function AcceleratorNav({ onSignOut, locale = "en" }: AcceleratorNavProps) {
  const t = NAV_DICT[locale];
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link href="/app/accelerator/dashboard" className="shrink-0">
        <Image src="/logo.png" alt="StartupBoss.org" width={160} height={28}
               className="object-contain" priority />
      </Link>
      <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        {t.accelerator}
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {ACCELERATOR_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      <LangDropdown />
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
        >
          {t.signOut}
        </button>
      )}
    </nav>
  );
}

// =============================================
// InvestorNav
// =============================================

const INVESTOR_NAV = [
  { label: "Dashboard", href: "/app/investor/dashboard" },
  { label: "Watchlist", href: "/app/investor/watchlist" },
  { label: "Sponsor",   href: "/app/investor/sponsor"   },
  { label: "Profile",   href: "/app/investor/profile"   },
];

interface InvestorNavProps { onSignOut?: () => void; locale?: Locale }

export function InvestorNav({ onSignOut, locale = "en" }: InvestorNavProps) {
  const t = NAV_DICT[locale];
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link href="/app/investor/dashboard" className="shrink-0">
        <Image src="/logo.png" alt="StartupBoss.org" width={160} height={28}
               className="object-contain" priority />
      </Link>
      <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        {t.investor}
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {INVESTOR_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      <LangDropdown />
      {onSignOut && (
        <button onClick={onSignOut} className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors">
          {t.signOut}
        </button>
      )}
    </nav>
  );
}

// =============================================
// PendingBanner — shown when account awaits activation
// =============================================

interface PendingBannerProps {
  role?: string;
  message?: string;
  locale?: Locale;
}

export function PendingBanner({
  role,
  message,
  locale = "en",
}: PendingBannerProps) {
  const t = NAV_DICT[locale];
  const defaultMsg = locale === "es"
    ? "Tu cuenta está pendiente de activación por un administrador."
    : "Your account is pending activation by an administrator.";

  return (
    <div className="bg-sb-light border-b border-sb-default px-7 py-2 flex items-center gap-3">
      <span className="text-[14px] font-mono text-sb-text uppercase tracking-widest font-semibold">
        {t.pendingActivation}
      </span>
      <span className="text-[13px] text-sb-text">{message ?? defaultMsg}</span>
      {role && (
        <span className="text-[14px] font-mono text-sb-dark uppercase tracking-widest ml-auto">
          {role}
        </span>
      )}
    </div>
  );
}

// =============================================
// Breadcrumb
// =============================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items:      BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-2 text-[12px] font-mono text-cs-500 uppercase tracking-widest", className)}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-cs-300">/</span>}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="hover:text-black transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? "text-black font-bold" : ""}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

// =============================================
// PortalNav — legacy alias for StartupNav
// =============================================
export { StartupNav as PortalNav };
