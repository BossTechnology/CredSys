"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
        "text-[8px] font-mono uppercase tracking-widest pb-0.5 transition-colors",
        dark
          ? active
            ? "text-white border-b border-white font-bold"
            : "text-cs-500 hover:text-white"
          : active
          ? "text-black border-b border-black font-bold"
          : "text-cs-500 hover:text-black"
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

interface AdminNavProps { onSignOut?: () => void }

export function AdminNav({ onSignOut }: AdminNavProps) {
  return (
    <nav className="h-12 bg-black flex items-center px-7 gap-6 shrink-0">
      <Link
        href="/admin/overview"
        className="text-sm font-bold tracking-tight text-white shrink-0"
      >
        StartupBoss.org
      </Link>
      <span className="text-[7px] font-mono text-cs-600 uppercase tracking-widest border-l border-cs-700 pl-4 shrink-0">
        Admin
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} dark />
        ))}
      </div>
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[7.5px] font-mono text-cs-500 uppercase tracking-widest hover:text-white transition-colors"
        >
          Sign Out
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

interface EvaluatorNavProps { onSignOut?: () => void }

export function EvaluatorNav({ onSignOut }: EvaluatorNavProps) {
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link
        href="/app/evaluator/dashboard"
        className="text-sm font-bold tracking-tight text-black shrink-0"
      >
        StartupBoss.org
      </Link>
      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        Evaluator
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {EVALUATOR_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
        >
          Sign Out
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

interface StartupNavProps { onSignOut?: () => void }

export function StartupNav({ onSignOut }: StartupNavProps) {
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link
        href="/app/startup/dashboard"
        className="text-sm font-bold tracking-tight text-black shrink-0"
      >
        StartupBoss.org
      </Link>
      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        Startup
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {STARTUP_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
        >
          Sign Out
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

interface AcceleratorNavProps { onSignOut?: () => void }

export function AcceleratorNav({ onSignOut }: AcceleratorNavProps) {
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link
        href="/app/accelerator/dashboard"
        className="text-sm font-bold tracking-tight text-black shrink-0"
      >
        StartupBoss.org
      </Link>
      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        Accelerator
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {ACCELERATOR_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
        >
          Sign Out
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

interface InvestorNavProps { onSignOut?: () => void }

export function InvestorNav({ onSignOut }: InvestorNavProps) {
  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-6 shrink-0">
      <Link href="/app/investor/dashboard" className="text-sm font-bold tracking-tight text-black shrink-0">
        StartupBoss.org
      </Link>
      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4 shrink-0">
        Investor
      </span>
      <div className="flex-1 flex items-center gap-5 ml-2">
        {INVESTOR_NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
      {onSignOut && (
        <button onClick={onSignOut} className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors">
          Sign Out
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
}

export function PendingBanner({
  role,
  message = "Your account is pending activation by an administrator.",
}: PendingBannerProps) {
  return (
    <div className="bg-sb-light border-b border-sb-default px-7 py-2 flex items-center gap-3">
      <span className="text-[7px] font-mono text-sb-text uppercase tracking-widest font-semibold">
        Pending Activation
      </span>
      <span className="text-[8px] text-sb-text">{message}</span>
      {role && (
        <span className="text-[7px] font-mono text-sb-dark uppercase tracking-widest ml-auto">
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
      className={cn("flex items-center gap-2 text-[7.5px] font-mono text-cs-500 uppercase tracking-widest", className)}
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
