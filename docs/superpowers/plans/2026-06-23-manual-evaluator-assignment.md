# Manual Evaluator Assignment + Accept/Decline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make evaluator assignment admin-driven (not automatic), let evaluators accept/decline an assigned startup (decline requires a reason and returns it to the admin queue), surface the startup's contact email to the evaluator, and email the evaluator on every assignment plus the admin on every accept/decline.

**Architecture:** Assignment stays modeled by `accreditation_requests.status`; a new isolated `acceptance_status` column ('pending' | 'accepted') gates the evaluator's workflow actions behind an explicit accept step. All assignment is funneled through the existing admin action `assignEvaluatorToRequest`; the auto-matcher and a duplicate dead-code assignment path are removed.

**Tech Stack:** Next.js 15 App Router (Server Components + Server Actions), Supabase (Postgres, service-role client), Resend email, TypeScript, Tailwind, JSON i18n dictionaries (en/es).

**Verification note:** This repo has no unit-test harness (no vitest/jest, no `test` script). Each task is verified with `npx tsc --noEmit` (typecheck) and, where relevant, `npm run lint`, followed by manual preview verification in the final task. There is no TDD loop because there is no runner to write tests against; do not scaffold one (YAGNI).

---

### Task 1: DB migration + types for acceptance state

**Files:**
- Create: `supabase/migrations/20260623000010_evaluator_acceptance.sql`
- Modify: `src/lib/supabase/types.ts` (AccreditationRequest interface, ~line 258)

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260623000010_evaluator_acceptance.sql`:

```sql
-- Manual evaluator assignment + accept/decline
-- Adds an acceptance gate that is independent of the workflow status enum.

ALTER TABLE accreditation_requests
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS evaluator_decline_reason TEXT;

-- Backfill: any request already past the unassigned state must NOT show the
-- accept/decline panel, so mark existing in-flight/terminal requests accepted.
UPDATE accreditation_requests
   SET acceptance_status = 'accepted'
 WHERE status <> 'pending_evaluator_assignment';
```

- [ ] **Step 2: Apply the migration to the linked Supabase project**

Apply via the Supabase MCP tool `mcp__5db91adc-0429-4eeb-b5b4-26833572548e__apply_migration` with:
- `name`: `evaluator_acceptance`
- `query`: the full SQL from Step 1

(If the MCP tool is unavailable, run `supabase db push` against the linked project `rrhojefqjqcktgvsltvr`.)

Expected: success, no error. Confirm with a follow-up `execute_sql`:
`select column_name from information_schema.columns where table_name='accreditation_requests' and column_name in ('acceptance_status','evaluator_decline_reason');`
Expected: 2 rows returned.

- [ ] **Step 3: Add the fields to the AccreditationRequest type**

In `src/lib/supabase/types.ts`, inside `interface AccreditationRequest`, after the `rejection_reason?: string;` line and before `notes?: string;`, add:

```ts
  // Evaluator acceptance gate
  acceptance_status?:        "pending" | "accepted";
  evaluator_decline_reason?: string;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623000010_evaluator_acceptance.sql src/lib/supabase/types.ts
