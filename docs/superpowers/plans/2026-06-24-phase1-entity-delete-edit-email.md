# Phase 1 — Delete Entities + Edit Startup/Investor Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins hard-delete any entity (startup, accelerator, evaluator, investor, competition) — cleaning up its dependent rows and login account — and edit a startup's or investor's email synced across the entity record, the `auth.users` login, and any pending setup token. Also adds the missing `/admin/investors` admin page.

**Architecture:** A single `deleteEntityCascade(table, id)` helper in `admin.ts` does the cleanup the DB FKs don't (setup tokens, user_profiles, auth.users, and — for evaluators — competition_scores blocked by a NO ACTION FK). Thin per-entity server actions wrap it behind `requireAdmin()`. A generic `updateEntityEmail` action handles email edits. Two shared client components (`<DeleteEntityButton>`, `<EditEmailField>`) provide the UI, wired into each admin list page.

**Tech Stack:** Next.js 15 App Router (Server Actions, `revalidatePath`), `@supabase/supabase-js` service-role client (incl. `auth.admin.deleteUser` / `auth.admin.updateUserById`), TypeScript, Tailwind, JSON i18n (en/es).

**Verification note:** This repo has no unit-test harness (no `test` script). Each task is verified with `npx tsc --noEmit` and, for the final task, `npm run build` + manual admin checks. Do not scaffold a test runner (YAGNI).

**FK cleanup reference (verified):**
- startups/accelerators/investors/evaluators have a login: clean `account_setup_tokens` (entity_id) + `user_profiles` (entity_id) + `auth.users`.
- evaluators additionally need `competition_scores` deleted by `evaluator_id` FIRST (NO ACTION FK blocks the delete otherwise).
- competitions have no login/token/profile; the row delete alone (with DB cascades) suffices.
- All other dependents cascade or SET NULL automatically.

---

### Task 1: Delete helper + per-entity delete actions

**Files:**
- Modify: `src/app/actions/admin.ts` (add import + helper + 5 actions)

- [ ] **Step 1: Add the `requireAdmin` import**

At the top of `src/app/actions/admin.ts`, after the existing imports, add:

```ts
import { requireAdmin } from "@/lib/admin/require-admin";
```

- [ ] **Step 2: Add the shared cascade helper + 5 delete actions**

Append to the end of `src/app/actions/admin.ts`:

```ts
// ─── Entity deletion ─────────────────────────────────────────────────────────

type EntityTable = "startups" | "accelerators" | "evaluators" | "investors" | "competitions";

/**
 * Hard-delete an entity and everything the DB foreign keys don't clean up.
 * DB cascades handle accreditation_requests/cred_pages/competition_* etc.;
 * here we remove the login account, setup tokens, and (for evaluators) the
 * competition_scores rows blocked by a NO ACTION FK.
 */
async function deleteEntityCascade(table: EntityTable, entityId: string): Promise<void> {
  const service = createServiceClient();

  // Evaluators: competition_scores.evaluator_id is NO ACTION → must clear first.
  if (table === "evaluators") {
    await service.from("competition_scores").delete().eq("evaluator_id", entityId);
  }

  // Competitions have no login/token/profile; everything else does.
  if (table !== "competitions") {
    await service.from("account_setup_tokens").delete().eq("entity_id", entityId);

    const { data: profiles } = await service
      .from("user_profiles")
      .select("user_id")
      .eq("entity_id", entityId);

    await service.from("user_profiles").delete().eq("entity_id", entityId);

    for (const p of profiles ?? []) {
      if (p.user_id) {
        const { error } = await service.auth.admin.deleteUser(p.user_id);
        if (error) console.error("[deleteEntityCascade] auth delete error", error);
      }
    }
  }

  const { error } = await service.from(table).delete().eq("id", entityId);
  if (error) console.error(`[deleteEntityCascade] ${table} delete error`, error);
}

export async function deleteStartup(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("startups", id);
  revalidatePath("/admin/startups");
  revalidatePath("/admin/overview");
  revalidatePath("/admin/accreditations");
}

export async function deleteAccelerator(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("accelerators", id);
  revalidatePath("/admin/accelerators");
  revalidatePath("/admin/overview");
}

export async function deleteEvaluator(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("evaluators", id);
  revalidatePath("/admin/evaluators");
  revalidatePath("/admin/overview");
}

export async function deleteInvestor(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("investors", id);
  revalidatePath("/admin/investors");
  revalidatePath("/admin/overview");
}

export async function deleteCompetition(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("competitions", id);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/overview");
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat(admin): entity delete cascade helper + per-entity delete actions"
```

