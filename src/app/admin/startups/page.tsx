import { createServiceClient } from "@/lib/supabase/service";
import Link                    from "next/link";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  pending_evaluator_assignment: "text-yellow-600 bg-yellow-50",
  evaluator_assigned:           "text-blue-600 bg-blue-50",
  meeting_scheduled:            "text-blue-600 bg-blue-50",
  chass1s_shared:               "text-blue-600 bg-blue-50",
  implementation_in_progress:   "text-blue-600 bg-blue-50",
  ready_for_verification:       "text-purple-600 bg-purple-50",
  verification_in_progress:     "text-purple-600 bg-purple-50",
  accredited:                   "text-sb-default bg-[#1a1030]",
  rejected:                     "text-red-600 bg-red-50",
  expired:                      "text-cs-400 bg-cs-100",
};

const FILTERS = [
  { label: "All",            value: ""             },
  { label: "With Request",   value: "with_request"  },
  { label: "No Request",     value: "no_request"    },
  { label: "Accredited",     value: "accredited"    },
];

export default async function AdminStartupsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const service = createServiceClient();

  const { data: startups } = await service
    .from("startups")
    .select("id, org_name, email, industry, country, website, stage, team_size, logo_url, created_at")
    .order("created_at", { ascending: false });

  const startupIds = (startups ?? []).map((s) => s.id);

  const { data: requests } = startupIds.length > 0
    ? await service
        .from("accreditation_requests")
        .select("id, startup_id, status, created_at, updated_at")
        .in("startup_id", startupIds)
    : { data: [] };

  const requestMap = new Map(
    (requests ?? []).map((r) => [r.startup_id, r]),
  );

  let filtered = (startups ?? []).map((s) => ({
    ...s,
    request: requestMap.get(s.id) ?? null,
  }));

  if (filter === "with_request") {
    filtered = filtered.filter((s) => s.request !== null);
  } else if (filter === "no_request") {
    filtered = filtered.filter((s) => s.request === null);
  } else if (filter === "accredited") {
    filtered = filtered.filter((s) => s.request?.status === "accredited");
  }

  const total = filtered.length;

  return (
    <div className="max-w-[1060px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Startups</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} startup{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((tab) => (
            <a
              key={tab.label}
              href={tab.value ? `/admin/startups?filter=${tab.value}` : "/admin/startups"}
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
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            Startups · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">No startups found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px_100px_140px_80px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {["Startup", "Industry", "Country", "Status", "Joined"].map((h) => (
                <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[1fr_100px_100px_140px_80px] gap-4 px-5 py-3 items-center"
                >
                  {/* Startup name + email */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {s.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.logo_url}
                          alt=""
                          className="w-6 h-6 object-contain shrink-0 border border-cs-200"
                        />
                      )}
                      <div className="text-[13px] font-semibold truncate">{s.org_name}</div>
                    </div>
                    <div className="text-[14px] font-mono text-cs-400 truncate">{s.email}</div>
                  </div>

                  {/* Industry */}
                  <div className="text-[12px] font-mono text-cs-500 capitalize">
                    {s.industry ?? "—"}
                  </div>

                  {/* Country */}
                  <div className="text-[12px] font-mono text-cs-500">
                    {s.country ?? "—"}
                  </div>

                  {/* Status */}
                  <div>
                    {s.request ? (
                      <Link
                        href={`/admin/accreditations`}
                        className={`text-[14px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 ${
                          STATUS_COLOR[s.request.status] ?? "text-cs-400 bg-cs-100"
                        }`}
                      >
                        {s.request.status.replace(/_/g, " ")}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-mono text-cs-300 uppercase tracking-widest px-1.5 py-0.5 bg-cs-50">
                        No request
                      </span>
                    )}
                  </div>

                  {/* Joined date */}
                  <div className="text-[14px] font-mono text-cs-400">{fmt(s.created_at)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