git commit -m "feat(db): add acceptance_status + evaluator_decline_reason to accreditation_requests"
```

---

### Task 2: Admin notification email template (E16) + env var

**Files:**
- Create: `src/lib/email/templates/e16-evaluator-response.ts`
- Modify: `.env.local`

- [ ] **Step 1: Create the email template**

Create `src/lib/email/templates/e16-evaluator-response.ts`:

```ts
import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E16a — Admin: evaluator accepted an assignment */
export async function sendEvaluatorAccepted(
  to: string,
  evaluatorOrg: string,
  startupName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      An evaluator has <strong style="color:#ffffff">accepted</strong> an assignment.
    </p>
    ${emailBlock("Evaluator", evaluatorOrg)}
    ${emailBlock("Startup", startupName, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      The evaluation will proceed as normal.
    </p>
  `);

  await sendEmail({
    to,
    subject: `StartupBoss.org — Evaluator accepted: ${startupName}`,
    html,
  });
}

/** E16b — Admin: evaluator declined an assignment (returned to queue) */
export async function sendEvaluatorDeclined(
  to: string,
  evaluatorOrg: string,
  startupName: string,
  reason: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      An evaluator has <strong style="color:#ffffff">declined</strong> an assignment.
      It has been returned to the queue for reassignment.
    </p>
    ${emailBlock("Evaluator", evaluatorOrg)}
    ${emailBlock("Startup", startupName)}
    ${emailBlock("Reason", reason, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      Please assign another evaluator from the admin panel.
    </p>
  `);

  await sendEmail({
    to,
    subject: `StartupBoss.org — Evaluator declined: ${startupName}`,
    html,
  });
}
```

- [ ] **Step 2: Add the admin recipient env var**

Append to `.env.local`:

```
ADMIN_NOTIFY_EMAIL=amadeus@boss.technology
```

(Also add this var to the Vercel project env later; not part of this commit.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/templates/e16-evaluator-response.ts
git commit -m "feat(email): add E16 admin notification for evaluator accept/decline"
```

---

### Task 3: Make assignment manual — remove auto-match, consolidate into admin action, delete dead code

**Files:**
- Modify: `src/app/actions/apply.ts` (remove import line 8 + call lines 67-70)
- Modify: `src/app/actions/admin.ts` (`assignEvaluatorToRequest`, lines 35-53; add imports)
- Delete: `src/lib/accreditation/matching.ts`
- Delete: `src/app/components/admin/AssignEvaluatorForm.tsx` → actual path `src/components/admin/AssignEvaluatorForm.tsx`
- Modify: `src/app/actions/accreditation.ts` (delete unused `assignEvaluator`, lines 107-171, and its now-unused imports)

- [ ] **Step 1: Remove auto-assignment from the apply action**

In `src/app/actions/apply.ts`:

Delete the import (line 8):
```ts
import { matchAndAssign } from "@/lib/accreditation/matching";
```

Delete the auto-assign block (lines 67-70):
```ts
  // Auto-assign evaluator
  matchAndAssign(inserted.id).catch(
    (e) => console.error("[apply] matchAndAssign error:", e)
  );
```

Leave the rest (the request stays at `pending_evaluator_assignment`, confirmation email still sends, redirect stays).

- [ ] **Step 2: Delete the auto-matcher**

```bash
git rm src/lib/accreditation/matching.ts
```

- [ ] **Step 3: Rewrite `assignEvaluatorToRequest` to send emails + notify watchlist**

In `src/app/actions/admin.ts`, add this import near the top (after the existing imports):

```ts
import { sendEvaluatorAssigned, sendNewAssignment } from "@/lib/email/templates/e3-evaluator-assigned";
```

Replace the entire `assignEvaluatorToRequest` function (lines 35-53) with:

```ts
export async function assignEvaluatorToRequest(formData: FormData) {
  const supabase    = createServiceClient();
  const requestId   = formData.get("request_id")   as string;
  const evaluatorId = formData.get("evaluator_id") as string;

  if (!requestId || !evaluatorId) return;

  const [{ data: request }, { data: evaluator }] = await Promise.all([
    supabase
      .from("accreditation_requests")
      .select("startup_id, startup_name, startup_email")
      .eq("id", requestId)
      .single(),
    supabase
      .from("evaluators")
      .select("org_name, email")
      .eq("id", evaluatorId)
      .single(),
  ]);

  if (!request || !evaluator) return;

  await supabase
    .from("accreditation_requests")
    .update({
      evaluator_id:             evaluatorId,
      status:                   "evaluator_assigned",
      acceptance_status:        "pending",
      evaluator_decline_reason: null,
    })
    .eq("id", requestId);

  // Notify evaluator (E3b) + startup (E3)
  await Promise.all([
    sendNewAssignment(evaluator.email, evaluator.org_name, request.startup_name, requestId),
    sendEvaluatorAssigned(request.startup_email, request.startup_name, evaluator.org_name),
  ]).catch((e) => console.error("[assignEvaluatorToRequest] email error", e));

  // Notify investor watchlist subscribers
  try {
    if (request.startup_id) {
      const { data: watchers } = await supabase
        .from("investor_watchlist")
        .select("investors(email)")
        .eq("startup_id", request.startup_id)
        .eq("notify_on_evaluator_assigned", true);

      if (watchers?.length) {
        const { sendWatchlistEvaluatorAssigned } = await import("@/lib/email/templates/e15-watchlist-evaluator-assigned");
        await Promise.allSettled(
          watchers.map((w) => {
            const inv = w.investors as unknown as { email: string };
            return sendWatchlistEvaluatorAssigned(inv.email, request.startup_name);
          })
        );
      }
    }
  } catch (e) {
    console.error("[assignEvaluatorToRequest] watchlist notification error", e);
  }

  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  revalidatePath("/app/evaluator/dashboard");
}
```

- [ ] **Step 4: Delete the dead-code assignment path**

Delete the `AssignEvaluatorForm` component:
```bash
git rm src/components/admin/AssignEvaluatorForm.tsx
```

In `src/app/actions/accreditation.ts`, delete the entire `assignEvaluator` function (lines 107-171). Then remove the now-unused import on line 8:
```ts
import { sendEvaluatorAssigned, sendNewAssignment } from "@/lib/email/templates/e3-evaluator-assigned";
```
(Verify nothing else in `accreditation.ts` still uses `sendEvaluatorAssigned`/`sendNewAssignment` before deleting the import — after removing `assignEvaluator` it is unused. The `advanceAccreditationStatus` function uses `sendAccredited`/`sendRejected`, not these, so the import is safe to delete.)

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors (warnings pre-existing elsewhere are fine).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: manual evaluator assignment — remove auto-match, consolidate assign action, drop dead code"
```

---

### Task 4: Evaluator accept/decline server actions

**Files:**
- Modify: `src/app/actions/verification.ts` (append two new actions)

- [ ] **Step 1: Add the accept action**

Append to `src/app/actions/verification.ts` (end of file):

```ts
// ─── Evaluator accepts the assignment ────────────────────────────────────────

export async function acceptAssignment(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "evaluator") return { error: "Unauthorized" };

  const requestId = formData.get("request_id") as string;
  if (!requestId) return { error: "Missing request_id" };

  // Enforce ownership + valid state
  const { data: req } = await service
    .from("accreditation_requests")
    .select("startup_name, status, acceptance_status")
    .eq("id", requestId)
    .eq("evaluator_id", profile.entity_id)
    .single();

  if (!req) return { error: "Assignment not found" };
  if (req.status !== "evaluator_assigned" || req.acceptance_status !== "pending") {
    return { error: "Assignment cannot be accepted in its current state" };
  }

  await service
    .from("accreditation_requests")
    .update({ acceptance_status: "accepted" })
    .eq("id", requestId);

  // Notify admin
  const { data: evaluator } = await service
    .from("evaluators").select("org_name").eq("id", profile.entity_id).single();
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? "amadeus@boss.technology";
  const { sendEvaluatorAccepted } = await import("@/lib/email/templates/e16-evaluator-response");
  sendEvaluatorAccepted(adminEmail, evaluator?.org_name ?? "Evaluator", req.startup_name)
    .catch((e) => console.error("[acceptAssignment] email error", e));

  revalidatePath(`/app/evaluator/assignments/${requestId}`);
  revalidatePath("/app/evaluator/dashboard");
  revalidatePath("/admin/accreditations");

  return {};
}

