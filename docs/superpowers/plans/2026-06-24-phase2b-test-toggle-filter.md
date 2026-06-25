# Phase 2b — Manual Test Toggle + Test Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let admins manually mark/unmark any entity as test data (so stray test records created while Test Mode was OFF can be flagged for purge), and filter each admin list to "Test only".

**Architecture:** A `toggleEntityTest` server action flips `is_test` on a given table+id. A shared `<TestToggle>` client component (two-step, like DeleteEntityButton) posts to it. Each of the five admin lists gets the toggle in its actions area plus a simple `?test=only` filter tab.

**Tech Stack:** Next.js 15 App Router (Server Actions, `revalidatePath`), Supabase service client, TypeScript, Tailwind, JSON i18n.

**Depends on Phase 2a:** `is_test` columns + `EntityTable` type exist.

**Verification:** `npx tsc --noEmit` per task; final task `npm run build` + a DB toggle check.

---

### Task 1: `toggleEntityTest` action + i18n

**Files:**
- Modify: `src/app/actions/admin.ts` (append action)
- Modify: `src/lib/i18n/dictionaries/en.json` + `es.json` (`admin` object)

- [ ] **Step 1: Append the action to `src/app/actions/admin.ts`**

```ts
export async function toggleEntityTest(formData: FormData) {
  if (!(await requireAdmin())) return;
  const table = formData.get("table") as EntityTable;
  const id    = formData.get("entity_id") as string;
  const makeTest = formData.get("make_test") === "true";
  const valid: EntityTable[] = ["startups", "accelerators", "evaluators", "investors", "competitions"];
  if (!id || !valid.includes(table)) return;

  const service = createServiceClient();
  await service.from(table).update({ is_test: makeTest }).eq("id", id);

  revalidatePath(`/admin/${table}`);
  revalidatePath("/admin/overview");
}
```

(`requireAdmin`, `createServiceClient`, `revalidatePath`, and `EntityTable` already exist in this file.)

- [ ] **Step 2: Add i18n keys to the `"admin"` object in `en.json`**

```json
    "markTest": "Mark test",
    "unmarkTest": "Unmark test",
    "filterTestOnly": "Test"
```

- [ ] **Step 3: Add to the `"admin"` object in `es.json`**

```json
    "markTest": "Marcar prueba",
    "unmarkTest": "Quitar prueba",
    "filterTestOnly": "Prueba"
```

- [ ] **Step 4: Validate + typecheck**

Run: `node -e "require('./src/lib/i18n/dictionaries/en.json'); require('./src/lib/i18n/dictionaries/es.json'); console.log('json ok')"` → `json ok`.
Run: `npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/admin.ts src/lib/i18n/dictionaries/en.json src/lib/i18n/dictionaries/es.json
git commit -m "feat(admin): toggleEntityTest action + test-toggle i18n"
```

---

### Task 2: `<TestToggle>` client component

**Files:**
- Create: `src/components/admin/TestToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { toggleEntityTest } from "@/app/actions/admin";

interface TestToggleProps {
  table:        "startups" | "accelerators" | "evaluators" | "investors" | "competitions";
  entityId:     string;
  isTest:       boolean;
  markLabel:    string; // "Mark test"
  unmarkLabel:  string; // "Unmark test"
}

/** One-click toggle that flips an entity's is_test flag. */
export function TestToggle({ table, entityId, isTest, markLabel, unmarkLabel }: TestToggleProps) {
  return (
    <form action={toggleEntityTest}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="entity_id" value={entityId} />
      <input type="hidden" name="make_test" value={isTest ? "false" : "true"} />
      <button
        type="submit"
        className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${
          isTest
            ? "border-red-300 text-red-600 hover:bg-red-50"
            : "border-cs-200 text-cs-400 hover:border-black hover:text-black"
        }`}
      >
        {isTest ? unmarkLabel : markLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck** → `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit**

```bash
git add src/components/admin/TestToggle.tsx
git commit -m "feat(admin): shared TestToggle component"
```

---

### Task 3: Startups — toggle + Test filter

**Files:** Modify `src/app/admin/startups/page.tsx`

- [ ] **Step 1: Import** — add:
```ts
import { TestToggle } from "@/components/admin/TestToggle";
```

- [ ] **Step 2: Test-only filter.** The page already destructures `const { filter } = await searchParams;`. After the existing `filtered` computation and its `filter === ...` branches, add a test branch. Find the block:
```ts
  } else if (filter === "accredited") {
    filtered = filtered.filter((s) => s.request?.status === "accredited");
  }
```
and add immediately after it:
```ts
  if (filter === "test") {
    filtered = filtered.filter((s) => s.is_test);
  }
```
Then add a "Test" tab to the `FILTERS` array (after the `accredited` entry):
```ts
    { label: t.filterTestOnly, value: "test" },
