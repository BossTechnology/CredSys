import { createServiceClient }  from "@/lib/supabase/service";
import { activateAccelerator }  from "@/app/actions/admin";
import { getAppDictionary }     from "@/lib/i18n/loader";

export default async function AdminAcceleratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const { locale, dict } = await getAppDictionary();
  const t = dict.admin;
  const service = createServiceClient();

  function fmt(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  let query = service
    .from("accelerators")
    .select("id, org_name, email, industry, country, is_active, created_at")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_active", false) as typeof query;
  }

  const { data: accelerators } = await query;

  const total   = accelerators?.length ?? 0;
  const pending = accelerators?.filter((a) => !a.is_active).length ?? 0;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">{t.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.accelerators}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} {t.total} · {pending} {t.pendingActivationAlert}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t.all,     href: "/admin/accelerators",               value: ""        },
            { label: t.pending, href: "/admin/accelerators?filter=pending", value: "pending" },
          ].map((tab) => (
            <a
              key={tab.value}
              href={tab.href}
              className={`text-[12px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                (filter ?? "") === tab.value
                  ? "bg-black text-white border-black"
                  : "bg-white text-cs-500 border-cs-200 hover:border-black"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      {/* Pending alert */}
      {pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-2.5 mb-6">
          <span className="text-[12px] font-mono font-bold text-yellow-700 uppercase tracking-widest">
            ⚠ {pending} {t.pendingActivationAlert}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.accelerators} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noAcceleratorsFound}</p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[640px] grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.organization, t.industry, t.country, t.status, t.actions].map((h) => (
                <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            <div className="divide-y divide-cs-100">
              {(accelerators ?? []).map((acc) => (
                <div
                  key={acc.id}
                  className={`grid min-w-[640px] grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-3 items-center ${
                    !acc.is_active ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <div className="text-[13px] font-semibold">{acc.org_name}</div>
                    <div className="text-[12px] font-mono text-cs-400">{acc.email}</div>
                    <div className="text-[12px] font-mono text-cs-300 mt-0.5">{t.since} {fmt(acc.created_at)}</div>
                  </div>
                  <div className="text-[12px] font-mono text-cs-500 capitalize">{acc.industry ?? "—"}</div>
                  <div className="text-[12px] font-mono text-cs-500">{acc.country ?? "—"}</div>
                  <div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                      acc.is_active ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {acc.is_active ? t.active : t.pending}
                    </span>
                  </div>
                  <div>
                    <form action={activateAccelerator}>
                      <input type="hidden" name="accelerator_id" value={acc.id} />
                      <input type="hidden" name="deactivate" value={acc.is_active ? "true" : "false"} />
                      <button
                        type="submit"
                        className={`text-[11px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
                          acc.is_active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "btn-primary btn-sm"
                        }`}
                      >
                        {acc.is_active ? t.deactivate : t.activate}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
