import { createServiceClient }  from "@/lib/supabase/service";
import { activateInvestor, deleteInvestor } from "@/app/actions/admin";
import { DeleteEntityButton }   from "@/components/admin/DeleteEntityButton";
import { EditEmailField }       from "@/components/admin/EditEmailField";
import { getAppDictionary }     from "@/lib/i18n/loader";

export default async function AdminInvestorsPage({
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
    .from("investors")
    .select("id, org_name, email, investment_focus, country, is_active, created_at")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_active", false) as typeof query;
  }

  const { data: investors } = await query;

  const total   = investors?.length ?? 0;
  const pending = investors?.filter((i) => !i.is_active).length ?? 0;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">{t.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.investors}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} {t.total} · {pending} {t.pending}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t.all,     href: "/admin/investors",                value: ""        },
            { label: t.pending, href: "/admin/investors?filter=pending", value: "pending" },
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

      {/* Table */}
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.investors} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noInvestorsFound}</p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[680px] grid-cols-[1fr_140px_100px_90px_110px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.organization, t.investmentFocus, t.country, t.status, t.actions].map((h) => (
                <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(investors ?? []).map((inv) => (
                <div
                  key={inv.id}
                  className={`grid min-w-[680px] grid-cols-[1fr_140px_100px_90px_110px] gap-4 px-5 py-3 items-center ${
                    !inv.is_active ? "bg-yellow-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">{inv.org_name}</div>
                    <EditEmailField
                      table="investors"
                      entityId={inv.id}
                      email={inv.email}
                      editLabel={t.editEmail}
                      saveLabel={t.saveEmail}
                      cancelLabel={t.cancelEdit}
                    />
                    <div className="text-[12px] font-mono text-cs-300 mt-0.5">{t.since} {fmt(inv.created_at)}</div>
                  </div>
                  <div className="text-[12px] font-mono text-cs-500 capitalize truncate">{inv.investment_focus ?? "—"}</div>
                  <div className="text-[12px] font-mono text-cs-500">{inv.country ?? "—"}</div>
                  <div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                      inv.is_active ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {inv.is_active ? t.active : t.pending}
                    </span>
                  </div>
                  <div className="flex flex-col items-start gap-1.5">
                    <form action={activateInvestor}>
                      <input type="hidden" name="investor_id" value={inv.id} />
                      <input type="hidden" name="deactivate" value={inv.is_active ? "true" : "false"} />
                      <button
                        type="submit"
                        className={`text-[11px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
                          inv.is_active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "btn-primary btn-sm"
                        }`}
                      >
                        {inv.is_active ? t.deactivate : t.activate}
                      </button>
                    </form>
                    <DeleteEntityButton
                      action={deleteInvestor}
                      entityId={inv.id}
                      label={t.deleteBtn}
                      confirmLabel={t.confirmDelete}
                    />
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
