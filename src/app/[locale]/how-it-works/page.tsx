import { getDictionary } from "@/lib/i18n/loader";
import { isValidLocale }  from "@/lib/i18n/types";
import { redirect }       from "next/navigation";
import { MarketingNav }   from "@/components/marketing/MarketingNav";
import { FeatureGrid }    from "@/components/marketing/FeatureGrid";
import Link               from "next/link";

interface HowItWorksPageProps {
  params: Promise<{ locale: string }>;
}

const CHASS1S_CRITERIA = [
  {
    code:  "C",
    label: "Commitment",
    desc:  "Does the team demonstrate long-term dedication to the mission and resilience under pressure?",
  },
  {
    code:  "H",
    label: "Honesty",
    desc:  "Is the team transparent about their current stage, risks, and limitations?",
  },
  {
    code:  "A",
    label: "Accountability",
    desc:  "Do founders take ownership of results, timelines, and stakeholder expectations?",
  },
  {
    code:  "S",
    label: "Scalability",
    desc:  "Does the business model have the structural capacity to grow beyond the founding team?",
  },
  {
    code:  "S",
    label: "Sustainability",
    desc:  "Is there a credible path to profitability or long-term mission viability?",
  },
  {
    code:  "1",
    label: "One Clear Problem",
    desc:  "Does the startup solve a single, well-defined problem with measurable impact?",
  },
  {
    code:  "S",
    label: "Solution Fit",
    desc:  "Is the solution a strong match for the identified problem, with evidence of traction or validation?",
  },
];

export default async function HowItWorksPage({ params }: HowItWorksPageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect("/en");
  }

  const dict = await getDictionary(locale);

  return (
    <>
      <MarketingNav locale={locale} dict={{ nav: dict.nav }} />

      <main>
        {/* Hero */}
        <section className="border-b border-cs-200 bg-white">
          <div className="bg-black px-7 py-1">
            <span className="text-[7px] font-mono text-sb-default uppercase tracking-widest">
              GetCRED · Build Trust · Become Unstoppable
            </span>
          </div>

          <div className="max-w-[1280px] mx-auto px-7 py-16">
            <div className="max-w-[620px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-sb-default" />
                <span className="text-[8px] font-mono text-sb-text uppercase tracking-widest font-semibold">
                  The Process
                </span>
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight mb-4">
                How CRED Works
              </h1>
              <p className="text-sm text-cs-600 leading-relaxed max-w-[480px]">
                CredSys uses a structured evaluation framework to assess startups against
                seven criteria. Accredited startups receive a verifiable credential ID
                they can share with investors, partners, and accelerators.
              </p>
            </div>
          </div>
        </section>

        {/* 3-step overview */}
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

        {/* CHASS1S Framework */}
        <section className="border-b border-cs-200 bg-white">
          <div className="max-w-[1280px] mx-auto px-7 py-16">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-px flex-1 bg-cs-200 max-w-[40px]" />
              <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest">
                The CHASS1S Framework
              </span>
            </div>

            <div className="max-w-[800px]">
              <p className="text-sm text-cs-600 leading-relaxed mb-10">
                Every accreditation request is evaluated against seven criteria.
                Each criterion is scored by an expert evaluator with domain experience
                in your industry.
              </p>

              <div className="flex flex-col gap-0 border border-cs-200">
                {CHASS1S_CRITERIA.map((item, i) => (
                  <div
                    key={`${item.code}-${i}`}
                    className={`flex gap-6 p-6 ${i < CHASS1S_CRITERIA.length - 1 ? "border-b border-cs-200" : ""}`}
                  >
                    <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
                      <span className="text-sb-default text-sm font-bold font-mono">
                        {item.code}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight mb-1">
                        {item.label}
                      </h3>
                      <p className="text-[11px] text-cs-500 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-black">
          <div className="max-w-[1280px] mx-auto px-7 py-14 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <h2 className="text-white text-2xl font-bold tracking-tight mb-2">
                Ready to get accredited?
              </h2>
              <p className="text-cs-400 text-sm">
                Submit your startup and start the CRED process today.
              </p>
            </div>
            <Link
              href={`/${locale}/getcred`}
              className="bg-white text-black text-[8px] font-mono font-semibold uppercase tracking-widest px-8 py-4 hover:opacity-80 transition-opacity shrink-0"
            >
              Apply Now
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
