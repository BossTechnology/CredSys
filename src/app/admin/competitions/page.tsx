import { createServiceClient } from "@/lib/supabase/service";
import { createCompetition }    from "@/app/actions/competitions";
import { getAppDictionary }     from "@/lib/i18n/loader";
import Link                     from "next/link";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_COLOR: Record<string, string> = {
  draft:     "text-cs-400 bg-cs-100",
  active:    "text-green-700 bg-green-50",
  scoring:   "text-yellow-700 bg-yellow-50",
  closed:    "text-cs-400 bg-cs-100",
  completed: "text-sb-default bg-[#1a1030]",
};

const INDUSTRIES = [
  "fintech", "edtech", "healthtech", "agritech",
  "ecommerce", "saas", "cleantech", "logistics", "other",
];

export default async function AdminCompetitionsPage() {
  const { dict } = await getAppDictionary();
  const t = dict.admin;
  const service = createServiceClient();

  const [
    { data: competitions },
    { data: accelerators },
  ] = await Promise.all([
    service
      .from("competitions")
      .select("id, name, description, industry, status, start_date, end_date, accelerator_id, created_at")
      .order("created_at", { ascending: false }),
    service
      .from("accelerators")
      .select("id, org_name")
      .eq("is_active", true),
  ]);

  const total  = competitions?.length ?? 0;
  const active = competitions?.filter((c) => c.status === "active").length ?? 0;

  const accelMap = new Map((accelerators ?? []).map((a) => [a.id, a.org_name]));

  return (
    <div className="max-w-[1000px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-sb-default" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              {t.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.competitions}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} {t.total} · {active} {t.active.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white border border-cs-200 mb-8">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.createCompetition}
          </span>
        </div>
        <form action={createCompetition} className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="cs-label">{t.name} *</label>
            <input name="name" type="text" required className="cs-input" placeholder="Demo Day 2026" />
          </div>
          <div className="col-span-2">
            <label className="cs-label">{t.description}</label>
            <textarea name="description" rows={2} className="cs-input resize-none" placeholder={t.descriptionPH} />
          </div>
          <div>
            <label className="cs-label">Industry</label>
            <select name="industry" className="cs-input">
              <option value="">All industries</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="cs-label">Accelerator</label>
            <select name="accelerator_id" className="cs-input">
              <option value="">None</option>
              {(accelerators ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.org_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="cs-label">Start Date</label>
            <input name="start_date" type="date" className="cs-input" />
          </div>
          <div>
            <label className="cs-label">End Date</label>
            <input name="end_date" type="date" className="cs-input" />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary btn-sm">
              {t.createCompetition}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.competitions} · {total}
          </span>
        </div>
        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noCompetitionsFound}</p>
          </div>
        ) : (
          <div className="divide-y divide-cs-100">
            {(competitions ?? []).map((comp) => (
              <div key={comp.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-bold">{comp.name}</span>
                    <span className={`text-[14px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 ${STATUS_COLOR[comp.status] ?? "text-cs-400 bg-cs-100"}`}>
                      {comp.status === "active" ? t.active : comp.status}
                    </span>
                  </div>
                  <div className="flex gap-5 text-[14px] font-mono text-cs-400">
                    {comp.industry && <span className="uppercase">{comp.industry}</span>}
                    {comp.accelerator_id && <span>{accelMap.get(comp.accelerator_id) ?? "—"}</span>}
                    {comp.start_date && <span>Opens: {fmt(comp.start_date)}</span>}
                    {comp.end_date   && <span>Closes: {fmt(comp.end_date)}</span>}
                  </div>
                </div>
                <Link
                  href={`/admin/competitions/${comp.id}`}
                  className="text-[12px] font-mono text-sb-default hover:underline uppercase tracking-widest shrink-0"
                >
                  {t.manage}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