```
(`s.is_test` is already selected — Phase 2a added `is_test` to this page's select.)

- [ ] **Step 3: Toggle in the actions cell.** The actions cell is `<div className="flex flex-col items-start gap-1.5">` containing the resend form, the Active span, and `<DeleteEntityButton ... />`. Add the toggle right before `<DeleteEntityButton`:
```tsx
                      <TestToggle
                        table="startups"
                        entityId={s.id}
                        isTest={s.is_test}
                        markLabel={t.markTest}
                        unmarkLabel={t.unmarkTest}
                      />
```

- [ ] **Step 4: Typecheck** → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/app/admin/startups/page.tsx
git commit -m "feat(admin): test toggle + test filter on startups page"
```

---

### Task 4: Accelerators — toggle + Test filter

**Files:** Modify `src/app/admin/accelerators/page.tsx`

- [ ] **Step 1: Import** — add `import { TestToggle } from "@/components/admin/TestToggle";`

- [ ] **Step 2: Test filter.** The page builds `query` with an `if (filter === "pending")` branch. After that branch add:
```ts
  if (filter === "test") {
    query = query.eq("is_test", true) as typeof query;
  }
```
Add a "Test" tab to the filter tabs array (the `[{ label: t.all, ... }, { label: t.pending, ... }]` list), appending:
```ts
            { label: t.filterTestOnly, href: "/admin/accelerators?filter=test", value: "test" },
```

- [ ] **Step 3: Toggle in the actions cell.** The actions cell is `<div className="flex flex-col items-start gap-1.5">` with the activate form and `<DeleteEntityButton .../>`. Add right before `<DeleteEntityButton`:
```tsx
                    <TestToggle
                      table="accelerators"
                      entityId={acc.id}
                      isTest={acc.is_test}
                      markLabel={t.markTest}
                      unmarkLabel={t.unmarkTest}
                    />
```

- [ ] **Step 4: Typecheck** → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/app/admin/accelerators/page.tsx
git commit -m "feat(admin): test toggle + test filter on accelerators page"
```

---

### Task 5: Evaluators — toggle + Test filter

**Files:** Modify `src/app/admin/evaluators/page.tsx`

- [ ] **Step 1: Import** — add `import { TestToggle } from "@/components/admin/TestToggle";`

- [ ] **Step 2: Test filter.** After the `if (filter === "pending") { query = query.eq("is_active", false) ... }` branch, add:
```ts
  if (filter === "test") {
    query = query.eq("is_test", true) as typeof query;
  }
```
The evaluators page renders filter tabs from an inline array `[{ label: t.all, href: "/admin/evaluators", isPending: false }, { label: t.pending, href: "/admin/evaluators?filter=pending", isPending: true }]` and marks active via `(filter === "pending") === tab.isPending`. To add a Test tab cleanly without breaking that boolean logic, change the active-state check and add a third tab. Replace the whole tab `.map(...)` block:
```tsx
          {[
            { label: t.all,     href: "/admin/evaluators",                isPending: false },
            { label: t.pending, href: "/admin/evaluators?filter=pending", isPending: true  },
          ].map((tab) => (
            <a
              key={tab.label}
              href={tab.href}
              className={`text-[12px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                (filter === "pending") === tab.isPending
                  ? "bg-black text-white border-black"
                  : "bg-white text-cs-500 border-cs-200 hover:border-black"
              }`}
            >
              {tab.label}
            </a>
          ))}
