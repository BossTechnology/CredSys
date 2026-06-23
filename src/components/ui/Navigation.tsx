"use client";

import { cn }    from "@/lib/utils";
import Image      from "next/image";
import Link       from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  menu: string;
}> = {
  en: {
    signOut: "Sign Out",
    admin: "Admin",
    evaluator: "Evaluator",
    startup: "Startup",
    accelerator: "Accelerator",
    investor: "Investor",
    pendingActivation: "Pending Activation",
    menu: "Menu",
  },
  es: {
    signOut: "Cerrar Sesión",
    admin: "Admin",
    evaluator: "Evaluador",
    startup: "Startup",
    accelerator: "Aceleradora",
    investor: "Inversionista",
    pendingActivation: "Activación Pendiente",
    menu: "Menú",
  },
};

// =============================================
// Shared nav link helper
// =============================================

interface NavLinkProps {
  href:     string;
  label:    string;
  dark?:    boolean;  // true = black bg (admin), false = white bg (portal)
  block?:   boolean;  // true = full-width row in the mobile menu
  onClick?: () => void;
}

function NavLink({ href, label, dark = false, block = false, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const active   = pathname === href || pathname.startsWith(href + "/");

  if (block) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "block text-[13px] font-mono uppercase tracking-widest py-3 px-1 transition-colors",
          dark
            ? active ? "text-white font-bold" : "text-cs-400 hover:text-white"
            : active ? "text-black font-bold" : "text-cs-500 hover:text-black"
        )}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "text-[13px] font-mono uppercase tracking-widest pb-0.5 transition-colors whitespace-nowrap",
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
// Hamburger icon
// =============================================

function MenuIcon({ open, dark }: { open: boolean; dark: boolean }) {
  const color = dark ? "#fff" : "#1A1A1A";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <>
          <path d="M3 6h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 10h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 14h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// =============================================
// Shared responsive nav shell
// =============================================

interface PortalNavShellProps {
  homeHref:  string;
  roleLabel: string;
  navItems:  { label: string; href: string }[];
  dark?:     boolean;
  onSignOut?: () => void;
  signOutLabel: string;
}

function PortalNavShell({
  homeHref, roleLabel, navItems, dark = false, onSignOut, signOutLabel,
}: PortalNavShellProps) {
  const [open, setOpen] = useState(false);

  const navBase = dark
    ? "bg-black"
    : "bg-white border-b border-cs-200";
  const labelColor = dark ? "text-cs-600 border-cs-700" : "text-cs-400 border-cs-200";
  const signOutColor = dark
    ? "text-cs-500 hover:text-white"
    : "text-cs-400 hover:text-black";

  return (
    <nav className={cn("relative z-50 shrink-0", navBase)}>
      {/* Top bar */}
      <div className="h-12 flex items-center px-4 sm:px-7 gap-4 sm:gap-6">
        <Link href={homeHref} className="shrink-0">
          <Image
            src="/logo.png" alt="StartupBoss.org" width={150} height={26}
            className="object-contain w-[124px] sm:w-[150px] h-auto"
            style={dark ? { filter: "invert(1)", mixBlendMode: "screen" } : undefined}
            priority
          />
        </Link>

        <span className={cn(
          "text-[13px] sm:text-[14px] font-mono uppercase tracking-widest border-l pl-3 sm:pl-4 shrink-0",
          labelColor,
        )}>
          {roleLabel}
        </span>

        {/* Desktop links */}
        <div className="hidden md:flex flex-1 items-center gap-5 ml-2">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} dark={dark} />
          ))}
        </div>

        {/* Desktop right cluster */}
        <div className="hidden md:flex items-center gap-5">
          <LangDropdown dark={dark} />
          {onSignOut && (
            <button
              onClick={onSignOut}
              className={cn("text-[12px] font-mono uppercase tracking-widest transition-colors", signOutColor)}
            >
              {signOutLabel}
            </button>
          )}
        </div>

        {/* Mobile: spacer + lang + hamburger */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          <LangDropdown dark={dark} />
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 -mr-2"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <MenuIcon open={open} dark={dark} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className={cn(
          "md:hidden absolute top-12 inset-x-0 border-b px-4 pb-3 pt-1 flex flex-col",
          dark ? "bg-black border-cs-700" : "bg-white border-cs-200 shadow-lg",
        )}>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              dark={dark}
              block
              onClick={() => setOpen(false)}
            />
          ))}
          {onSignOut && (
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className={cn(
                "text-left text-[13px] font-mono uppercase tracking-widest py-3 px-1 border-t mt-1 transition-colors",
                dark ? "text-cs-400 hover:text-white border-cs-700" : "text-cs-500 hover:text-black border-cs-150",
              )}
            >
              {signOutLabel}
            </button>
          )}
        </div>
      )}
    </nav>
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
    <PortalNavShell
      homeHref="/admin/overview"
      roleLabel={t.admin}
      navItems={ADMIN_NAV}
      dark
      onSignOut={onSignOut}
      signOutLabel={t.signOut}
    />
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
    <PortalNavShell
      homeHref="/app/evaluator/dashboard"
      roleLabel={t.evaluator}
      navItems={EVALUATOR_NAV}
      onSignOut={onSignOut}
      signOutLabel={t.signOut}
    />
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
    <PortalNavShell
      homeHref="/app/startup/dashboard"
      roleLabel={t.startup}
      navItems={STARTUP_NAV}
      onSignOut={onSignOut}
      signOutLabel={t.signOut}
    />
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
    <PortalNavShell
      homeHref="/app/accelerator/dashboard"
      roleLabel={t.accelerator}
      navItems={ACCELERATOR_NAV}
      onSignOut={onSignOut}
      signOutLabel={t.signOut}
    />
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
    <PortalNavShell
      homeHref="/app/investor/dashboard"
      roleLabel={t.investor}
      navItems={INVESTOR_NAV}
      onSignOut={onSignOut}
      signOutLabel={t.signOut}
    />
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
    <div className="bg-sb-light border-b border-sb-default px-4 sm:px-7 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[13px] sm:text-[14px] font-mono text-sb-text uppercase tracking-widest font-semibold">
        {t.pendingActivation}
      </span>
      <span className="text-[13px] text-sb-text">{message ?? defaultMsg}</span>
      {role && (
        <span className="text-[14px] font-mono text-sb-dark uppercase tracking-widest sm:ml-auto">
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
      className={cn("flex flex-wrap items-center gap-2 text-[12px] font-mono text-cs-500 uppercase tracking-widest", className)}
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
