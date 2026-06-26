import { createServiceClient } from "@/lib/supabase/service";
import { getAppDictionary }    from "@/lib/i18n/loader";
import { activateEvaluator, deleteEvaluator }   from "@/app/actions/admin";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { TestToggle } from "@/components/admin/TestToggle";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function AdminEvaluatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const { locale, dict } = await getAppDictionary();
  const t = dict.admin;

  function fmt(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  const service = createServiceClient();

  let query = service
    .from("evaluators")
    .select("id, org_name, email, industry, country, is_active, created_at, is_test")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_active", false) as typeof query;
  }
  if (filter === "test") {
    query = query.eq("is_test", true) as typeof query;
  } else if (filter === "hide_test") {
    query = query.eq("is_test", false) as typeof query;
  }

  const { data: evaluators } = await query;

  const total   = evaluators?.length ?? 0;
  const pending = evaluators?.filter((e) => !e.is_active).length ?? 0;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">{t.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.evaluators}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} {t.total} · {pending} {t.pendingActivationCount}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t.all,            href: "/admin/evaluators",                value: ""        },
            { label: t.pending,        href: "/admin/evaluators?filter=pending", value: "pending" },
            { label: t.filterHideTest,  href: "/admin/evaluators?filter=hide_test", value: "hide_test" },
            { label: t.filterTestOnly, href: "/admin/evaluators?filter=test",    value: "test"    },
          ].map((tab) => (
            <a
              key={tab.label}
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

      {/* Alert */}
      {pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-2.5 mb-6">
          <span className="text-[12px] font-mono font-bold text-yellow-700 uppercase tracking-widest">
            ⚠ {pending} {t.evalPendingAlert}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.evaluators} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noEvaluatorsFound}</p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[640px] grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.organization, t.industry, t.country, t.status, t.actions].map((h) => (
                <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(evaluators ?? []).map((ev) => (
                <div
                  key={ev.id}
                  className={`grid min-w-[640px] grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-3 items-center ${
                    !ev.is_active ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold">{ev.org_name}</div>
                      {ev.is_test && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
                      )}
                    </div>
                    <div className="text-[12px] font-mono text-cs-400">{ev.email}</div>
                    <div className="text-[12px] font-mono text-cs-300 mt-0.5">{t.since} {fmt(ev.created_at)}</div>
                  </div>
                  <div className="text-[12px] font-mono text-cs-500 capitalize">{ev.industry ?? "—"}</div>
                  <div className="text-[12px] font-mono text-cs-500">{ev.country ?? "—"}</div>
                  <div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                      ev.is_active ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {ev.is_active ? t.active : t.pending}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <form action={activateEvaluator}>
                      <input type="hidden" name="evaluator_id" value={ev.id} />
                      {!ev.is_active && (
                        <input type="hidden" name="deactivate" value="false" />
                      )}
                      {ev.is_active && (
                        <input type="hidden" name="deactivate" value="true" />
                      )}
                      <SubmitButton
                        label={ev.is_active ? t.deactivate : t.activate}
                        className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
                          ev.is_active
                            ? "text-red-500 hover:text-red-700"
                            : "text-emerald-600 hover:text-emerald-800"
                        }`}
                      />
                    </form>
                    <TestToggle
                      table="evaluators"
                      entityId={ev.id}
                      isTest={ev.is_test}
                      markLabel={t.markTest}
                      unmarkLabel={t.unmarkTest}
                    />
                    <DeleteEntityButton
                      action={deleteEvaluator}
                      entityId={ev.id}
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
