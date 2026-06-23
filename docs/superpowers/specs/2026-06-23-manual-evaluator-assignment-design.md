# Manual Evaluator Assignment + Accept/Decline — Design

**Date:** 2026-06-23
**Branch:** `fix/auth-rls-data-display`
**Status:** Approved design, pending spec review

## Goal

Change evaluator assignment from automatic to admin-driven, and let evaluators
accept or decline a startup they've been assigned. Make the startup's contact
email explicit for the evaluator, and email the evaluator on every assignment.

## Requirements

1. **Manual assignment.** Stop auto-assigning an evaluator when a startup
   submits. The admin assigns an evaluator to the startup manually.
2. **Accept / decline.** The assigned evaluator can accept or decline the
   startup. Declining requires a reason.
3. **Startup contact email.** When assigned and when viewing the startup
   profile, the evaluator sees the startup's email so they can make contact.
4. **Assignment email.** Email the evaluator every time a startup is assigned to
   them.

## Decisions (from brainstorming)

- **On decline:** request returns to the admin queue
  (`status = pending_evaluator_assignment`, `evaluator_id` cleared) for manual
  reassignment. No auto-reassignment.
- **Decline reason:** required.
- **Startup notification timing:** startup is emailed that an evaluator was
  assigned **at the moment the admin assigns** (current behavior, kept).
- **Accept/decline notifications:** admin is emailed on **both** accept and
  decline.
- **Admin recipient:** `amadeus@boss.technology`, via `ADMIN_NOTIFY_EMAIL`
  env var (code fallback to that address).

## Current state (as built)

- `submitAccreditationRequest` ([apply.ts](../../../src/app/actions/apply.ts))
  inserts the request with `status = pending_evaluator_assignment`, then calls
  `matchAndAssign()` which auto-picks an active evaluator, sets
  `evaluator_assigned`, and emails startup (E3) + evaluator (E3b).
- Admin manual assignment **already exists** in
  [admin/accreditations/page.tsx](../../../src/app/admin/accreditations/page.tsx)
  via `assignEvaluatorToRequest` ([admin.ts](../../../src/app/actions/admin.ts)),
  but that action does **not** send any email.
- A second, **unused** assignment path exists: the `assignEvaluator` action in
  [accreditation.ts](../../../src/app/actions/accreditation.ts) (sends both
  emails + notifies investor watchlist) and the `AssignEvaluatorForm` component.
  Neither is referenced anywhere — dead code.
- The startup email is **already shown** to the evaluator on the dashboard,
  assignments list, and assignment detail page.
- Emails go through Resend ([resend.ts](../../../src/lib/email/resend.ts)); env
  vars `FROM_EMAIL`, `SUPPORT_EMAIL` already exist.

## Architecture decision: model accept/decline as a dedicated column

Chosen over adding new values to the `AccreditationStatus` enum. The enum is
referenced across ~8 pages (badges, status colors, filters, `WorkflowStatusBar`,
admin/evaluator/startup dashboards). A dedicated `acceptance_status` column keeps
the change isolated: the request still moves to `evaluator_assigned` on
assignment, and the evaluator's workflow actions are gated behind acceptance.

## Data model

New migration `supabase/migrations/20260623000010_evaluator_acceptance.sql`,
altering `accreditation_requests`:

- `acceptance_status TEXT NOT NULL DEFAULT 'pending'` — `'pending' | 'accepted'`.
  Meaningful only while `evaluator_id` is set. Reset to `'pending'` on each new
  assignment.
- `evaluator_decline_reason TEXT` — the reason from the last decline, kept for
  admin visibility after the request returns to the queue.

**Backfill (same migration):** existing requests already past assignment must
not show the accept/decline panel. Set `acceptance_status = 'accepted'` for all
rows whose `status` is anything other than `pending_evaluator_assignment` (i.e.,
already assigned or further along). New `pending_evaluator_assignment` rows keep
the `'pending'` default.

Add both fields to the `AccreditationRequest` type in
[types.ts](../../../src/lib/supabase/types.ts).

## Behavior

### 1. Manual assignment