---

### Task 2: Generic email-edit action + activateInvestor

**Files:**
- Modify: `src/app/actions/admin.ts` (append two actions)

- [ ] **Step 1: Append `updateEntityEmail` (useActionState-compatible signature)**

Append to `src/app/actions/admin.ts`:

```ts
// ─── Edit entity email (synced to login + pending token) ─────────────────────

type EmailState = { error?: string; ok?: boolean };

export async function updateEntityEmail(
  _prev: EmailState,
  formData: FormData
): Promise<EmailState> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const table    = formData.get("table") as "startups" | "investors";
  const entityId = formData.get("entity_id") as string;
  const newEmail = ((formData.get("new_email") as string) || "").trim().toLowerCase();

  if (!table || !entityId || !newEmail) return { error: "Missing fields" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return { error: "Invalid email" };

  const service = createServiceClient();

  // Uniqueness within the same entity table
  const { data: dupe } = await service
    .from(table)
    .select("id")
    .eq("email", newEmail)
    .neq("id", entityId)
    .maybeSingle();
  if (dupe) return { error: "Email already in use" };

  await service.from(table).update({ email: newEmail }).eq("id", entityId);

  // Sync the login account if one exists
  const { data: profile } = await service
    .from("user_profiles")
    .select("user_id")
    .eq("entity_id", entityId)
    .maybeSingle();
  if (profile?.user_id) {
    const { error } = await service.auth.admin.updateUserById(profile.user_id, {
      email: newEmail,
      email_confirm: true,
    });
    if (error) console.error("[updateEntityEmail] auth update error", error);
  }

  // Sync any unused setup token
  await service
    .from("account_setup_tokens")
    .update({ email: newEmail })
    .eq("entity_id", entityId)
    .is("used_at", null);

  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

export async function activateInvestor(formData: FormData) {
  if (!(await requireAdmin())) return;
  const supabase   = createServiceClient();
  const investorId = formData.get("investor_id") as string;
  const deactivate = formData.get("deactivate") === "true";

  await supabase.from("investors").update({ is_active: !deactivate }).eq("id", investorId);

  revalidatePath("/admin/investors");
  revalidatePath("/admin/overview");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat(admin): updateEntityEmail (synced) + activateInvestor actions"
```

---

### Task 3: Shared `<DeleteEntityButton>` client component

**Files:**
- Create: `src/components/admin/DeleteEntityButton.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/admin/DeleteEntityButton.tsx`:

```tsx
"use client";

import { useState } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

interface DeleteEntityButtonProps {
  action:       ServerAction;
  entityId:     string;
  label:        string; // e.g. "Delete"
  confirmLabel: string; // e.g. "Confirm delete?"
}

/**
 * Two-step inline confirm: first click arms (reveals the red confirm button),
 * second click submits the delete form.
 */
export function DeleteEntityButton({ action, entityId, label, confirmLabel }: DeleteEntityButtonProps) {
  const [armed, setArmed] = useState(false);

  return (
    <form action={action}>
      <input type="hidden" name="entity_id" value={entityId} />
      {armed ? (
        <button
          type="submit"
          className="text-[11px] font-mono uppercase tracking-widest px-2 py-1 border border-red-300 bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          {confirmLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-[11px] font-mono uppercase tracking-widest px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          {label}
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/DeleteEntityButton.tsx
git commit -m "feat(admin): shared DeleteEntityButton with two-step confirm"
```

---

### Task 4: Shared `<EditEmailField>` client component