// ─── Evaluator declines the assignment (reason required) ─────────────────────

export async function declineAssignment(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "evaluator") return { error: "Unauthorized" };

  const requestId = formData.get("request_id") as string;
  const reason    = ((formData.get("decline_reason") as string) || "").trim();
  if (!requestId) return { error: "Missing request_id" };
  if (!reason)    return { error: "A reason is required to decline" };

  // Enforce ownership + valid state
  const { data: req } = await service
    .from("accreditation_requests")
    .select("startup_name, status, acceptance_status")
    .eq("id", requestId)
    .eq("evaluator_id", profile.entity_id)
    .single();

  if (!req) return { error: "Assignment not found" };
  if (req.status !== "evaluator_assigned" || req.acceptance_status !== "pending") {
    return { error: "Assignment cannot be declined in its current state" };
  }

  const { data: evaluator } = await service
    .from("evaluators").select("org_name").eq("id", profile.entity_id).single();

  // Return to the admin queue, clear the evaluator, keep the reason for admin view
  await service
    .from("accreditation_requests")
    .update({
      status:                   "pending_evaluator_assignment",
      evaluator_id:             null,
      acceptance_status:        "pending",
      evaluator_decline_reason: reason,
    })
    .eq("id", requestId);

  // Notify admin
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? "amadeus@boss.technology";
  const { sendEvaluatorDeclined } = await import("@/lib/email/templates/e16-evaluator-response");
  sendEvaluatorDeclined(adminEmail, evaluator?.org_name ?? "Evaluator", req.startup_name, reason)
    .catch((e) => console.error("[declineAssignment] email error", e));

  revalidatePath(`/app/evaluator/assignments/${requestId}`);
  revalidatePath("/app/evaluator/dashboard");
  revalidatePath("/admin/accreditations");

  return {};
}
```

(`createClient`, `createServiceClient`, and `revalidatePath` are already imported at the top of `verification.ts` — no new top-level imports needed.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/verification.ts
git commit -m "feat: add evaluator acceptAssignment + declineAssignment server actions"
```

