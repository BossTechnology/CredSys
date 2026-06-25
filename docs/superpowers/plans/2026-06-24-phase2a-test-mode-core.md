# Phase 2a — Test Mode (core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A global Test Mode switch that flags every entity created while it's ON as `is_test=true`, with a persistent admin banner, a "TEST" badge on admin lists, exclusion of test data from public pages and admin KPI counts, and a bulk "Purge test data" action.

**Architecture:** A single-row `app_settings.test_mode` boolean is read by `getTestMode()` and consulted at the five entity-creation points. An `is_test` boolean column on the five entity tables marks test records. The admin layout shows a banner when ON; overview hosts the toggle + purge; `purgeTestData` reuses the Phase 1 `deleteEntityCascade` helper. (Manual per-entity toggling and show/hide filters are deferred to Phase 2b.)

**Tech Stack:** Next.js 15 App Router (Server Actions, `revalidatePath`), `@supabase/supabase-js` service-role client, Supabase migration via MCP, TypeScript, Tailwind, JSON i18n (en/es).

**Verification note:** No unit-test harness in this repo. Verify each task with `npx tsc --noEmit`; final task runs `npm run build` + manual admin checks + DB count checks. Do not scaffold a test runner.

**Depends on Phase 1:** `deleteEntityCascade` and `EntityTable` already exist in `src/app/actions/admin.ts` (committed) and are reused by `purgeTestData`.

---

### Task 1: Migration — `app_settings` + `is_test` columns

**Files:**
- Create: `supabase/migrations/20260624000011_test_mode.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Test Mode: global switch + per-entity test flag.

create table if not exists app_settings (
  id         int primary key default 1 check (id = 1),
  test_mode  boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into app_settings (id, test_mode) values (1, false)
  on conflict (id) do nothing;

alter table startups     add column if not exists is_test boolean not null default false;
alter table accelerators add column if not exists is_test boolean not null default false;
alter table evaluators   add column if not exists is_test boolean not null default false;
alter table investors    add column if not exists is_test boolean not null default false;
alter table competitions add column if not exists is_test boolean not null default false;
```

- [ ] **Step 2: Apply via Supabase MCP**

Apply with the Supabase MCP tool `apply_migration` (server id contains `5db91adc-0429-4eeb-b5b4-26833572548e`; load its schema via ToolSearch `select:mcp__5db91adc-0429-4eeb-b5b4-26833572548e__apply_migration`). Use name `test_mode`, project ref `rrhojefqjqcktgvsltvr`, and the SQL above. If a numeric project_id is required, find it via `list_projects`.

Verify with `execute_sql`:
`select test_mode from app_settings where id=1;` → expect one row `false`.
`select column_name, table_name from information_schema.columns where column_name='is_test' order by table_name;` → expect 5 rows (accelerators, competitions, evaluators, investors, startups).

If the MCP tool is unavailable, still create the migration file and commit it; report the apply step as a concern.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260624000011_test_mode.sql
git commit -m "feat(db): app_settings test_mode + is_test columns on entity tables"
```

---

### Task 2: `getTestMode` helper + `setTestMode` / `purgeTestData` actions

**Files:**
- Create: `src/lib/admin/test-mode.ts`
- Modify: `src/app/actions/admin.ts` (append two actions)

- [ ] **Step 1: Create the helper**

Create `src/lib/admin/test-mode.ts`:

```ts
import { createServiceClient } from "@/lib/supabase/service";

/** Reads the global Test Mode switch (app_settings single row). */
export async function getTestMode(): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from("app_settings")
    .select("test_mode")
    .eq("id", 1)
    .maybeSingle();
  return data?.test_mode ?? false;
}
```

- [ ] **Step 2: Append `setTestMode` + `purgeTestData` to `src/app/actions/admin.ts`**

```ts
// ─── Test Mode ───────────────────────────────────────────────────────────────