- Remove the `matchAndAssign()` call and its import in `apply.ts`. The request
  stays at `pending_evaluator_assignment`.
- Delete `src/lib/accreditation/matching.ts` (now unused).
- Consolidate all assignment into `assignEvaluatorToRequest` (admin.ts). On
  assign it must:
  - set `evaluator_id`, `status = 'evaluator_assigned'`,
    `acceptance_status = 'pending'`, and clear `evaluator_decline_reason`;
  - send the evaluator the new-assignment email (E3b) — **requirement 4**;
  - send the startup the evaluator-assigned email (E3);
  - notify investor watchlist subscribers (port this from the dead
    `assignEvaluator` action so it isn't lost);
  - `revalidatePath` for admin + evaluator views.
- Delete dead code: `assignEvaluator` in accreditation.ts and the
  `AssignEvaluatorForm` component.

### 2. Accept / decline (evaluator)

On the evaluator assignment detail page
([assignments/[id]/page.tsx](../../../src/app/app/evaluator/assignments/%5Bid%5D/page.tsx)):

- When `status === 'evaluator_assigned' && acceptance_status === 'pending'`:
  render an **Acceptance** panel (Accept button + Decline form with a required
  reason textarea) and **hide** the workflow-advance and reject actions.
- When accepted (or any later status): show the normal workflow actions as today.

Two new server actions (add to
[verification.ts](../../../src/app/actions/verification.ts), which already holds
evaluator-owned, ownership-checked actions):

- `acceptAssignment(formData)` — ownership check; set
  `acceptance_status = 'accepted'`; email admin (accepted); revalidate.
- `declineAssignment(formData)` — ownership check; reason **required** (return
  `{ error }` if empty); set `status = 'pending_evaluator_assignment'`,
  `evaluator_id = null`, `acceptance_status = 'pending'`,
  `evaluator_decline_reason = reason`; email admin (declined, with reason +
  startup + evaluator org); revalidate admin + evaluator views.

Evaluator dashboard/list: the "Action needed" stat counts assignments with
`acceptance_status === 'pending'`; show a small "Pending acceptance" hint.

### 3. Startup contact email (evaluator)

Already displayed in all three evaluator views. Enhance the startup snapshot on
the detail page: label the email "Contact email" and make it a `mailto:` link so
its purpose is explicit.

### 4. Admin notifications

New template `src/lib/email/templates/e16-evaluator-response.ts` with:

- `sendEvaluatorAccepted(to, evaluatorOrg, startupName)`
- `sendEvaluatorDeclined(to, evaluatorOrg, startupName, reason)`

Recipient: `process.env.ADMIN_NOTIFY_EMAIL ?? "amadeus@boss.technology"`. Add
`ADMIN_NOTIFY_EMAIL=amadeus@boss.technology` to `.env.local` (and note it for
Vercel env).

Admin accreditations page: show the acceptance state (Pending acceptance /
Accepted) on assigned rows, and surface `evaluator_decline_reason` as a note on
rows that returned to the queue after a decline.

### i18n

Add ES/EN strings for: acceptance panel (accept/decline/labels/reason
placeholder), evaluator dashboard "pending acceptance" hint, and admin
acceptance/decline indicators. Update both
[es.json](../../../src/lib/i18n/dictionaries/es.json) and
[en.json](../../../src/lib/i18n/dictionaries/en.json).

## Edge cases

- **Decline with empty reason:** action returns `{ error }`; UI shows it; no
  state change.
- **Stale action after status moved on:** all evaluator actions enforce
  `evaluator_id === profile.entity_id` and check current status before mutating.
- **Re-assignment after decline:** new assignment overwrites `evaluator_id` and
  resets `acceptance_status` to `'pending'`; previous `evaluator_decline_reason`
  is cleared.
- **No active evaluators:** admin simply has none to pick; request stays
  unassigned. (No auto behavior to fail.)

## Out of scope (YAGNI)

- Auto-reassignment / load-balancing logic (deleting `matching.ts`).
- A persistent decline history/audit table (single `evaluator_decline_reason`
  column is enough for v1).
- In-app (non-email) admin notifications.
- Per-admin routing of notifications (single configured address).
