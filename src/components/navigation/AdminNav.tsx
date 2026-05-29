"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavProps {
  onSignOut?: () => void;
}

const NAV_ITEMS = [
  { label: "Overview",       href: "/admin/overview"       },
  { label: "Evaluators",     href: "/admin/evaluators"     },
  { label: "Accelerators",   href: "/admin/accelerators"   },
  { label: "Sponsorships",   href: "/admin/sponsorships"   },
  { label: "Accreditations", href: "/admin/accreditations" },
  { label: "Competitions",   href: "/admin/competitions"   },
  { label: "Cred List",      href: "/admin/cred-list"      },
];

export function AdminNav({ onSignOut }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="h-12 bg-black flex items-center px-7 gap-6">
      <Link href="/admin/overview" className="shrink-0 text-white text-[15px] font-mono tracking-tight">
        StartupBoss.org
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
