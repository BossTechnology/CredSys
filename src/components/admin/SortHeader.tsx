import Link from "next/link";

interface SortHeaderProps {
  label:  string;
  href:   string;
  active: boolean;
  dir:    "asc" | "desc";
}

export function SortHeader({ label, href, active, dir }: SortHeaderProps) {
  return (
    <Link
      href={href}
      className={`text-[11px] font-mono uppercase tracking-widest flex items-center gap-1 transition-colors ${
        active ? "text-black" : "text-cs-400 hover:text-cs-600"
      }`}
    >
      {label}
      <span className={`text-[9px] ${active ? "opacity-100" : "opacity-0"}`}>
        {dir === "asc" ? "▲" : "▼"}
      </span>
    </Link>
  );
}