---

### Task 5: i18n strings (en + es)

**Files:**
- Modify: `src/lib/i18n/dictionaries/en.json` (`evalAssignDetail`, `evalDash`, `admin` sections)
- Modify: `src/lib/i18n/dictionaries/es.json` (same sections)

- [ ] **Step 1: Add English keys**

In `src/lib/i18n/dictionaries/en.json`, inside `"evalAssignDetail"`, add these keys (e.g. after `"address": "Address"`):

```json
    "contactEmail": "Contact email",
    "acceptTitle": "Accept or Decline Assignment",
    "acceptDesc": "Review the startup profile below. Accept to begin the evaluation, or decline to return it to the admin.",
    "acceptBtn": "Accept Assignment",
    "declineReason": "Reason for declining (required)",
    "declineReasonPH": "Explain why you are declining this assignment…",
    "declineBtn": "Decline"
```

In `"evalDash"`, add (e.g. after `"view": "View →"`):

```json
    "pendingAcceptance": "Pending your acceptance"
```

In `"admin"`, add (anywhere inside the object, e.g. after `"assignBtn"`):

```json
    "acceptancePending": "Pending acceptance",
    "acceptanceAccepted": "Accepted",
    "declinedReasonLabel": "Last declined"
```

(If `evalAssignDetail` does not already end with a trailing key you can append after, place the new keys before the closing `}` of that section and ensure JSON commas are correct.)

- [ ] **Step 2: Add Spanish keys**

In `src/lib/i18n/dictionaries/es.json`, inside `"evalAssignDetail"`, add:

```json
    "contactEmail": "Email de contacto",
    "acceptTitle": "Aceptar o Declinar Asignación",
    "acceptDesc": "Revisa el perfil de la startup abajo. Acepta para iniciar la evaluación, o declina para devolverla al admin.",
    "acceptBtn": "Aceptar Asignación",
    "declineReason": "Motivo para declinar (obligatorio)",
    "declineReasonPH": "Explica por qué declinas esta asignación…",
    "declineBtn": "Declinar"
```

In `"evalDash"`, add:

```json
    "pendingAcceptance": "Pendiente de tu aceptación"
```

In `"admin"`, add:

