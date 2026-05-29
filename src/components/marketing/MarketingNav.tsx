"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link  from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface MarketingNavProps {
  locale: Locale;
  showSignIn?:       boolean;
  showLangDropdown?: boolean;
}

export function MarketingNav({
  locale,
  showSignIn       = true,
  showLangDropdown = false,
}: MarketingNavProps) {
  const isEs = locale === "es";
  const [langOpen, setLangOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="h-14 bg-white border-b border-cs-200 flex items-center px-7 gap-6">
      {/* Logo */}
      <Link href={`/${locale}`} className="shrink-0">
        <Image
          src="/logo.png"
          alt="StartupBoss.org"
          width={220}
          height={40}
          className="object-contain"
          priority
        />
      </Link>

      <div className="flex-1" />

      {/* Language dropdown */}
      {showLangDropdown && (
        <div ref={dropRef} style={{ position: "relative" }}>
          <button
            onClick={() => setLangOpen((o) => !o)}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "4px",
              fontSize:       "13px",
              fontFamily:     "var(--font-body)",
              letterSpacing:  ".03em",
              color:          "#6B6B6B",
              background:     "none",
              border:         "none",
              cursor:         "pointer",
              padding:        "4px 8px",
            }}
          >
            {isEs ? "ES" : "EN"}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {langOpen && (
            <div
              style={{
                position:        "absolute",
                top:             "calc(100% + 8px)",
                right:           0,
                background:      "#fff",
                border:          "1px solid #E0E0E0",
                minWidth:        "80px",
                zIndex:          100,
              }}
            >
              <Link
                href="/en"
                onClick={() => setLangOpen(false)}
                style={{
                  display:        "block",
                  padding:        "8px 16px",
                  fontSize:       "13px",
                  fontFamily:     "var(--font-body)",
                  letterSpacing:  ".03em",
                  color:          locale === "en" ? "rgb(156,139,188)" : "#4A4A4A",
                  textDecoration: "none",
                  fontWeight:     locale === "en" ? 600 : 400,
                }}
              >
                EN
              </Link>
              <Link
                href="/es"
                onClick={() => setLangOpen(false)}
                style={{
                  display:        "block",
                  padding:        "8px 16px",
                  fontSize:       "13px",
                  fontFamily:     "var(--font-body)",
                  letterSpacing:  ".03em",
                  color:          locale === "es" ? "rgb(156,139,188)" : "#4A4A4A",
                  textDecoration: "none",
                  fontWeight:     locale === "es" ? 600 : 400,
                }}
              >
                ES
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Sign In */}
      {showSignIn && (
        <Link
          href={`/${locale}/login`}
          className="text-[13px] font-mono text-cs-500 tracking-[.03em] hover:text-black transition-colors"
        >
          {isEs ? "Iniciar Sesión" : "Sign In"}
        </Link>
      )}
    </nav>
  );
}
