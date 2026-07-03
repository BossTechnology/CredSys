import { createServiceClient } from "@/lib/supabase/service";
import { getAppDictionary }    from "@/lib/i18n/loader";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { SubmitButton }        from "@/components/admin/SubmitButton";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { inviteEntityUser, revokeEntityUser, cancelEntityInvite } from "@/app/actions/admin";

const ROLES = ["startup", "evaluator", "accelerator", "investor"] as const;
type EntityRole = (typeof ROLES)[number];

const ROLE_BACK: Record<EntityRole, string> = {
  startup:     "/admin/startups",
  evaluator:   "/admin/evaluators",
  accelerator: "/admin/accelerators",
  investor:    "/admin/investors",
};

export default async function EntityUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; id?: string; name?: string }>;
}) {
  const { role, id, name } = await searchParams;
  const { locale, dict } = await getAppDictionary();
  const t = dict.admin;

  if (!id || !role || !(ROLES as readonly string[]).includes(role)) {
    redirect("/admin/overview");
  }
  const entityRole = role as EntityRole;
  const orgName = name || "—";

  const service = createServiceClient();

  function fmt(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  // Active members (each user_profiles row → one login), resolve their email.
  const { data: profiles } = await service
    .from("user_profiles")
    .select("user_id, created_at")
    .eq("entity_id", id)
    .order("created_at", { ascending: true });

  const members = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await service.auth.admin.getUserById(p.user_id);
      return {
        userId:  p.user_id,
        email:   data.user?.email ?? "—",
        since:   p.created_at,
      };
    })
  );

  // Pending invites (unused, unexpired setup tokens).
  const { data: tokens } = await service
    .from("account_setup_tokens")
    .select("id, email, expires_at, created_at")
    .eq("entity_id", id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const pendingInvites = (tokens ?? []).filter((tk) => !memberEmails.has(tk.email.toLowerCase()));

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-7 py-8">

      <Link
        href={ROLE_BACK[entityRole]}
        className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors block mb-6"
      >
        ← {t.backToList}
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-black" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.manageUsers} · {entityRole}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{orgName}</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">{t.manageUsersHint}</p>
      </div>

      {/* Active members */}
      <div className="bg-white border border-cs-200 mb-6">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.teamMembers} · {members.length}
          </span>
        </div>
        {members.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noMembers}</p>
          </div>
        ) : (
          <div className="divide-y divide-cs-100">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{m.email}</div>
                  <div className="text-[12px] font-mono text-cs-400">{t.since} {fmt(m.since)}</div>
                </div>
                <ConfirmActionButton
                  action={revokeEntityUser}
                  fields={{ user_id: m.userId, role: entityRole, entity_id: id }}
                  label={t.revoke}
                  confirmLabel={t.confirmRevoke}
                  danger
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-white border border-cs-200 mb-6">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              {t.pendingInvites} · {pendingInvites.length}
            </span>
          </div>
          <div className="divide-y divide-cs-100">
            {pendingInvites.map((tk) => (
              <div key={tk.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-mono truncate">{tk.email}</div>
                  <div className="text-[12px] font-mono text-cs-400">{t.expires} {fmt(tk.expires_at)}</div>
                </div>
                <ConfirmActionButton
                  action={cancelEntityInvite}
                  fields={{ token_id: tk.id, role: entityRole, entity_id: id }}
                  label={t.cancelInvite}
                  confirmLabel={t.confirmCancelInvite}
                  danger
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.inviteUser}
          </span>
        </div>
        <form action={inviteEntityUser} className="p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
          <input type="hidden" name="role"      value={entityRole} />
          <input type="hidden" name="entity_id" value={id} />
          <input type="hidden" name="org_name"  value={orgName} />
          <div className="flex-1">
            <label className="cs-label">{t.userEmail}</label>
            <input
              name="email"
              type="email"
              required
              placeholder={t.userEmailPH}
              className="cs-input"
            />
          </div>
          <SubmitButton label={t.sendInvite} className="btn-primary btn-lg shrink-0" />
        </form>
      </div>

    </div>
  );
}