```json
    "acceptancePending": "Pendiente de aceptación",
    "acceptanceAccepted": "Aceptada",
    "declinedReasonLabel": "Último rechazo"
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "require('./src/lib/i18n/dictionaries/en.json'); require('./src/lib/i18n/dictionaries/es.json'); console.log('json ok')"`
Expected: prints `json ok` (no parse error).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/en.json src/lib/i18n/dictionaries/es.json
git commit -m "i18n: add accept/decline + acceptance-state strings (en/es)"
```

---

### Task 6: Evaluator assignment detail page — acceptance panel, gating, contact email

**Files:**
- Modify: `src/app/app/evaluator/assignments/[id]/page.tsx`

- [ ] **Step 1: Import the new actions and add form-action wrappers**

At the top of `src/app/app/evaluator/assignments/[id]/page.tsx`, update the verification import (line 9) to also pull the accept/decline actions:

```ts
import { rejectWithReason, acceptAssignment, declineAssignment } from "@/app/actions/verification";
```

Below the existing `rejectAction` wrapper (after line 39), add:

```ts
async function acceptAction(fd: FormData) {
  "use server";
  await acceptAssignment(fd);
}

async function declineAction(fd: FormData) {
  "use server";
  await declineAssignment(fd);
}
```

- [ ] **Step 2: Derive the acceptance-pending flag**

After the existing line `const isTerminal = TERMINAL.includes(status);` (line 89), add:

```ts
  const acceptancePending =
    status === "evaluator_assigned" &&
    (req as unknown as { acceptance_status?: string }).acceptance_status === "pending";
```

- [ ] **Step 3: Add the contact email to the startup snapshot**

In the startup snapshot grid, immediately after the opening `<div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">` (line 227) and before the `{[ ... ].map(...)}` block, insert:

```tsx
          <div className="col-span-2">
            <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              {t.contactEmail}
            </div>
            <a
              href={`mailto:${req.startup_email}`}
              className="text-[13px] font-semibold cs-link underline-offset-2 break-all"
            >
              {req.startup_email}
            </a>
          </div>
```

- [ ] **Step 4: Gate the workflow actions behind acceptance**

Replace the existing evaluator-actions block (lines 295-345, the `{!isTerminal && nextStatus && ( ... )}` JSX) with the following, which shows the acceptance panel when pending and otherwise shows the existing actions:

```tsx
      {/* Acceptance gate — evaluator must accept before working the request */}
      {acceptancePending ? (
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              {t.acceptTitle}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <p className="text-[13px] text-cs-700 leading-relaxed">{t.acceptDesc}</p>

            <form action={acceptAction}>
              <input type="hidden" name="request_id" value={req.id} />
              <button type="submit" className="btn-primary btn-lg">{t.acceptBtn}</button>
            </form>

            <form action={declineAction} className="border-t border-cs-100 pt-4 flex flex-col gap-2">
              <input type="hidden" name="request_id" value={req.id} />
              <label className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.declineReason}
              </label>
              <div className="flex items-start gap-3">
                <textarea
                  name="decline_reason"
                  rows={2}
                  required
                  placeholder={t.declineReasonPH}
                  className="cs-input resize-none flex-1 text-[12px]"
                />
                <button type="submit" className="btn-danger btn-sm shrink-0 mt-0.5">
                  {t.declineBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : !isTerminal && nextStatus ? (
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              {t.evaluatorActions}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">

            {/* Advance workflow */}
            <div className="flex items-center gap-4 flex-wrap">
              <form action={advanceAccreditationStatus}>
                <input type="hidden" name="request_id" value={req.id} />
                <input type="hidden" name="next_status" value={nextStatus} />
                <button
                  type="submit"
                  className={nextStatus === "accredited" ? "btn-accent btn-lg" : "btn-primary btn-lg"}
                >
                  {actionLabel}
                </button>
              </form>
              {nextStatus === "accredited" && (
                <span className="text-[12px] font-mono text-cs-400">
                  {t.saveVerificationFirst}
                </span>
              )}
            </div>

            {/* Reject with reason */}
            <form action={rejectAction} className="border-t border-cs-100 pt-4 flex flex-col gap-2">
              <input type="hidden" name="request_id" value={req.id} />
              <label className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.rejectionReason}
              </label>
              <div className="flex items-start gap-3">
                <textarea
                  name="rejection_reason"
                  rows={2}
                  placeholder={t.rejectionPH}
                  className="cs-input resize-none flex-1 text-[12px]"
                />
                <button type="submit" className="btn-danger btn-sm shrink-0 mt-0.5">
                  {t.reject}
                </button>
              </div>
            </form>

          </div>
        </div>
      ) : null}
```

