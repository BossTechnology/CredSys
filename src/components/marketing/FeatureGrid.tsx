interface FeatureGridProps {
  dict: {
    howItWorksTitle: string;
    step1Title:      string;
    step1Desc:       string;
    step2Title:      string;
    step2Desc:       string;
    step3Title:      string;
    step3Desc:       string;
  };
}

const STEPS = [
  { num: "01", titleKey: "step1Title" as const, descKey: "step1Desc" as const },
  { num: "02", titleKey: "step2Title" as const, descKey: "step2Desc" as const },
  { num: "03", titleKey: "step3Title" as const, descKey: "step3Desc" as const },
];

export function FeatureGrid({ dict }: FeatureGridProps) {
  return (
    <section className="border-b border-cs-200 bg-cs-50">
      <div className="max-w-[1280px] mx-auto px-7 py-16">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px flex-1 bg-cs-200 max-w-[40px]" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {dict.howItWorksTitle}
          </span>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-cs-200">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`p-8 ${i < STEPS.length - 1 ? "border-b md:border-b-0 md:border-r border-cs-200" : ""}`}
            >
              {/* Step number */}
              <div className="text-[40px] font-bold text-cs-100 leading-none mb-6 font-mono">
                {step.num}
              </div>

              {/* Purple accent line */}
              <div className="w-8 h-0.5 bg-sb-default mb-4" />

              {/* Title */}
              <h3 className="text-base font-bold tracking-tight mb-2">
                {dict[step.titleKey]}
              </h3>

              {/* Description */}
              <p className="text-[14px] text-cs-500 leading-relaxed">
                {dict[step.descKey]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
