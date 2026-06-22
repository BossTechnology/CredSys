"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LangDropdownProps {
  dark?: boolean;
}

export function LangDropdown({ dark = false }: LangDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const locale = pathname.startsWith("/es") ? "es" : "en";

  function targetPath(target: string) {
    if (pathname.startsWith("/en/") || pathname.startsWith("/es/")) {
      return pathname.replace(/^\/(en|es)/, `/${target}`);
    }
    if (pathname === "/en" || pathname === "/es") {
      return `/${target}`;
    }
    document.cookie = `preferred_locale=${target};path=/;max-age=31536000`;
    return pathname;
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const textColor = dark ? "#999" : "#6B6B6B";
  const activeColor = "rgb(156,139,188)";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[12px] font-mono uppercase tracking-widest transition-colors"
        style={{ color: textColor, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
      >
        {locale.toUpperCase()}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: dark ? "#1a1a1a" : "#fff",
            border: `1px solid ${dark ? "#333" : "#E0E0E0"}`,
            minWidth: "72px",
            zIndex: 100,
          }}
        >
          {(["en", "es"] as const).map((lang) => (
            <Link
              key={lang}
              href={targetPath(lang)}
              onClick={() => {
                document.cookie = `preferred_locale=${lang};path=/;max-age=31536000`;
                setOpen(false);
              }}
              style={{
                display: "block",
                padding: "6px 14px",
                fontSize: "12px",
                fontFamily: "var(--font-mono, monospace)",
                letterSpacing: ".08em",
                color: locale === lang ? activeColor : dark ? "#aaa" : "#4A4A4A",
                textDecoration: "none",
                fontWeight: locale === lang ? 600 : 400,
              }}
            >
              {lang.toUpperCase()}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