Note: the BLIPS/ADDIS verification panel block (lines 160-178) is unaffected — it only renders for `verification_in_progress`/`ready_for_verification`/`accredited`, never while acceptance is pending.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/evaluator/assignments/[id]/page.tsx
git commit -m "feat(evaluator): accept/decline panel + contact email on assignment detail"
```

---

### Task 7: Evaluator dashboard — action-needed = pending acceptance

**Files:**
- Modify: `src/app/app/evaluator/dashboard/page.tsx`

- [ ] **Step 1: Add acceptance_status to the type and query**

In `src/app/app/evaluator/dashboard/page.tsx`, extend the `Assignment` type (lines 11-18) to include:

```ts
  acceptance_status?: "pending" | "accepted";
```

Update the select (line 47) to include the column:

```ts
    .select("id, status, startup_name, startup_email, industry, updated_at, acceptance_status")
```

- [ ] **Step 2: Recompute the "action needed" stat**

Replace line 55:

```ts
  const actionNeeded = assignments.filter((a) => a.status === "evaluator_assigned").length;
```

with:

```ts
  const actionNeeded = assignments.filter((a) => a.acceptance_status === "pending").length;
```

- [ ] **Step 3: Highlight pending-acceptance rows + label**

Replace the row container className expression (line 135-137) so the highlight keys off acceptance instead of status:

```tsx
                className={`grid min-w-[660px] grid-cols-[1fr_120px_160px_120px_80px] px-5 py-3 border-b border-cs-100 items-center hover:bg-cs-50 transition-colors ${
                  a.acceptance_status === "pending" ? "bg-sb-light/30" : ""
                }`}
```

Then, in the status cell (lines 146-148), add a small hint under the badge when acceptance is pending:

```tsx
                <div>
                  <Badge variant={a.status}>{dict.status[a.status]}</Badge>
                  {a.acceptance_status === "pending" && (
                    <div className="text-[10px] font-mono text-sb-text uppercase tracking-widest mt-1">
                      {t.pendingAcceptance}
                    </div>
                  )}
                </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/evaluator/dashboard/page.tsx
git commit -m "feat(evaluator): action-needed counts pending acceptance + row hint"
```

---

### Task 8: Admin accreditations — show acceptance state + decline reason

**Files:**
- Modify: `src/app/admin/accreditations/page.tsx`

- [ ] **Step 1: Fetch the new columns**

In `src/app/admin/accreditations/page.tsx`, update the select (line 42) to include the new columns:

```ts
    .select("id, startup_name, startup_email, industry, status, evaluator_id, acceptance_status, evaluator_decline_reason, created_at, updated_at")
