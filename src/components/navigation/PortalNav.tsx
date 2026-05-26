"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

interface PortalNavProps {
  portalLabel: string;
  orgName?: string;
  items: NavItem[];
  onSignOut?: () => void;
}

export function PortalNav({ portalLabel, orgName, items, onSignOut }: PortalNavProps) {
  const pathname = usePathname();

  return (
    <nav className="h-12 bg-white border-b border-cs-200 flex items-center px-7 gap-8">
      {/* Logo */}
      <Link href="/" className="text-sm font-bold tracking-tight text-black shrink-0">
        StartupBoss.org
      </Link>

      {/* Portal label */}
      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 pl-4">
        {portalLabel}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Nav items */}
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-[8px] font-mono uppercase tracking-widest pb-0.5 transition-colors",
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "text-black border-b-2 border-black font-bold"
              : "text-cs-500 hover:text-black"
          )}
        >
          {item.label}
        </Link>
      ))}

      {/* Org name + sign out */}
      {orgName && (
        <span className="text-[7.5px] font-mono text-cs-500 border-l border-cs-200 pl-4">
          {orgName}
        </span>
      )}
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
