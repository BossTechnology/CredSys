import { cookies } from "next/headers";
import type { Locale } from "./types";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export async function getAppLocale(): Promise<Locale> {
  const jar = await cookies();
  const pref = jar.get("preferred_locale")?.value;
  if (pref === "es") return "es";
  return "en";
}

export async function getAppDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getAppLocale();
  const dict = await getDictionary(locale);
  return { locale, dict };
}