**Files:**
- Create: `src/components/admin/EditEmailField.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/admin/EditEmailField.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateEntityEmail } from "@/app/actions/admin";

interface EditEmailFieldProps {
  table:    "startups" | "investors";
  entityId: string;
  email:    string;
  editLabel:   string; // e.g. "Edit"
  saveLabel:   string; // e.g. "Save"
  cancelLabel: string; // e.g. "Cancel"
}

/**
 * Inline-editable email. Shows the email with an "Edit" affordance; editing
 * reveals an input + Save/Cancel and posts to updateEntityEmail (which syncs
 * the entity record, the login, and any pending setup token).
 */
export function EditEmailField({
  table, entityId, email, editLabel, saveLabel, cancelLabel,
}: EditEmailFieldProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateEntityEmail, {} as { error?: string; ok?: boolean });

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] font-mono text-cs-400 truncate">{email}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black shrink-0"
        >
          {editLabel}
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-1"
      onSubmit={() => setEditing(true)}
    >
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="entity_id" value={entityId} />
      <div className="flex items-center gap-1.5">
        <input
          name="new_email"
          type="email"
          defaultValue={email}
          required
          className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black flex-1 min-w-0"
        />
        <button type="submit" disabled={pending} className="btn-primary btn-sm shrink-0">
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black shrink-0"
        >
          {cancelLabel}
        </button>
      </div>
      {state?.error && (
        <span className="text-[10px] font-mono text-red-600">{state.error}</span>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EditEmailField.tsx
git commit -m "feat(admin): shared EditEmailField (inline email edit)"
```

---

### Task 5: i18n strings (en + es)

**Files:**
- Modify: `src/lib/i18n/dictionaries/en.json` (`admin` object)
- Modify: `src/lib/i18n/dictionaries/es.json` (`admin` object)

- [ ] **Step 1: Add keys to the `"admin"` object in `en.json`**

```json
    "deleteBtn": "Delete",
    "confirmDelete": "Confirm delete?",
    "editEmail": "Edit",
    "saveEmail": "Save",
    "cancelEdit": "Cancel",
    "investors": "Investors",
    "noInvestorsFound": "No investors found.",
    "investmentFocus": "Investment Focus"
```

- [ ] **Step 2: Add the same keys to the `"admin"` object in `es.json`**

```json
    "deleteBtn": "Borrar",
    "confirmDelete": "¿Confirmar borrado?",
    "editEmail": "Editar",
    "saveEmail": "Guardar",
    "cancelEdit": "Cancelar",
    "investors": "Inversionistas",
    "noInvestorsFound": "No se encontraron inversionistas.",
    "investmentFocus": "Enfoque de Inversión"
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "require('./src/lib/i18n/dictionaries/en.json'); require('./src/lib/i18n/dictionaries/es.json'); console.log('json ok')"`
Expected: prints `json ok`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/en.json src/lib/i18n/dictionaries/es.json
git commit -m "i18n: add delete/edit-email/investors admin strings (en/es)"
```

---

### Task 6: Wire delete + edit-email into the Startups admin page

**Files:**
- Modify: `src/app/admin/startups/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/app/admin/startups/page.tsx`, update the admin-actions import and add the components. The current import is `import { resendSetupLink } from "@/app/actions/admin";`. Change it to:

```ts
import { resendSetupLink, deleteStartup } from "@/app/actions/admin";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { EditEmailField }     from "@/components/admin/EditEmailField";
```

- [ ] **Step 2: Replace the static email with the editable field**

In the startup name/email cell, replace this line:

```tsx
                      <div className="text-[12px] font-mono text-cs-400 truncate">{s.email}</div>
```

with:

```tsx
                      <EditEmailField
                        table="startups"
                        entityId={s.id}
                        email={s.email}
                        editLabel={t.editEmail}
                        saveLabel={t.saveEmail}
                        cancelLabel={t.cancelEdit}
                      />
```

- [ ] **Step 3: Add the Delete button to the Actions cell**

In the Actions cell (the `<div>` that currently contains the resend `<form>` and the "Active" span), wrap its contents so the delete button sits below. Replace the Actions `<div>`:

```tsx
                    {/* Actions */}
                    <div>
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
                    </div>