```

- [ ] **Step 2: Show acceptance state on assigned rows and decline note on returned rows**

Replace the evaluator cell block (lines 140-163, the `<div>` that renders `assignedName` / assign form / `—`) with:

```tsx
                    <div>
                      {assignedName ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-mono text-cs-500">{assignedName}</span>
                          <span
                            className={`text-[10px] font-mono uppercase tracking-widest ${
                              req.acceptance_status === "accepted" ? "text-green-700" : "text-yellow-600"
                            }`}
                          >
                            {req.acceptance_status === "accepted" ? t.acceptanceAccepted : t.acceptancePending}
                          </span>
                        </div>
                      ) : needsAssign ? (
                        <div className="flex flex-col gap-1">
                          <form action={assignEvaluatorToRequest} className="flex gap-1.5 items-center">
                            <input type="hidden" name="request_id" value={req.id} />
                            <select
                              name="evaluator_id"
                              required
                              className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black flex-1 min-w-0"
                            >
                              <option value="">{t.select}</option>
                              {(evaluators ?? []).map((e) => (
                                <option key={e.id} value={e.id}>{e.org_name}</option>
                              ))}
                            </select>
                            <button type="submit" className="btn-primary btn-sm shrink-0">
                              {t.assignBtn}
                            </button>
                          </form>
                          {req.evaluator_decline_reason && (
                            <span className="text-[10px] font-mono text-red-600">
                              {t.declinedReasonLabel}: {req.evaluator_decline_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] font-mono text-cs-300">—</span>
                      )}
                    </div>
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/accreditations/page.tsx
git commit -m "feat(admin): show acceptance state + decline reason in accreditations table"
```

---

### Task 9: Full build + manual preview verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with no type or compile errors.

- [ ] **Step 2: Start the dev preview**

Use `preview_start` (or `npm run dev`) and confirm the server is up.

- [ ] **Step 3: Manual flow — admin assigns**

As admin, open `/admin/accreditations`, filter "Unassigned". Confirm a freshly submitted startup appears as `pending_evaluator_assignment` (i.e. NOT auto-assigned). Assign an evaluator. Confirm the row now shows the evaluator name + "Pending acceptance".
Expected: evaluator receives the new-assignment email; startup receives the evaluator-assigned email (check Resend dashboard / logs).

- [ ] **Step 4: Manual flow — evaluator declines**

As that evaluator, open the assignment detail. Confirm: the Accept/Decline panel is shown and the workflow-advance/reject actions are hidden, and the startup "Contact email" appears as a `mailto:` link. Try to decline with an empty reason → blocked by the required field. Decline with a reason.
Expected: request returns to `pending_evaluator_assignment` and disappears from this evaluator's list; admin gets the decline email; `/admin/accreditations` shows the request unassigned again with the "Last declined: <reason>" note.

- [ ] **Step 5: Manual flow — evaluator accepts**

Re-assign (admin), then as the evaluator click "Accept Assignment". Confirm the workflow-advance + reject actions now appear and the acceptance panel is gone. Confirm the dashboard "Action Needed" stat decremented and the row hint cleared.
Expected: admin receives the accept email.

- [ ] **Step 6: Screenshot proof**

Capture `preview_screenshot` of (a) the evaluator acceptance panel and (b) the admin row showing acceptance state, and share with the user.

- [ ] **Step 7: Final commit (if any tweaks were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

(Skip if nothing changed.)

---

## Self-Review

**Spec coverage:**
- Req 1 (manual assignment) → Task 3 (remove `matchAndAssign`, consolidate `assignEvaluatorToRequest`). ✓
- Req 2 (accept/decline, reason required, returns to admin) → Tasks 1, 4, 6. ✓
- Req 3 (startup contact email to evaluator) → Task 6 Step 3 (mailto in snapshot; already shown in list/dashboard). ✓
- Req 4 (email evaluator on every assignment) → Task 3 Step 3 (`sendNewAssignment` in `assignEvaluatorToRequest`). ✓
- Decision: startup emailed at admin assignment → Task 3 Step 3 (`sendEvaluatorAssigned`). ✓
- Decision: admin emailed on both accept and decline → Tasks 2 + 4. ✓
- Decision: admin recipient `amadeus@boss.technology` → Task 2 Step 2 + Task 4 fallback. ✓
- Backfill so in-flight requests skip the panel → Task 1 Step 1. ✓
- Admin sees acceptance state + decline reason → Task 8. ✓

**Placeholder scan:** No TBD/TODO; all code blocks are complete; commands have expected output. ✓

**Type/name consistency:** `acceptance_status` ('pending'|'accepted') and `evaluator_decline_reason` used identically across migration (Task 1), type (Task 1), `assignEvaluatorToRequest` (Task 3), accept/decline actions (Task 4), detail page (Task 6), dashboard (Task 7), admin page (Task 8). Action names `acceptAssignment`/`declineAssignment` and form fields `request_id`/`decline_reason` match between Task 4 (actions) and Task 6 (forms). i18n keys (`contactEmail`, `acceptTitle`, `acceptDesc`, `acceptBtn`, `declineReason`, `declineReasonPH`, `declineBtn`, `pendingAcceptance`, `acceptancePending`, `acceptanceAccepted`, `declinedReasonLabel`) defined in Task 5 and consumed in Tasks 6-8. ✓
