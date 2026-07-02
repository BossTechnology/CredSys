"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

interface LangDropdownProps {
  dark?: boolean;
}

function getCookieLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/preferred_locale=(en|es)/);
  return (match?.[1] as "en" | "es") ?? "en";
}

export function LangDropdown({ dark = false }: LangDropdownProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasLocalePrefix = /^\/(en|es)(\/|$)/.test(pathname);
  const localeFromUrl = pathname.startsWith("/es") ? "es" : "en";
  const [locale, setLocale] = useState<"en" | "es">(hasLocalePrefix ? localeFromUrl : "en");

  useEffect(() => {
    if (!hasLocalePrefix) {
      setLocale(getCookieLocale());
    } else {
      setLocale(localeFromUrl);
    }
  }, [hasLocalePrefix, localeFromUrl]);

  const handleLangChange = useCallback((lang: "en" | "es") => {
    document.cookie = `preferred_locale=${lang};path=/;max-age=31536000`;
    setLocale(lang);
    setOpen(false);

    if (hasLocalePrefix) {
      const newPath = pathname.replace(/^\/(en|es)/, `/${lang}`);
      router.push(newPath);
    } else {
      router.refresh();
    }
  }, [pathname, hasLocalePrefix, router]);

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
        style={{ color: textColor, background: "none", border: "none", padding: "4px 8px" }}
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
            <button
              key={lang}
              onClick={() => handleLangChange(lang)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 14px",
                fontSize: "12px",
                fontFamily: "var(--font-mono, monospace)",
                letterSpacing: ".08em",
                color: locale === lang ? activeColor : dark ? "#aaa" : "#4A4A4A",
                background: "none",
                border: "none",
                fontWeight: locale === lang ? 600 : 400,
              }}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