export async function setTestMode(formData: FormData) {
  if (!(await requireAdmin())) return;
  const on = formData.get("test_mode") === "on";
  const service = createServiceClient();
  await service
    .from("app_settings")
    .update({ test_mode: on, updated_at: new Date().toISOString() })
    .eq("id", 1);
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/overview");
}

/**
 * Hard-delete every entity flagged is_test across all five tables,
 * reusing deleteEntityCascade. Guarded by a typed "PURGE" confirmation.
 */
export async function purgeTestData(formData: FormData) {
  if (!(await requireAdmin())) return;
  const confirm = ((formData.get("confirm") as string) || "").trim().toUpperCase();
  if (confirm !== "PURGE") return;

  const service = createServiceClient();
  const tables: EntityTable[] = ["startups", "accelerators", "evaluators", "investors", "competitions"];

  for (const table of tables) {
    const { data: rows } = await service.from(table).select("id").eq("is_test", true);
    for (const r of rows ?? []) {
      await deleteEntityCascade(table, r.id as string);
    }
  }

  revalidatePath("/admin/overview");
  revalidatePath("/admin/startups");
  revalidatePath("/admin/accelerators");
  revalidatePath("/admin/evaluators");
  revalidatePath("/admin/investors");
  revalidatePath("/admin/competitions");
}
```

(`createServiceClient`, `requireAdmin`, `revalidatePath`, `deleteEntityCascade`, and the `EntityTable` type are all already present in `admin.ts` from Phase 1 — no new imports needed.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/test-mode.ts src/app/actions/admin.ts
git commit -m "feat(admin): getTestMode helper + setTestMode/purgeTestData actions"
```

---

### Task 3: Flag `is_test` at the five creation points

**Files:**
- Modify: `src/app/api/intake/startup/route.ts`
- Modify: `src/app/api/intake/accelerator/route.ts`
- Modify: `src/app/api/intake/evaluator/route.ts`
- Modify: `src/app/api/intake/investor/route.ts`
- Modify: `src/app/actions/competitions.ts` (`createCompetition`, ~line 152)

- [ ] **Step 1: Startup intake**

In `src/app/api/intake/startup/route.ts`, add the import near the top:
```ts
import { getTestMode } from "@/lib/admin/test-mode";
```
Just before the `const { data: startup, error: startupError } = await service.from("startups").insert({` line, add:
```ts
  const isTest = await getTestMode();
```
Then inside the `.insert({ ... })` object, add this line (e.g. after `team_size: ...`):
```ts
      is_test:        isTest,
```

- [ ] **Step 2: Accelerator intake**

In `src/app/api/intake/accelerator/route.ts`, add `import { getTestMode } from "@/lib/admin/test-mode";`. Before the `.from("accelerators").insert({` call add `const isTest = await getTestMode();`, and add `is_test: isTest,` inside the insert object (e.g. after `is_active: false,`).

- [ ] **Step 3: Evaluator intake**

In `src/app/api/intake/evaluator/route.ts`, add `import { getTestMode } from "@/lib/admin/test-mode";`. Before the `.from("evaluators").insert({` call add `const isTest = await getTestMode();`, and add `is_test: isTest,` inside the insert object. (Read the file first to confirm the insert object location.)

- [ ] **Step 4: Investor intake**

In `src/app/api/intake/investor/route.ts`, add `import { getTestMode } from "@/lib/admin/test-mode";`. Before the `.from("investors").insert({` call add `const isTest = await getTestMode();`, and add `is_test: isTest,` inside the insert object (e.g. after `is_active: false,`).

- [ ] **Step 5: Competition creation**

In `src/app/actions/competitions.ts`, add `import { getTestMode } from "@/lib/admin/test-mode";` near the top imports. In `createCompetition`, before the `const { error } = await service.from("competitions").insert({` call, add `const isTest = await getTestMode();`. Add `is_test: isTest,` inside the insert object (e.g. after `created_by: user.id,`).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit` → Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/intake/startup/route.ts src/app/api/intake/accelerator/route.ts src/app/api/intake/evaluator/route.ts src/app/api/intake/investor/route.ts src/app/actions/competitions.ts
git commit -m "feat: flag is_test on entities created while Test Mode is on"
```

