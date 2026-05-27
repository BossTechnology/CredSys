import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/types";
import { redirect } from "next/navigation";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params:   Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "es" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:       "CredSys — StartupBoss Accreditation",
    description: "GetCRED. Build Trust. Become Unstoppable.",
    alternates: {
      canonical: `https://startupboss.org/${locale}`,
      languages: {
        en: "https://startupboss.org/en",
        es: "https://startupboss.org/es",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect("/en");
  }

  return <>{children}</>;
}