```

with (adds a `flex-col gap-1.5` wrapper and the delete button):

```tsx
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
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/startups/page.tsx
git commit -m "feat(admin): delete + inline email edit on startups page"
```

---

### Task 7: Wire delete into the Accelerators admin page

**Files:**
- Modify: `src/app/admin/accelerators/page.tsx`

- [ ] **Step 1: Add imports**

Change `import { activateAccelerator } from "@/app/actions/admin";` to:

```ts
import { activateAccelerator, deleteAccelerator } from "@/app/actions/admin";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
```

- [ ] **Step 2: Add the delete button under the activate form**

In the Actions cell, the `<div>` currently wraps a single `<form action={activateAccelerator}>`. Wrap that `<div>`'s content in a `flex-col` and add the delete button. Replace:

```tsx
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
```

with:

```tsx
                  <div className="flex flex-col items-start gap-1.5">
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
                    <DeleteEntityButton
                      action={deleteAccelerator}
                      entityId={acc.id}
                      label={t.deleteBtn}
                      confirmLabel={t.confirmDelete}
                    />
                  </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/accelerators/page.tsx
git commit -m "feat(admin): delete action on accelerators page"
```

---

### Task 8: Wire delete into the Evaluators admin page

**Files:**
- Modify: `src/app/admin/evaluators/page.tsx`

- [ ] **Step 1: Add imports**

Change `import { activateEvaluator } from "@/app/actions/admin";` to:

```ts
import { activateEvaluator, deleteEvaluator } from "@/app/actions/admin";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
```

- [ ] **Step 2: Add the delete button under the activate form**

In the Actions cell, replace:

```tsx
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
                        className={`text-[11px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
                          ev.is_active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "btn-primary btn-sm"
                        }`}
                      >
                        {ev.is_active ? t.deactivate : t.activate}
                      </button>
                    </form>
                  </div>
```

with:

```tsx
                  <div className="flex flex-col items-start gap-1.5">
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
                        className={`text-[11px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
                          ev.is_active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "btn-primary btn-sm"
                        }`}
                      >
                        {ev.is_active ? t.deactivate : t.activate}
                      </button>
                    </form>
                    <DeleteEntityButton
                      action={deleteEvaluator}
                      entityId={ev.id}
                      label={t.deleteBtn}
                      confirmLabel={t.confirmDelete}
                    />
                  </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/evaluators/page.tsx
git commit -m "feat(admin): delete action on evaluators page"
```

---

### Task 9: Wire delete into the Competitions admin page

**Files:**
- Modify: `src/app/admin/competitions/page.tsx`

- [ ] **Step 1: Add imports**

Change `import { createCompetition } from "@/app/actions/competitions";` area — add a new line after it:

```ts
import { deleteCompetition } from "@/app/actions/admin";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
```

- [ ] **Step 2: Add the delete button beside the "Manage" link**

Each competition row ends with a `<Link href={`/admin/competitions/${comp.id}`} …>{t.manage}</Link>`. Replace that `<Link>` with a wrapper that keeps Manage and adds Delete:

```tsx
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/admin/competitions/${comp.id}`}
                    className="text-[12px] font-mono text-sb-default hover:underline uppercase tracking-widest"
                  >
                    {t.manage}
                  </Link>
                  <DeleteEntityButton
                    action={deleteCompetition}
                    entityId={comp.id}
                    label={t.deleteBtn}
                    confirmLabel={t.confirmDelete}
                  />
                </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/competitions/page.tsx
git commit -m "feat(admin): delete action on competitions page"
```

---

### Task 10: New `/admin/investors` page + nav link

**Files:**
- Create: `src/app/admin/investors/page.tsx`
- Modify: `src/components/ui/Navigation.tsx` (ADMIN_NAV array, ~line 249-256)

- [ ] **Step 1: Add the nav link**

In `src/components/ui/Navigation.tsx`, in the `ADMIN_NAV` array, add an Investors entry after the Startups line:

```ts
  { label: "Startups",      href: "/admin/startups"      },
  { label: "Investors",     href: "/admin/investors"     },
  { label: "Cred List",     href: "/admin/cred-list"     },
```

- [ ] **Step 2: Create the investors page**

