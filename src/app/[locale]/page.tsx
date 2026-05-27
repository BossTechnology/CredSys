import { getDictionary } from "@/lib/i18n/loader";
import { isValidLocale }  from "@/lib/i18n/types";
import { redirect }       from "next/navigation";
import { MarketingNav }   from "@/components/marketing/MarketingNav";
import { HeroSection }    from "@/components/marketing/HeroSection";
import { FeatureGrid }    from "@/components/marketing/FeatureGrid";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect("/en");
  }

  const dict = await getDictionary(locale);

  return (
    <>
      <MarketingNav
        locale={locale}
        dict={{ nav: dict.nav }}
      />
      <main>
        <HeroSection
          locale={locale}
          dict={{
            heroTitle:    dict.home.heroTitle,
            heroSubtitle: dict.home.heroSubtitle,
            ctaPrimary:   dict.home.ctaPrimary,
            ctaSecondary: dict.home.ctaSecondary,
          }}
        />
        <FeatureGrid
          dict={{
            howItWorksTitle: dict.home.howItWorksTitle,
            step1Title:      dict.home.step1Title,
            step1Desc:       dict.home.step1Desc,
            step2Title:      dict.home.step2Title,
            step2Desc:       dict.home.step2Desc,
            step3Title:      dict.home.step3Title,
            step3Desc:       dict.home.step3Desc,
          }}
        />
      </main>
    </>
  );
}
