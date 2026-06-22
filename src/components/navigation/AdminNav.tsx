"use client";

import { cn }    from "@/lib/utils";
import Image      from "next/image";
import Link       from "next/link";
import { usePathname } from "next/navigation";
import { LangDropdown } from "@/components/ui/LangDropdown";

interface AdminNavProps {
  locale?: string;
  onSignOut?: () => void;
}

const NAV_ITEMS = [
  { label: "Overview",       href: "/admin/overview"       },
  { label: "Startups",       href: "/admin/startups"       },
  { label: "Evaluators",     href: "/admin/evaluators"     },
  { label: "Accelerators",   href: "/admin/accelerators"   },
  { label: "Sponsorships",   href: "/admin/sponsorships"   },
  { label: "Accreditations", href: "/admin/accreditations" },
  { label: "Competitions",   href: "/admin/competitions"   },
  { label: "Cred List",      href: "/admin/cred-list"      },
];

export function AdminNav({ locale, onSignOut }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="h-12 bg-black flex items-center px-7 gap-6 relative z-50">
      <Link href="/admin/overview" className="shrink-0">
        <Image
          src="/logo.png"
          alt="StartupBoss.org"
          width={180}
          height={32}
          className="object-contain"
          style={{ filter: "invert(1)", mixBlendMode: "screen" }}
          priority
        />
      </Link>

      <span className="text-[14px] font-mono text-cs-600 uppercase tracking-widest border-l border-cs-700 pl-4 shrink-0">
        Admin
      </span>

      <div className="flex-1 flex items-center gap-5 ml-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-[13px] font-mono uppercase tracking-widest pb-0.5 transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "text-white border-b border-white font-bold"
                : "text-cs-500 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <LangDropdown dark />

      {onSignOut && (
        <button
          onClick={onSignOut}
          className="text-[12px] font-mono text-cs-500 uppercase tracking-widest hover:text-white transition-colors"
        >
          Sign Out
        </button>
      )}
    </nav>
  );
}