---

### Task 4: Admin banner (layout) + Test Mode toggle (overview)

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Create: `src/components/admin/TestModeControl.tsx`
- Modify: `src/app/admin/overview/page.tsx` (render the control; i18n keys from Task 8)

- [ ] **Step 1: Banner in the admin layout**

In `src/app/admin/layout.tsx`, add the import:
```ts
import { getTestMode } from "@/lib/admin/test-mode";
```
Inside `AdminLayout`, after `const locale = await getAppLocale();`, add:
```ts
  const testMode = await getTestMode();
```
Then in the returned JSX, insert the banner right after `<AdminNav ... />` and before `<main ...>`:
```tsx
      {testMode && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-[12px] font-mono uppercase tracking-widest font-bold">
          ⚠ Test Mode ON — new records are flagged as test
        </div>
      )}
```

- [ ] **Step 2: Create the toggle/purge control component**

Create `src/components/admin/TestModeControl.tsx`:

```tsx
"use client";

import { useState } from "react";
import { setTestMode, purgeTestData } from "@/app/actions/admin";

interface TestModeControlProps {
  testMode:     boolean;
  onLabel:      string; // "Test Mode is ON"
  offLabel:     string; // "Test Mode is OFF"
  turnOnLabel:  string; // "Turn On"
  turnOffLabel: string; // "Turn Off"
  purgeLabel:   string; // "Purge test data"
  purgeHint:    string; // 'Type PURGE to confirm'
  purgeConfirm: string; // "Purge now"
}

export function TestModeControl({
  testMode, onLabel, offLabel, turnOnLabel, turnOffLabel, purgeLabel, purgeHint, purgeConfirm,
}: TestModeControlProps) {
  const [purging, setPurging] = useState(false);

  return (
    <div className="bg-white border border-cs-200 p-5 mb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className={`text-[13px] font-mono font-bold uppercase tracking-widest ${testMode ? "text-red-600" : "text-cs-500"}`}>
          {testMode ? onLabel : offLabel}
        </span>
        <form action={setTestMode}>
          <input type="hidden" name="test_mode" value={testMode ? "off" : "on"} />
          <button
            type="submit"
            className={`text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              testMode ? "border-cs-300 text-cs-600 hover:bg-cs-50" : "bg-red-600 text-white border-red-600 hover:bg-red-700"
            }`}
          >
            {testMode ? turnOffLabel : turnOnLabel}
          </button>
        </form>
      </div>

      <div className="border-t border-cs-100 pt-4">
        {!purging ? (
          <button
            type="button"
            onClick={() => setPurging(true)}
            className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            {purgeLabel}
          </button>
        ) : (
          <form action={purgeTestData} className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-cs-500">{purgeHint}</span>
            <input
              name="confirm"
              required
              placeholder="PURGE"
              className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black w-24"
            />
            <button type="submit" className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border border-red-300 bg-red-600 text-white hover:bg-red-700">
              {purgeConfirm}
            </button>
            <button
              type="button"
              onClick={() => setPurging(false)}
              className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black"
            >
              ✕
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render the control on the overview page**

In `src/app/admin/overview/page.tsx`, add imports:
```ts
import { getTestMode } from "@/lib/admin/test-mode";
import { TestModeControl } from "@/components/admin/TestModeControl";
```
Inside the component, after the existing `const service = createServiceClient();` line, add:
```ts
  const testMode = await getTestMode();
