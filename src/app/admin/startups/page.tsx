import { createServiceClient } from "@/lib/supabase/service";
import { getAppDictionary }    from "@/lib/i18n/loader";
import { resendSetupLink, deleteStartup } from "@/app/actions/admin";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { EditEmailField }     from "@/components/admin/EditEmailField";
import Link                    from "next/link";

const STATUS_COLOR: Record<string, string> = {
  pending_evaluator_assignment: "text-amber-700 bg-amber-50 border border-amber-200",
  evaluator_assigned:           "text-blue-700 bg-blue-50 border border-blue-200",
  meeting_scheduled:            "text-blue-700 bg-blue-50 border border-blue-200",
  chass1s_shared:               "text-blue-700 bg-blue-50 border border-blue-200",
  implementation_in_progress:   "text-blue-700 bg-blue-50 border border-blue-200",
  ready_for_verification:       "text-violet-700 bg-violet-50 border border-violet-200",
  verification_in_progress:     "text-violet-700 bg-violet-50 border border-violet-200",
  accredited:                   "text-white bg-black border border-black",
  rejected:                     "text-red-700 bg-red-50 border border-red-200",
  expired:                      "text-cs-500 bg-cs-100 border border-cs-200",
};

const ACCOUNT_BADGE: Record<string, string> = {
  activated: "text-emerald-700 bg-emerald-50 border border-emerald-200",
  pending:   "text-amber-700 bg-amber-50 border border-amber-200",
  expired:   "text-red-700 bg-red-50 border border-red-200",
  no_token:  "text-cs-500 bg-cs-100 border border-cs-200",
};

export default async function AdminStartupsPage({
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

  const FILTERS = [
    { label: t.all,          value: ""             },
    { label: t.withRequest,  value: "with_request"  },
    { label: t.noRequest,    value: "no_request"    },
    { label: t.accredited,   value: "accredited"    },
  ];

  const service = createServiceClient();

  const { data: startups } = await service
    .from("startups")
    .select("id, org_name, email, industry, country, website, stage, team_size, logo_url, created_at")
    .order("created_at", { ascending: false });

  const startupIds = (startups ?? []).map((s) => s.id);

  const [{ data: requests }, { data: tokens }] = await Promise.all([
    startupIds.length > 0
      ? service
          .from("accreditation_requests")
          .select("id, startup_id, status, created_at, updated_at")
          .in("startup_id", startupIds)
      : { data: [] as { id: string; startup_id: string; status: string; created_at: string; updated_at: string }[] },
    startupIds.length > 0
      ? service
          .from("account_setup_tokens")
          .select("entity_id, email, used_at, expires_at, created_at")
          .eq("role", "startup")
          .in("entity_id", startupIds)
          .order("created_at", { ascending: false })
      : { data: [] as { entity_id: string; email: string; used_at: string | null; expires_at: string; created_at: string }[] },
  ]);

  const requestMap = new Map(
    (requests ?? []).map((r) => [r.startup_id, r]),
  );

  // Use the most recent token per startup
  const tokenMap = new Map<string, { used_at: string | null; expires_at: string; created_at: string }>();
  for (const t of tokens ?? []) {
    if (!tokenMap.has(t.entity_id)) {
      tokenMap.set(t.entity_id, t);
    }
  }

  function accountStatus(startupId: string): "activated" | "pending" | "expired" | "no_token" {
    const token = tokenMap.get(startupId);
    if (!token) return "no_token";
    if (token.used_at) return "activated";
    if (new Date(token.expires_at) < new Date()) return "expired";
    return "pending";
  }

  let filtered = (startups ?? []).map((s) => ({
    ...s,
    request: requestMap.get(s.id) ?? null,
    account: accountStatus(s.id),
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
    <div className="max-w-[1120px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">{t.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.startups}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {total} {t.registered}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.startups} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noStartupsFound}</p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[680px] grid-cols-[1fr_90px_110px_140px_110px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.startup, t.joined, t.account, t.accreditation, t.actions].map((h) => (
                <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {filtered.map((s) => {
                const canResend = s.account === "pending" || s.account === "expired" || s.account === "no_token";

                return (
                  <div
                    key={s.id}
                    className="grid min-w-[680px] grid-cols-[1fr_90px_110px_140px_110px] gap-4 px-5 py-3 items-center"
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
                        <div className="text-[12px] font-semibold truncate">{s.org_name}</div>
                      </div>
                      <EditEmailField
                        table="startups"
                        entityId={s.id}
                        email={s.email}
                        editLabel={t.editEmail}
                        saveLabel={t.saveEmail}
                        cancelLabel={t.cancelEdit}
                      />
                      <div className="text-[12px] font-mono text-cs-400">
                        {s.country ?? ""}{s.country && s.industry ? " · " : ""}{s.industry ?? ""}
                      </div>
                    </div>

                    {/* Joined date */}
                    <div className="text-[12px] font-mono text-cs-500">
                      {fmt(s.created_at)}
                    </div>

                    {/* Account status */}
                    <div>
                      <span className={`text-[11px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                        ACCOUNT_BADGE[s.account]
                      }`}>
                        {s.account === "no_token" ? t.noToken : s.account}
                      </span>
                    </div>

                    {/* Accreditation status */}
                    <div>
                      {s.request ? (
                        <Link
                          href="/admin/accreditations"
                          className={`text-[11px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                            STATUS_COLOR[s.request.status] ?? "text-cs-500 bg-cs-100 border border-cs-200"
                          }`}
                        >
                          {dict.status[s.request.status as keyof typeof dict.status] ?? s.request.status.replace(/_/g, " ")}
                        </Link>
                      ) : (
                        <span className="text-[11px] font-mono text-cs-300 uppercase tracking-widest px-2 py-0.5">
                          —
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-start gap-1.5">
                      {canResend && (
                        <form action={resendSetupLink}>
                          <input type="hidden" name="entity_id" value={s.id} />
                          <input type="hidden" name="email" value={s.email} />
                          <input type="hidden" name="org_name" value={s.org_name} />
                          <input type="hidden" name="role" value="startup" />
                          <button type="submit" className="text-[11px] font-mono font-semibold uppercase tracking-widest px-3 py-1 bg-black text-white hover:bg-cs-800 transition-colors">
                            {s.account === "expired" ? t.resend : t.send}
                          </button>
                        </form>
                      )}
                      {s.account === "activated" && (
                        <span className="text-[11px] font-mono text-emerald-600 font-semibold uppercase tracking-widest">
                          Active
                        </span>
                      )}
                      <DeleteEntityButton
                        action={deleteStartup}
                        entityId={s.id}
                        label={t.deleteBtn}
                        confirmLabel={t.confirmDelete}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
