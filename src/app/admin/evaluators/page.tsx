import { createServiceClient } from "@/lib/supabase/service";
import { activateEvaluator }   from "@/app/actions/admin";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminEvaluatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const service = createServiceClient();

  let query = service
    .from("evaluators")
    .select("id, org_name, email, industry, country, is_active, created_at")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_active", false) as typeof query;
  }

  const { data: evaluators } = await query;

  const total   = evaluators?.length ?? 0;
  const pending = evaluators?.filter((e) => !e.is_active).length ?? 0;

  return (
    <div className="max-w-[960px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluators</h1>
          <p className="text-[8px] font-mono text-cs-400 mt-1">
            {total} total · {pending} pending activation
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "All",     href: "/admin/evaluators"             },
            { label: "Pending", href: "/admin/evaluators?filter=pending" },
          ].map((tab) => (
            <a
              key={tab.label}
              href={tab.href}
              className={`text-[7.5px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                (filter === "pending") === (tab.label === "Pending")
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
          <span className="text-[7.5px] font-mono font-bold text-yellow-700 uppercase tracking-widest">
            ⚠ {pending} evaluator{pending !== 1 ? "s" : ""} pending activation
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest">
            Evaluator Accounts · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[8px] font-mono text-cs-400">No evaluators found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {["Organization", "Industry", "Country", "Status", "Actions"].map((h) => (
                <div key={h} className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(evaluators ?? []).map((ev) => (
                <div
                  key={ev.id}
                  className={`grid grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-3 items-center ${
                    !ev.is_active ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <div className="text-[8px] font-semibold">{ev.org_name}</div>
                    <div className="text-[7px] font-mono text-cs-400">{ev.email}</div>
                    <div className="text-[6.5px] font-mono text-cs-300 mt-0.5">Since {fmt(ev.created_at)}</div>
                  </div>
                  <div className="text-[7.5px] font-mono text-cs-500 capitalize">{ev.industry ?? "—"}</div>
                  <div className="text-[7.5px] font-mono text-cs-500">{ev.country ?? "—"}</div>
                  <div>
                    <span className={`text-[7px] font-mono font-bold uppercase tracking-widest ${
                      ev.is_active ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {ev.is_active ? "Active" : "Pending"}
                    </span>
                  </div>
                  <div>
                    <form action={activateEvaluator}>
                      <input type="hidden" name="evaluator_id" value={ev.id} />
                      {!ev.is_active && (
                        <input type="hidden" name="deactivate" value="false" />
                      )}
                      {ev.is_active && (
                        <input type="hidden" name="deactivate" value="true" />
                      )}
                      <button
                        type="submit"
                        className={`text-[7px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
                          ev.is_active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "btn-primary btn-sm"
                        }`}
                      >
                        {ev.is_active ? "Deactivate" : "Activate"}
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