```
In the JSX, right after the closing `</div>` of the Header block (before the `{/* Alert banners */}` comment), insert:
```tsx
      <TestModeControl
        testMode={testMode}
        onLabel={t.testModeOn}
        offLabel={t.testModeOff}
        turnOnLabel={t.testModeTurnOn}
        turnOffLabel={t.testModeTurnOff}
        purgeLabel={t.purgeTest}
        purgeHint={t.purgeHint}
        purgeConfirm={t.purgeConfirm}
      />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` → Expected: PASS (the i18n keys are added in Task 8; if running this task before Task 8, the keys won't exist yet — implement Task 8 first OR temporarily expect the `t.*` keys to resolve as `string | undefined`. To keep tasks independent, DO Task 8 before this task's typecheck, or run Task 8 now.)

NOTE TO IMPLEMENTER: Do **Task 8 (i18n) before Task 4** so the `t.testMode*` / `t.purge*` keys exist. The plan lists i18n last for readability, but execute Task 8 first.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/components/admin/TestModeControl.tsx src/app/admin/overview/page.tsx
git commit -m "feat(admin): Test Mode banner + toggle/purge control on overview"
```

---

### Task 5: Exclude test data from overview KPI counts

**Files:**
- Modify: `src/app/admin/overview/page.tsx`

- [ ] **Step 1: Add `.eq("is_test", false)` to entity counts and exclude test startups from request counts**

Replace the entire `Promise.all([...])` count block (the `evaluators`, `accreditation_requests`, `competitions`, `startups` count queries) with this version. First fetch test startup ids, then filter request-based counts by excluding them:

```ts
  const { data: testStartupRows } = await service.from("startups").select("id").eq("is_test", true);
  const testStartupIds = (testStartupRows ?? []).map((s) => s.id as string);
  const notTestReq = (q: ReturnType<typeof service.from>) =>
    testStartupIds.length
      ? (q as ReturnType<ReturnType<typeof service.from>["select"]>).not("startup_id", "in", `(${testStartupIds.join(",")})`)
      : q;

  const [
    { count: activeEvaluators  },
    { count: pendingEvaluators },
    { count: totalAccredited   },
    { count: pendingAssignment },
    { count: inProgress        },
    { count: activeComps       },
    { count: totalStartups     },
    { data:  recentRequests    },
  ] = await Promise.all([
    service.from("evaluators").select("*", { count: "exact", head: true }).eq("is_active", true).eq("is_test", false),
    service.from("evaluators").select("*", { count: "exact", head: true }).eq("is_active", false).eq("is_test", false),
    notTestReq(service.from("accreditation_requests").select("startup_id", { count: "exact", head: true }).eq("status", "accredited")),
    notTestReq(service.from("accreditation_requests").select("startup_id", { count: "exact", head: true }).eq("status", "pending_evaluator_assignment")),
    notTestReq(service.from("accreditation_requests").select("startup_id", { count: "exact", head: true })
      .in("status", ["evaluator_assigned", "meeting_scheduled", "chass1s_shared",
                     "implementation_in_progress", "ready_for_verification", "verification_in_progress"])),
    service.from("competitions").select("*", { count: "exact", head: true }).eq("status", "active").eq("is_test", false),
    service.from("startups").select("*", { count: "exact", head: true }).eq("is_test", false),
    service
      .from("accreditation_requests")
      .select("id, startup_name, startup_email, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);
```

If the `notTestReq` typing proves awkward under `npx tsc --noEmit`, simplify by typing it as `(q: any) => any` with an eslint-disable for that one line — the runtime behavior (apply `.not("startup_id","in", ...)` only when there are test ids) is what matters. Keep the `.eq("is_test", false)` on the entity-table counts exactly as shown.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/overview/page.tsx
git commit -m "feat(admin): exclude test data from overview KPI counts"
```

---

### Task 6: Exclude test startups from the public cred-list

**Files:**
- Modify: `src/app/[locale]/cred-list/page.tsx`

- [ ] **Step 1: Add `is_test` to the embed type and query, then filter it out**

In `src/app/[locale]/cred-list/page.tsx`, extend the `CredRow` interface's `startups` shape to include `is_test`:

```ts
  startups: {
    org_name: string;
    industry: string | null;
    country:  string | null;
    is_test:  boolean;
  } | null;
```

Update the select to fetch it:

```ts
    .select("unique_code, accredited_at, startups(org_name, industry, country, is_test)")
