import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath }      from "next/cache";

// ─── Server Action ────────────────────────────────────────────────────────────

async function markCompleted(formData: FormData) {
  "use server";
  const { createServiceClient: makeService } = await import("@/lib/supabase/service");
  const service        = makeService();
  const sponsorshipId  = formData.get("sponsorship_id") as string;
  if (!sponsorshipId) return;

  await service
    .from("accreditation_sponsorships")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sponsorshipId);

  revalidatePath("/admin/sponsorships");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  pending_startup_acceptance: "text-yellow-600",
  accepted:   "text-blue-600",
  declined:   "text-red-500",
  cancelled:  "text-cs-400",
  completed:  "text-green-600",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminSponsorshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const service    = createServiceClient();

  let query = service
    .from("accreditation_sponsorships")
    .select(`
      id, sponsor_type, startup_name_input, startup_email_input,
      status, created_at, billing_contact_name, billing_contact_email,
      notes,
      investors(org_name),
      accelerators(org_name)
    `)
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq("status", filter) as typeof query;
  }

  const { data: sponsorships } = await query;
  const total = sponsorships?.length ?? 0;

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsorships</h1>
          <p className="text-[8px] font-mono text-cs-400 mt-1">
            {total} {filter && filter !== "all" ? filter.replace(/_/g, " ") : "total"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "All",       href: "/admin/sponsorships"                                     },
            { label: "Pending",   href: "/admin/sponsorships?filter=pending_startup_acceptance"   },
            { label: "Accepted",  href: "/admin/sponsorships?filter=accepted"                     },
            { label: "Completed", href: "/admin/sponsorships?filter=completed"                    },
            { label: "Declined",  href: "/admin/sponsorships?filter=declined"                     },
          ].map((tab) => {
            const tabFilter = tab.href.includes("filter=") ? tab.href.split("filter=")[1] : undefined;
            const isActive  = (!filter || filter === "all") ? !tabFilter : filter === tabFilter;
            return (
              <a
                key={tab.label}
                href={tab.href}
                className={`text-[7.5px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  isActive
                    ? "bg-black text-white border-black"
                    : "bg-white text-cs-500 border-cs-200 hover:border-black"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest">
            Sponsorships · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[8px] font-mono text-cs-400">No sponsorships found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[60px_1fr_1fr_1fr_80px_80px_100px] gap-3 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {["Type", "Sponsor", "Startup", "Billing Contact", "Date", "Status", "Action"].map((h) => (
                <div key={h} className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(sponsorships ?? []).map((s) => {
                const inv  = s.investors  as unknown as { org_name: string } | null;
                const acc  = s.accelerators as unknown as { org_name: string } | null;
                const sponsorName = inv?.org_name ?? acc?.org_name ?? "—";

                return (
                  <div key={s.id} className="grid grid-cols-[60px_1fr_1fr_1fr_80px_80px_100px] gap-3 px-5 py-3 items-start">
                    <div>
                      <span className="text-[7px] font-mono uppercase tracking-widest text-cs-400">
                        {s.sponsor_type}
                      </span>
                    </div>
                    <div>
                      <div className="text-[8px] font-semibold">{sponsorName}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-semibold">{s.startup_name_input}</div>
                      <div className="text-[7px] font-mono text-cs-400">{s.startup_email_input}</div>
                    </div>
                    <div>
                      <div className="text-[8px]">{s.billing_contact_name}</div>
                      <div className="text-[7px] font-mono text-cs-400">{s.billing_contact_email}</div>
                    </div>
                    <div className="text-[7.5px] font-mono text-cs-400">{fmt(s.created_at)}</div>
                    <div>
                      <span className={`text-[7px] font-mono font-bold uppercase tracking-widest ${STATUS_COLORS[s.status] ?? "text-cs-400"}`}>
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      {s.status === "accepted" && (
                        <form action={markCompleted}>
                          <input type="hidden" name="sponsorship_id" value={s.id} />
                          <button type="submit" className="btn-primary btn-sm">
                            Mark Completed
                          </button>
                        </form>
                      )}
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