```
with:
```tsx
          {[
            { label: t.all,            href: "/admin/evaluators",                value: ""        },
            { label: t.pending,        href: "/admin/evaluators?filter=pending", value: "pending" },
            { label: t.filterTestOnly, href: "/admin/evaluators?filter=test",    value: "test"    },
          ].map((tab) => (
            <a
              key={tab.label}
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
```

- [ ] **Step 3: Toggle in the actions cell.** The actions cell is `<div className="flex flex-col items-start gap-1.5">` with the activate form and `<DeleteEntityButton .../>`. Add right before `<DeleteEntityButton`:
```tsx
                    <TestToggle
                      table="evaluators"
                      entityId={ev.id}
                      isTest={ev.is_test}
                      markLabel={t.markTest}
                      unmarkLabel={t.unmarkTest}
                    />
```

- [ ] **Step 4: Typecheck** → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/app/admin/evaluators/page.tsx
git commit -m "feat(admin): test toggle + test filter on evaluators page"
```

---

### Task 6: Investors — toggle + Test filter

**Files:** Modify `src/app/admin/investors/page.tsx`

- [ ] **Step 1: Import** — add `import { TestToggle } from "@/components/admin/TestToggle";`

- [ ] **Step 2: Test filter.** After the `if (filter === "pending") { query = query.eq("is_active", false) ... }` branch, add:
```ts
  if (filter === "test") {
    query = query.eq("is_test", true) as typeof query;
  }
```
Add a Test tab to the filter tabs array (the `[{ label: t.all, href: "/admin/investors", value: "" }, { label: t.pending, href: "/admin/investors?filter=pending", value: "pending" }]` list), appending:
```ts
            { label: t.filterTestOnly, href: "/admin/investors?filter=test", value: "test" },
```

- [ ] **Step 3: Toggle in the actions cell.** The actions cell is `<div className="flex flex-col items-start gap-1.5">` with the activate form and `<DeleteEntityButton .../>`. Add right before `<DeleteEntityButton`:
```tsx
                    <TestToggle
                      table="investors"
                      entityId={inv.id}
                      isTest={inv.is_test}
                      markLabel={t.markTest}
                      unmarkLabel={t.unmarkTest}
                    />
```

- [ ] **Step 4: Typecheck** → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/app/admin/investors/page.tsx
git commit -m "feat(admin): test toggle + test filter on investors page"
```

---

### Task 7: Competitions — toggle + Test filter

**Files:** Modify `src/app/admin/competitions/page.tsx`

The competitions page currently takes NO `searchParams`. Add them.

- [ ] **Step 1: Import** — add `import { TestToggle } from "@/components/admin/TestToggle";`

- [ ] **Step 2: Accept searchParams + filter.** Change the function signature from:
```tsx
export default async function AdminCompetitionsPage() {
```
to:
```tsx
export default async function AdminCompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
```
The competitions are fetched via `service.from("competitions").select(...)`. After `.order("created_at", { ascending: false })`, the result is awaited inside the `Promise.all`. To filter, change the competitions query to conditionally add `.eq("is_test", true)`. Replace:
```tsx
    service
      .from("competitions")
      .select("id, name, description, industry, status, start_date, end_date, accelerator_id, created_at, is_test")
      .order("created_at", { ascending: false }),
```
with:
```tsx
    (filter === "test"
      ? service.from("competitions").select("id, name, description, industry, status, start_date, end_date, accelerator_id, created_at, is_test").eq("is_test", true)
      : service.from("competitions").select("id, name, description, industry, status, start_date, end_date, accelerator_id, created_at, is_test")
    ).order("created_at", { ascending: false }),
```
(Note: Phase 2a already appended `, is_test` to this select — keep it.)

- [ ] **Step 3: Filter tabs.** The competitions header `<div className="flex flex-col sm:flex-row ...">` currently has only the title block (no tabs). Add a tabs block as a sibling after the title `<div>` and before the header's closing `</div>`:
```tsx
        <div className="flex flex-wrap gap-2">
          {[
            { label: t.all,            href: "/admin/competitions",             value: ""     },
            { label: t.filterTestOnly, href: "/admin/competitions?filter=test", value: "test" },
          ].map((tab) => (
            <a
              key={tab.label}
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
```

- [ ] **Step 4: Toggle beside Manage/Delete.** In Phase 2a/1 the row ends with `<div className="flex items-center gap-3 shrink-0">` containing the Manage `<Link>` and `<DeleteEntityButton .../>`. Add the toggle right before `<DeleteEntityButton`:
```tsx
                  <TestToggle
                    table="competitions"
                    entityId={comp.id}
                    isTest={comp.is_test}
                    markLabel={t.markTest}
                    unmarkLabel={t.unmarkTest}
                  />
```

- [ ] **Step 5: Typecheck** → PASS.
- [ ] **Step 6: Commit**
```bash
git add src/app/admin/competitions/page.tsx
git commit -m "feat(admin): test toggle + test filter on competitions page"
```

---

### Task 8: Build + verify

**Files:** none

- [ ] **Step 1: Build** — `npm run build` → succeeds.
- [ ] **Step 2: DB toggle check (no admin login needed).** Pick a live startup id and simulate the toggle action's effect to confirm the column/flow:
`update startups set is_test = true where id = '<a live startup id>'; select org_name, is_test from startups where id='<id>';` → is_test true; then revert: `update startups set is_test=false where id='<id>';`. (This validates the column; the action itself is exercised in the UI.)
- [ ] **Step 3: Preview** — `preview_start`; as admin, open `/admin/startups`, confirm each row shows a **Mark test / Unmark test** toggle and a **Test** filter tab; toggling flips the TEST badge.
- [ ] **Step 4: Screenshot** — `preview_screenshot` of a list with the toggle + Test tab; share.

---

## Self-Review

**Spec coverage (Phase 2b):**
- Manual per-entity `toggleEntityTest` → Task 1; UI toggle on all 5 lists → Tasks 3–7. ✓
- Show/hide test filter → implemented as a "Test only" filter tab on all 5 lists (Tasks 3–7); test rows remain visible-with-badge in the default "All" view, satisfying the review-before-purge need. ✓
- i18n → Task 1. ✓

**Placeholder scan:** No TBD/TODO; all steps have complete code. ✓

**Type/name consistency:** `toggleEntityTest` (Task 1) consumed by `<TestToggle>` (Task 2), used in Tasks 3–7. Form fields `table`/`entity_id`/`make_test` match between action (Task 1) and component (Task 2). i18n keys `markTest`/`unmarkTest`/`filterTestOnly` defined in Task 1, used in Tasks 3–7. `is_test` is already on every list's select (Phase 2a). Filter value `"test"` consistent across pages. ✓