```

Replace `const creds = rows ?? [];` with a filter that drops test startups:

```ts
  const creds = (rows ?? []).filter((r) => !r.startups?.is_test);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/cred-list/page.tsx"
git commit -m "feat(public): exclude test startups from the public cred list"
```

---

### Task 7: "TEST" badge on admin entity lists

**Files:**
- Modify: `src/app/admin/startups/page.tsx`
- Modify: `src/app/admin/accelerators/page.tsx`
- Modify: `src/app/admin/evaluators/page.tsx`
- Modify: `src/app/admin/investors/page.tsx`
- Modify: `src/app/admin/competitions/page.tsx`

For each page: add `is_test` to the entity `.select(...)`, then render a small TEST badge next to the org/name. The badge markup is identical everywhere:

```tsx
{X.is_test && (
  <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
)}
```

- [ ] **Step 1: Startups** — in `src/app/admin/startups/page.tsx`, add `is_test` to the `.select("id, org_name, email, industry, country, website, stage, team_size, logo_url, created_at")` (→ append `, is_test`). In the name cell, the org name is rendered as `<div className="text-[12px] font-semibold truncate">{s.org_name}</div>` inside a `flex items-center gap-2`. Add, right after that `<div>{s.org_name}</div>`:
```tsx
                        {s.is_test && (
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
                        )}
```

- [ ] **Step 2: Accelerators** — add `, is_test` to `.select("id, org_name, email, industry, country, is_active, created_at")`. The name is `<div className="text-[13px] font-semibold">{acc.org_name}</div>`. Wrap name + badge in a flex row by replacing that line with:
```tsx
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold">{acc.org_name}</div>
                      {acc.is_test && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
                      )}
                    </div>
```

- [ ] **Step 3: Evaluators** — add `, is_test` to `.select("id, org_name, email, industry, country, is_active, created_at")`. Replace `<div className="text-[13px] font-semibold">{ev.org_name}</div>` with:
```tsx
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold">{ev.org_name}</div>
                      {ev.is_test && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
                      )}
                    </div>
```

- [ ] **Step 4: Investors** — add `, is_test` to `.select("id, org_name, email, investment_focus, country, is_active, created_at")`. Replace `<div className="text-[13px] font-semibold truncate">{inv.org_name}</div>` with:
```tsx
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold truncate">{inv.org_name}</div>
                      {inv.is_test && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
                      )}
                    </div>
```

- [ ] **Step 5: Competitions** — add `, is_test` to `.select("id, name, description, industry, status, start_date, end_date, accelerator_id, created_at")`. In the row, the name + status badge sit in `<div className="flex items-center gap-2 mb-1">`. After the status `<span>...{comp.status}...</span>` inside that flex row, add:
```tsx
                    {comp.is_test && (
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 bg-red-600 text-white shrink-0">TEST</span>
                    )}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit` → Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/startups/page.tsx src/app/admin/accelerators/page.tsx src/app/admin/evaluators/page.tsx src/app/admin/investors/page.tsx src/app/admin/competitions/page.tsx
git commit -m "feat(admin): TEST badge on entity list rows"
```

---

### Task 8: i18n strings (en + es) — DO THIS BEFORE TASK 4

**Files:**
- Modify: `src/lib/i18n/dictionaries/en.json` (`admin` object)
- Modify: `src/lib/i18n/dictionaries/es.json` (`admin` object)

- [ ] **Step 1: Add to the `"admin"` object in `en.json`**

```json
    "testModeOn": "Test Mode is ON",
    "testModeOff": "Test Mode is OFF",
    "testModeTurnOn": "Turn On",
    "testModeTurnOff": "Turn Off",
    "purgeTest": "Purge test data",
    "purgeHint": "Type PURGE to confirm",
    "purgeConfirm": "Purge now"
```

- [ ] **Step 2: Add to the `"admin"` object in `es.json`**

