import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { getAppDictionary }    from "@/lib/i18n/loader";

const STATUS_COLOR: Record<string, string> = {
  draft:   "bg-cs-100 text-cs-500",
  active:  "bg-green-50 text-green-700",
  scoring: "bg-yellow-50 text-yellow-700",
  closed:  "bg-cs-100 text-cs-400",
};

export default async function AcceleratorCompetitionsPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.accelComps;
  const statusDict = dict.status as Record<string, string>;

  function fmt(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: "numeric",
    });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { data: userProfile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!userProfile?.entity_id) redirect("/en/login");

  const { data: competitions } = await service
    .from("competitions")
    .select("id, name, description, industry, status, start_date, end_date, created_at")
    .eq("accelerator_id", userProfile.entity_id)
    .order("created_at", { ascending: false });

  const total = competitions?.length ?? 0;

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.portal}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          {total} {t.linked}
        </p>
      </div>

      {/* List */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.yourCompetitions} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] font-mono text-cs-400">
              {t.noCompetitions}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cs-100">
            {competitions!.map((comp) => {
              const statusLabel = statusDict[comp.status] ?? comp.status;
              const statusColor = STATUS_COLOR[comp.status] ?? "bg-cs-100 text-cs-400";

              return (
                <div key={comp.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-bold">{comp.name}</span>
                        <span className={`text-[14px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      {comp.description && (
                        <p className="text-[12px] font-mono text-cs-500 mb-2 leading-relaxed">
                          {comp.description}
                        </p>
                      )}
                      <div className="flex items-center gap-5 text-[14px] font-mono text-cs-400">
                        {comp.industry && (
                          <span className="uppercase tracking-widest">{comp.industry}</span>
                        )}
                        {comp.start_date && (
                          <span>{t.start}: {fmt(comp.start_date)}</span>
                        )}
                        {comp.end_date && (
                          <span>{t.end}: {fmt(comp.end_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
