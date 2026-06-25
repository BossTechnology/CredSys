# Test Mode + Entity Management (delete / edit email) — Design

**Date:** 2026-06-24
**Branch:** `fix/auth-rls-data-display`
**Status:** Approved design, pending spec review

## Goal

Give admins the tools to keep production data clean as third parties self-onboard:

1. **Delete entities** — remove a startup, accelerator, evaluator, investor, or competition (and all of its dependent records / login account).
2. **Edit a startup's email** — change it from the admin panel, synced across the entity record, the login account, and any pending setup token.
3. **Test Mode** — a global switch that flags everything created while it's ON as test data, plus a per-entity manual override, so test records can be badged, filtered, excluded from public/KPI numbers, and purged in bulk.

## Decisions (from brainstorming)

- **Test flagging mechanism:** global Test Mode switch (everything created while ON is `is_test=true`) **plus** a manual per-entity toggle (the global switch can't catch test startups that accelerators create while the switch is OFF, and the manual toggle also fixes false positives).
- **Test visibility:** test records are **badged** ("TEST") and **filterable** in operational admin/evaluator views (so flows stay testable with test data), but **excluded** from admin overview KPI counts and from public pages (cred-list, verify, public counters).
- **Delete scope:** all five entity types can be deleted individually, plus a "Purge test data" bulk action.
- **Edit email:** startups only; sync the entity record + `auth.users` login (if the account is activated) + any pending setup token.
- **Phasing:** ships in two independent phases, each with its own implementation plan.
  - **Phase 1:** Delete entities + Edit startup email.
  - **Phase 2:** Test Mode (switch, `is_test`, visibility, purge).

## Current state (as built)

- Entities are created at five points, all using the service client:
  - `src/app/api/intake/startup/route.ts`, `.../accelerator/route.ts`, `.../evaluator/route.ts`, `.../investor/route.ts` — each inserts the entity + an `account_setup_tokens` row + sends the E1 email.
  - `src/app/actions/competitions.ts:152` — `createCompetition` inserts into `competitions`.
- Admin lists live at `src/app/admin/{startups,accelerators,evaluators,investors,competitions}/page.tsx` and `src/app/admin/accreditations/page.tsx`. They use the service client and `dict.admin` i18n.
- `src/app/actions/admin.ts` holds admin server actions (`activateEvaluator`, `activateAccelerator`, `assignEvaluatorToRequest`, `resendSetupLink`). `requireAdmin()` (`src/lib/admin/require-admin.ts`) guards admin routes.
- Email change today is manual SQL only (done once for the "LinkClass" startup).
- The admin **startups** page currently has no delete and no edit-email action.

## FK / cascade map (verified) — drives the delete logic

Deleting an entity row triggers these DB rules. "Manual" = the app must clean it up because no FK covers it.

**startups** → `accreditation_requests` CASCADE, `cred_pages` CASCADE, `competition_scores` CASCADE, `competition_startups` CASCADE, `investor_watchlist` CASCADE, `accreditation_sponsorships` SET NULL. Manual: `account_setup_tokens` (entity_id), `user_profiles` (entity_id), `auth.users` (the linked login).

**competitions** → `competition_evaluators` CASCADE, `competition_scores` CASCADE, `competition_startups` CASCADE, `accreditation_requests.competition_id` SET NULL. Manual: none beyond the row itself (competitions have no login/token/profile).

**investors** → `investor_watchlist` CASCADE, `accreditation_sponsorships` SET NULL. Manual: `account_setup_tokens`, `user_profiles`, `auth.users`.

**accelerators** → `competitions.accelerator_id` SET NULL, `accreditation_sponsorships` SET NULL. Manual: `account_setup_tokens`, `user_profiles`, `auth.users`.

**evaluators** → `competition_evaluators` CASCADE, `accreditation_requests.evaluator_id` SET NULL, **`competition_scores` NO ACTION**. Manual: **delete `competition_scores` where evaluator_id = X first** (NO ACTION blocks the delete otherwise), then `account_setup_tokens`, `user_profiles`, `auth.users`.

## Phase 1 — Delete entities + Edit startup email

### Shared delete helper

A single internal helper performs the cleanup that every entity delete needs:

1. (evaluator only) delete `competition_scores` where `evaluator_id = entityId`.
2. delete `account_setup_tokens` where `entity_id = entityId` (any role).
3. read `user_profiles` where `entity_id = entityId`, collect `user_id`s.
4. delete those `user_profiles` rows.
5. delete the entity row (DB cascades handle the FK'd dependents above).
6. delete `auth.users` for the collected `user_id`s via `supabase.auth.admin.deleteUser(userId)` (service role).

Order matters: clear `competition_scores` (NO ACTION) before the entity row; delete `user_profiles` before/with the auth user. All steps run with the service client. Each step logs but does not abort the others on a soft error, except the entity-row delete which is the critical step.

### Server actions (`src/app/actions/admin.ts`)

- `deleteStartup(formData)` / `deleteAccelerator` / `deleteEvaluator` / `deleteInvestor` / `deleteCompetition` — each guards with `requireAdmin()`, then calls the shared helper with the right table + role. Competitions skip the login/token/profile steps.
- `purgeTestData(formData)` — guards `requireAdmin()`, then for each of the five tables selects rows where `is_test = true` and runs the per-entity delete on each. Returns counts. (Phase 2 — depends on `is_test`.)

### UI

- Each admin entity list gets a **Delete** action in its row, using one shared `<DeleteEntityButton>` client component across all five lists. Confirmation pattern: a two-step inline confirm — the first click reveals a "Confirm delete?" state, the second click submits the form to the matching action. (The bulk purge, below, uses a stronger typed confirmation.)
- `requireAdmin()` already gates the pages; the actions re-check.

### Edit startup email (`src/app/actions/admin.ts`)

`updateStartupEmail(formData)`:

1. `requireAdmin()`.
2. read `startupId`, `new_email`; normalize (`trim().toLowerCase()`); validate format; reject if empty/invalid.
3. uniqueness: reject if another `startups` row already uses `new_email`.
4. update `startups.email`.
5. find `user_profiles` where `entity_id = startupId` → if a `user_id` exists, call `supabase.auth.admin.updateUserById(userId, { email: new_email })` so the login stays in sync.
6. update any **unused** `account_setup_tokens` (entity_id = startupId, role='startup', used_at is null) `.email = new_email`.
7. `revalidatePath("/admin/startups")`.

UI: an inline editable email on the admin startups row (a shared `<EditEmailField>` client component) that posts to this action.

## Phase 2 — Test Mode

### Data model

- New table `app_settings`: single row, `test_mode boolean not null default false`, `updated_at timestamptz default now()`. Enforce single row (`id int primary key default 1 check (id = 1)`), seeded with one row.
- Add `is_test boolean not null default false` to: `startups`, `accelerators`, `evaluators`, `investors`, `competitions`.

### Global switch

- Helper `getTestMode(): Promise<boolean>` reads `app_settings.test_mode` (service client).
- Server action `setTestMode(formData)` — `requireAdmin()`, upserts `app_settings.test_mode`, revalidates admin.
- At each of the five creation points, read `getTestMode()` and set `is_test` on the inserted row.
- **Safeguard:** a prominent persistent banner in the admin layout whenever Test Mode is ON ("TEST MODE ON — new records are flagged as test"), with a one-click toggle off. This prevents leaving it ON and silently flagging real signups.

### Manual override

- Server action `toggleEntityTest(formData)` — `requireAdmin()`, flips `is_test` on a given entity row (table + id). Exposed as a small toggle in each admin entity list.

### Visibility

- **Badge:** test rows show a "TEST" badge in every operational admin list and in the evaluator dashboard/assignments.
- **Filter:** admin entity lists + admin accreditations get a filter to show all / hide test / test-only. Default: show all (badged) so flows remain testable.
- **Exclude from KPI counts:** admin overview stats exclude `is_test = true`.
- **Exclude from public:** public pages exclude test data — `cred-list`, the public credential/verify pages, and any public counters must filter `is_test = false` (for accreditations, exclude requests whose startup `is_test = true`).
- **Operational flows stay intact:** the evaluator dashboard, admin accreditations, and assignment pages still include test records (badged) so the team can exercise the full assign → accept/decline → accredit pipeline with test data.

### Purge

- `purgeTestData` (defined above) wired to a "Purge test data" button in the admin (e.g., overview or a settings area). Requires a typed confirmation and shows the count of records to be deleted per entity type before proceeding.

## i18n

Add en/es strings for: delete confirmations + buttons, edit-email field/labels/errors, Test Mode banner + toggle, TEST badge, test filters, and the purge confirmation.

## Edge cases

- **Delete with no login yet** (orphan entity like LinkClass): steps 3–4 and 6 find nothing — fine.
- **Evaluator with competition scores:** handled by deleting `competition_scores` first.
- **Edit email collision:** rejected before any write.
- **Edit email when no account exists:** skip the `auth.users` update, still update token + record.
- **Test Mode left ON:** mitigated by the persistent banner; real records flagged by mistake can be unflagged via the manual toggle before any purge.
- **Purge safety:** typed confirmation + per-type counts shown; only `is_test = true` rows are ever deleted.

## Out of scope (YAGNI)

- Editing email for non-startup entities (Phase: startups only).
- Soft-delete / trash / undo (deletes are hard deletes with confirmation).
- A separate staging environment (does not solve third parties testing in prod).
- Per-record audit log of deletes/edits.