Create `src/app/admin/investors/page.tsx` (mirrors the accelerators page; investors use `investment_focus` instead of `industry`, and `activateInvestor` / `deleteInvestor` / edit-email):

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/investors/page.tsx src/components/ui/Navigation.tsx
git commit -m "feat(admin): investors admin page (list/status/delete/edit-email) + nav link"
```

---

### Task 11: Full build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with no type/compile errors.

- [ ] **Step 2: Start the preview**

Use `preview_start` (config name `dev`) and confirm the server is up.

- [ ] **Step 3: Manual — edit email**

As admin, open `/admin/startups`. Click **Edit** on a test startup's email, change it, **Save**.
Expected: row shows the new email after revalidate. Try an email already used by another startup → inline "Email already in use" error, no change. (Optional DB check: `select email from startups where id = '<id>'`.)

- [ ] **Step 4: Manual — delete (two-step)**

On a **test** startup row, click **Delete** → it changes to **Confirm delete?**; click again.
Expected: the startup disappears from the list and from `/admin/accreditations`; its accreditation request, cred page (if any), setup token, user_profile, and auth user are gone. Verify with:
`select (select count(*) from startups where id='<id>') as s, (select count(*) from accreditation_requests where startup_id='<id>') as r, (select count(*) from account_setup_tokens where entity_id='<id>') as tok, (select count(*) from user_profiles where entity_id='<id>') as up;`
Expected: all zeros.

- [ ] **Step 5: Manual — investors page + other deletes**

Visit `/admin/investors` (new nav link present). Confirm the list renders with status + actions. Spot-check Delete on `/admin/accelerators`, `/admin/evaluators`, `/admin/competitions` (use throwaway/test rows).
Expected: each deletes cleanly; evaluators with competition scores delete without an FK error.

- [ ] **Step 6: Screenshot proof**

Capture `preview_screenshot` of the startups page (edit-email + delete affordances) and the new investors page; share with the user.

- [ ] **Step 7: Final commit (only if verification required fixes)**

```bash
git add -A
git commit -m "fix: address issues found during phase 1 verification"
```
(Skip if nothing changed.)

---

## Self-Review

**Spec coverage (Phase 1 portions of the spec):**
- Shared delete helper (tokens + user_profiles + auth.users; evaluator competition_scores first) → Task 1. ✓
- Per-entity delete actions for all 5 types → Task 1. ✓
- `updateStartupEmail` synced (record + auth.users + pending token), generalized to investors → Task 2 (`updateEntityEmail`). ✓
- `activateInvestor` (needed by the new investors page) → Task 2. ✓
- Two-step delete confirm UI → Task 3. ✓
- Inline edit-email UI → Task 4. ✓
- i18n → Task 5. ✓
- Delete wired into startups/accelerators/evaluators/competitions → Tasks 6–9. ✓
- Edit-email wired into startups → Task 6; into investors → Task 10. ✓
- New investors admin page + nav (user-requested during planning) → Task 10. ✓
- `requireAdmin()` guards on every new action → Tasks 1–2. ✓
- Verification incl. evaluator NO-ACTION edge case + orphan cleanup → Task 11. ✓

(Out of Phase 1 scope, deferred to Phase 2: `is_test` columns, global Test Mode switch, badges/filters, `purgeTestData`. The `deleteEntityCascade` helper built here is what Phase 2's purge will reuse.)

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands list expected output. ✓

**Type/name consistency:** Action names (`deleteStartup`/`deleteAccelerator`/`deleteEvaluator`/`deleteInvestor`/`deleteCompetition`, `updateEntityEmail`, `activateInvestor`) and the `EntityTable` union are defined in Tasks 1–2 and consumed identically in Tasks 6–10. Component prop names (`action`, `entityId`, `label`, `confirmLabel` for DeleteEntityButton; `table`, `entityId`, `email`, `editLabel`, `saveLabel`, `cancelLabel` for EditEmailField) match between Tasks 3–4 and their call sites in Tasks 6–10. Form field names (`entity_id`, `table`, `new_email`, `investor_id`, `deactivate`) match between actions and forms. i18n keys (`deleteBtn`, `confirmDelete`, `editEmail`, `saveEmail`, `cancelEdit`, `investors`, `noInvestorsFound`, `investmentFocus`) defined in Task 5 and used in Tasks 6–10. ✓