```json
    "testModeOn": "Modo Prueba ACTIVADO",
    "testModeOff": "Modo Prueba DESACTIVADO",
    "testModeTurnOn": "Activar",
    "testModeTurnOff": "Desactivar",
    "purgeTest": "Purgar datos de prueba",
    "purgeHint": "Escribe PURGE para confirmar",
    "purgeConfirm": "Purgar ahora"
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "require('./src/lib/i18n/dictionaries/en.json'); require('./src/lib/i18n/dictionaries/es.json'); console.log('json ok')"` → Expected: `json ok`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/en.json src/lib/i18n/dictionaries/es.json
git commit -m "i18n: add Test Mode + purge admin strings (en/es)"
```

---

### Task 9: Full build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Build** — `npm run build` → Expected: succeeds, no type errors.

- [ ] **Step 2: Preview** — `preview_start` (config `dev`); confirm up.

- [ ] **Step 3: Toggle Test Mode** — as admin at `/admin/overview`, click **Turn On**. Expected: the red banner appears across admin pages; the control shows "Test Mode is ON".

- [ ] **Step 4: Create-while-on flags is_test** — with Test Mode ON, submit a startup via the public apply form (or `POST /api/intake/startup`). Verify:
`select org_name, is_test from startups order by created_at desc limit 1;` → expect `is_test = true`. Confirm the new row shows a **TEST** badge in `/admin/startups`, and does NOT appear on the public `/en/cred-list` (it won't until accredited anyway — also confirm an accredited test startup is absent from cred-list if one exists). Turn Test Mode **Off** and confirm a subsequently created startup has `is_test = false`.

- [ ] **Step 5: KPI exclusion** — confirm `/admin/overview` "Total Startups" does not count the test startup (compare with `select count(*) from startups where is_test=false;`).

- [ ] **Step 6: Purge** — in the overview control, click **Purge test data**, type `PURGE`, confirm. Expected: all `is_test=true` rows across the five tables are deleted (and their logins/tokens cleaned). Verify:
`select (select count(*) from startups where is_test) s, (select count(*) from accelerators where is_test) a, (select count(*) from evaluators where is_test) e, (select count(*) from investors where is_test) i, (select count(*) from competitions where is_test) c;` → expect all zeros. Typing something other than `PURGE` must do nothing.

- [ ] **Step 7: Screenshot proof** — `preview_screenshot` of the overview with the Test Mode control + banner; share with the user.

- [ ] **Step 8: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during phase 2a verification"
```
(Skip if nothing changed.)

---

## Self-Review

**Spec coverage (Phase 2a portion):**
- `app_settings` + `is_test` columns → Task 1. ✓
- `getTestMode` / `setTestMode` → Task 2. ✓
- Mark is_test at all 5 creation points → Task 3. ✓
- Persistent banner when ON → Task 4 (layout). ✓
- Global toggle → Task 4 (TestModeControl on overview). ✓
- Exclude from KPI counts → Task 5. ✓
- Exclude from public pages (cred-list) → Task 6. ✓
- TEST badge in operational admin views → Task 7. ✓
- `purgeTestData` + typed confirmation UI → Tasks 2 + 4. ✓
- i18n → Task 8. ✓
- (Deferred to Phase 2b, per the approved split: manual per-entity `toggleEntityTest`, and show/hide test filters on lists.)

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands list expected output. The Task 4 note explicitly orders Task 8 first to satisfy i18n keys. ✓

**Type/name consistency:** `getTestMode` (Task 2) consumed in Tasks 3, 4, 5. `setTestMode`/`purgeTestData` (Task 2) consumed by `TestModeControl` (Task 4). `app_settings`/`is_test` (Task 1) used in Tasks 2–7. Form fields `test_mode` (on/off) and `confirm` (PURGE) match between actions (Task 2) and the control (Task 4). i18n keys (`testModeOn/Off/TurnOn/TurnOff`, `purgeTest/Hint/Confirm`) defined in Task 8 and used in Task 4. The `is_test` column added to each list's select matches the badge guard in Task 7. ✓
