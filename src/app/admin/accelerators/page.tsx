import { createServiceClient }  from "@/lib/supabase/service";
import { activateAccelerator }  from "@/app/actions/admin";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminAcceleratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const service = createServiceClient();

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
    <div className="max-w-[960px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Accelerators</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} total · {pending} pending activation
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "All",     href: "/admin/accelerators"               },
            { label: "Pending", href: "/admin/accelerators?filter=pending" },
          ].map((tab) => (
            <a
              key={tab.label}
              href={tab.href}
              className={`text-[12px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
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

      {/* Pending alert */}
      {pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-2.5 mb-6">
          <span className="text-[12px] font-mono font-bold text-yellow-700 uppercase tracking-widest">
            ⚠ {pending} accelerator{pending !== 1 ? "s" : ""} pending activation
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            Accelerator Accounts · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">No accelerators found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {["Organization", "Industry", "Country", "Status", "Actions"].map((h) => (
                <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            <div className="divide-y divide-cs-100">
              {(accelerators ?? []).map((acc) => (
                <div
                  key={acc.id}
                  className={`grid grid-cols-[1fr_120px_100px_90px_100px] gap-4 px-5 py-3 items-center ${
                    !acc.is_active ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <div className="text-[13px] font-semibold">{acc.org_name}</div>
                    <div className="text-[14px] font-mono text-cs-400">{acc.email}</div>
                    <div className="text-[14px] font-mono text-cs-300 mt-0.5">Since {fmt(acc.created_at)}</div>
                  </div>
                  <div className="text-[12px] font-mono text-cs-500 capitalize">{acc.industry ?? "—"}</div>
                  <div className="text-[12px] font-mono text-cs-500">{acc.country ?? "—"}</div>
                  <div>
                    <span className={`text-[14px] font-mono font-bold uppercase tracking-widest ${
                      acc.is_active ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {acc.is_active ? "Active" : "Pending"}
                    </span>
                  </div>
                  <div>
                    <form action={activateAccelerator}>
                      <input type="hidden" name="accelerator_id" value={acc.id} />
                      <input type="hidden" name="deactivate" value={acc.is_active ? "true" : "false"} />
                      <button
                        type="submit"
                        className={`text-[14px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
                          acc.is_active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "btn-primary btn-sm"
                        }`}
                      >
                        {acc.is_active ? "Deactivate" : "Activate"}
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
