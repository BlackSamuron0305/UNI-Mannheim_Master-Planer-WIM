# Master Planner Core Engine + Wifo Program — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Vite+React+TS app, the generic program/group/module
data model and `evaluateGroup` rule engine, and a fully working planner for
one program (M.Sc. Business Informatics / "Wifo") — proving the
architecture end-to-end before the remaining four programs are added as
follow-on data-only plans.

**Architecture:** Two-layer data model (catalog modules keyed by code,
program definitions referencing pools of those modules with declarative
ECTS/count rules) driving a generic UI (picker → planner, with a
group-progress panel, module table, and drag-and-drop semester board). See
the spec for full rationale.

**Tech Stack:** Vite, React 18, TypeScript, Vitest + React Testing Library,
plain CSS. No router library, no backend.

**Spec:** `docs/superpowers/specs/2026-09-01-master-planner-redesign-design.md`

## Global Constraints

- No backend, no accounts — client-only static app, persistence via
  `localStorage`.
- No UI framework/utility CSS library (plain CSS).
- Prerequisites and irregular-offering modules are informational badges
  only — never block selection.
- One module registry, deduplicated by `code` across all catalog files —
  a duplicate code across catalogs is a build-time error, not a silent
  overwrite.
- Every module record's `sourceCatalog` and `available` fields must be set;
  data tasks must hand-verify extracted fields against the source PDF, not
  copy scratch JSON blindly.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/global.css`
- Create: `vitest.config.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: an `App` component (default export from `src/App.tsx`) rendering a root `<div className="app-shell">` — later tasks replace its body.

- [ ] **Step 1: Initialize the Vite React-TS project**

Run in the repo root:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about a non-empty directory, proceed (existing files like `Bachelor.py` and `Modul-Catalogues/` are unrelated and untouched). Delete the generated placeholder `src/App.css`, `src/index.css`, and sample assets — they're replaced below.

- [ ] **Step 2: Add Vitest + Testing Library**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
```

Create `src/test-setup.ts`:
```ts
import "@testing-library/jest-dom";
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Base shell and global reset**

`src/styles/global.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif; }
.app-shell { min-height: 100vh; }
```

`src/App.tsx`:
```tsx
import "./styles/global.css";

export default function App() {
  return <div className="app-shell" />;
}
```

`src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Write the smoke test**

`src/App.test.tsx`:
```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the app shell", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".app-shell")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Verify build, dev server, and test all work**

Run: `npm run test` — expect PASS.
Run: `npm run build` — expect a successful build with no TS errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src vitest.config.ts .gitignore
git commit -m "Scaffold Vite + React + TS project for the master planner redesign"
```

---

### Task 2: Core types and the evaluateGroup rule engine

**Files:**
- Create: `src/data/types.ts`
- Create: `src/lib/planEngine.ts`
- Test: `src/lib/planEngine.test.ts`

**Interfaces:**
- Consumes: nothing (foundational).
- Produces: types `Module`, `ExamType`, `SemesterOffering`, `ModulePool`, `TagRequirement`, `GroupRule`, `Group`, `Program`, `Plan` from `src/data/types.ts`; function `evaluateGroup(group: Group, poolModules: Module[], plan: Plan): GroupEvaluation` and type `GroupEvaluation` from `src/lib/planEngine.ts`. All later tasks import from these two files — do not rename fields.

- [ ] **Step 1: Write the types**

`src/data/types.ts`:
```ts
export type ExamType = "no" | "short" | "mid" | "long" | "unknown";
export type SemesterOffering = "HWS" | "FSS" | "BOTH" | "IRREGULAR" | "UNKNOWN";

export interface Module {
  code: string;
  name: string;
  ects: number;
  examForm: string;
  examType: ExamType;
  semester: SemesterOffering;
  language?: string;
  restriction?: string;
  available: boolean;
  prerequisites?: string[];
  tags?: string[];
  crossListedNote?: string;
  sourceCatalog: string;
}

export type ModulePool = { codes: string[] } | { sourceCatalog: string };

export interface TagRequirement {
  tag: string;
  minCount?: number;
  minEcts?: number;
}

export interface GroupRule {
  minEcts?: number;
  maxEcts?: number;
  exactEcts?: number;
  minCount?: number;
  maxCount?: number;
  tagRequirements?: TagRequirement[];
}

export interface Group {
  id: string;
  name: string;
  pool: ModulePool;
  rule: GroupRule;
}

export interface Program {
  id: string;
  name: string;
  shortName: string;
  totalEctsRange: [number, number];
  semesters: number;
  thesisEcts: number;
  thesisGateEcts: number;
  groups: Group[];
}

/** Module code -> assigned semester (0 = selected but unassigned). */
export type Plan = Record<string, number>;
```

- [ ] **Step 2: Write the failing tests for evaluateGroup**

`src/lib/planEngine.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { evaluateGroup } from "./planEngine";
import type { Group, Module, Plan } from "../data/types";

function mod(code: string, ects: number, tags: string[] = []): Module {
  return {
    code, name: code, ects, examForm: "", examType: "unknown",
    semester: "UNKNOWN", available: true, tags, sourceCatalog: "test",
  };
}

describe("evaluateGroup", () => {
  it("is incomplete with nothing selected", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A"] }, rule: { minEcts: 6 } };
    const result = evaluateGroup(group, [mod("A", 6)], {});
    expect(result).toEqual({ selectedCount: 0, selectedEcts: 0, status: "incomplete" });
  });

  it("satisfies a minEcts rule once the threshold is reached", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B"] }, rule: { minEcts: 6 } };
    const plan: Plan = { A: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6)], plan);
    expect(result).toEqual({ selectedCount: 1, selectedEcts: 6, status: "satisfied" });
  });

  it("flags over when maxEcts is exceeded", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B"] }, rule: { maxEcts: 6 } };
    const plan: Plan = { A: 1, B: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6)], plan);
    expect(result.status).toBe("over");
  });

  it("supports choose-N-of-pool via exact minCount/maxCount", () => {
    const group: Group = {
      id: "fund-cs", name: "Fundamentals CS",
      pool: { codes: ["A", "B", "C"] },
      rule: { minCount: 2, maxCount: 2 },
    };
    const plan: Plan = { A: 1, B: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6), mod("C", 6)], plan);
    expect(result.status).toBe("satisfied");
  });

  it("requires tagRequirements to be met even when minEcts is satisfied", () => {
    const group: Group = {
      id: "apps", name: "Applications",
      pool: { codes: ["A", "B"] },
      rule: { minEcts: 6, tagRequirements: [{ tag: "social-science", minCount: 1 }] },
    };
    const plan: Plan = { A: 1 }; // A has no social-science tag
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6, ["social-science"])], plan);
    expect(result.status).toBe("on-track");
  });

  it("is on-track between minEcts and maxEcts with a partial selection", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B", "C"] }, rule: { minEcts: 12, maxEcts: 36 } };
    const plan: Plan = { A: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6), mod("C", 6)], plan);
    expect(result.status).toBe("on-track");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test -- planEngine` — expect FAIL (`evaluateGroup` not defined).

- [ ] **Step 4: Implement evaluateGroup**

`src/lib/planEngine.ts`:
```ts
import type { Group, Module, Plan } from "../data/types";

export type GroupStatus = "incomplete" | "on-track" | "satisfied" | "over";

export interface GroupEvaluation {
  selectedCount: number;
  selectedEcts: number;
  status: GroupStatus;
}

export function evaluateGroup(group: Group, poolModules: Module[], plan: Plan): GroupEvaluation {
  const selected = poolModules.filter((m) => plan[m.code] !== undefined);
  const selectedCount = selected.length;
  const selectedEcts = selected.reduce((sum, m) => sum + m.ects, 0);
  const { minEcts, maxEcts, exactEcts, minCount, maxCount, tagRequirements = [] } = group.rule;

  const overEcts =
    (maxEcts !== undefined && selectedEcts > maxEcts) ||
    (exactEcts !== undefined && selectedEcts > exactEcts);
  const overCount = maxCount !== undefined && selectedCount > maxCount;

  if (overEcts || overCount) {
    return { selectedCount, selectedEcts, status: "over" };
  }

  if (selectedCount === 0) {
    return { selectedCount, selectedEcts, status: "incomplete" };
  }

  const meetsEcts =
    (exactEcts === undefined || selectedEcts === exactEcts) &&
    (minEcts === undefined || selectedEcts >= minEcts) &&
    (maxEcts === undefined || selectedEcts <= maxEcts);
  const meetsCount =
    (minCount === undefined || selectedCount >= minCount) &&
    (maxCount === undefined || selectedCount <= maxCount);
  const meetsTags = tagRequirements.every((req) => {
    const tagged = selected.filter((m) => m.tags?.includes(req.tag));
    const countOk = req.minCount === undefined || tagged.length >= req.minCount;
    const ectsOk = req.minEcts === undefined || tagged.reduce((s, m) => s + m.ects, 0) >= req.minEcts;
    return countOk && ectsOk;
  });

  return {
    selectedCount,
    selectedEcts,
    status: meetsEcts && meetsCount && meetsTags ? "satisfied" : "on-track",
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test -- planEngine` — expect PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/lib/planEngine.ts src/lib/planEngine.test.ts
git commit -m "Add core data types and the evaluateGroup rule engine"
```

---

### Task 3: Module registry and pool resolution

**Files:**
- Create: `src/data/registry.ts`
- Test: `src/data/registry.test.ts`

**Interfaces:**
- Consumes: `Module`, `ModulePool` from `src/data/types.ts` (Task 2).
- Produces: `buildRegistry(catalogs: Record<string, Module[]>): Map<string, Module>` and `resolvePool(pool: ModulePool, catalogs: Record<string, Module[]>): Module[]` from `src/data/registry.ts`. Catalog data tasks (4, 5) and program-planner UI tasks import these.

- [ ] **Step 1: Write the failing tests**

`src/data/registry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildRegistry, resolvePool } from "./registry";
import type { Module } from "./types";

function mod(code: string, sourceCatalog: string): Module {
  return { code, name: code, ects: 6, examForm: "", examType: "unknown", semester: "UNKNOWN", available: true, sourceCatalog };
}

describe("buildRegistry", () => {
  it("indexes modules by code across catalogs", () => {
    const registry = buildRegistry({ a: [mod("X", "a")], b: [mod("Y", "b")] });
    expect(registry.get("X")?.sourceCatalog).toBe("a");
    expect(registry.get("Y")?.sourceCatalog).toBe("b");
  });

  it("throws on a duplicate code across catalogs", () => {
    expect(() => buildRegistry({ a: [mod("X", "a")], b: [mod("X", "b")] })).toThrow(/Duplicate module code "X"/);
  });
});

describe("resolvePool", () => {
  const catalogs = { wifo: [mod("CS 500", "wifo"), mod("CS 530", "wifo")] };

  it("resolves an explicit code list", () => {
    const result = resolvePool({ codes: ["CS 500"] }, catalogs);
    expect(result.map((m) => m.code)).toEqual(["CS 500"]);
  });

  it("resolves a whole source catalog", () => {
    const result = resolvePool({ sourceCatalog: "wifo" }, catalogs);
    expect(result.map((m) => m.code)).toEqual(["CS 500", "CS 530"]);
  });

  it("throws for an unknown code", () => {
    expect(() => resolvePool({ codes: ["NOPE"] }, catalogs)).toThrow(/Unknown module code "NOPE"/);
  });

  it("throws for an unknown source catalog", () => {
    expect(() => resolvePool({ sourceCatalog: "nope" }, catalogs)).toThrow(/Unknown source catalog "nope"/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- registry` — expect FAIL (module not found).

- [ ] **Step 3: Implement**

`src/data/registry.ts`:
```ts
import type { Module, ModulePool } from "./types";

export function buildRegistry(catalogs: Record<string, Module[]>): Map<string, Module> {
  const map = new Map<string, Module>();
  for (const modules of Object.values(catalogs)) {
    for (const mod of modules) {
      const existing = map.get(mod.code);
      if (existing) {
        throw new Error(`Duplicate module code "${mod.code}" (in "${existing.sourceCatalog}" and "${mod.sourceCatalog}")`);
      }
      map.set(mod.code, mod);
    }
  }
  return map;
}

export function resolvePool(pool: ModulePool, catalogs: Record<string, Module[]>): Module[] {
  if ("codes" in pool) {
    const flat = Object.values(catalogs).flat();
    const byCode = new Map(flat.map((m) => [m.code, m]));
    return pool.codes.map((code) => {
      const mod = byCode.get(code);
      if (!mod) throw new Error(`Unknown module code "${code}" in pool`);
      return mod;
    });
  }
  const source = catalogs[pool.sourceCatalog];
  if (!source) throw new Error(`Unknown source catalog "${pool.sourceCatalog}"`);
  return source;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- registry` — expect PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/registry.ts src/data/registry.test.ts
git commit -m "Add module registry and pool resolution"
```

---

### Task 4: Business School shared catalog data

**Files:**
- Create: `src/data/catalog/businessSchool.ts`
- Test: `src/data/catalog/businessSchool.test.ts`

**Interfaces:**
- Consumes: `Module` type from `src/data/types.ts`.
- Produces: `BUSINESS_SCHOOL_MODULES: Module[]` (named export), `sourceCatalog: "businessSchool"` on every record. Consumed by Task 5 (Wifo's Fundamentals Business Administration group) and by the later Wima plan's Wirtschaftswissenschaften group.

- [ ] **Step 1: Extract the data**

Source: `Modul-Catalogues/Modulkatalog_Mannheim_Master_in_Management_de.pdf` (read in
20-page chunks via the `pages` parameter). This is the ACC/FIN/MAN/MKT/OPM/TAX
elective pool — the same set already hand-transcribed (2025 edition) in
`fundamentals_business_admin_module_selector_v2.html`. Use that file's list as
a starting skeleton of known codes, but verify every ECTS/exam/semester value
against the current PDF and add/remove modules per the PDF's current table of
contents — the PDF is authoritative, the old HTML file is not.

For every module, populate: `code`, `name`, `ects`, `examForm` (verbatim from
the PDF), `examType` (derive: no exam mentioned → `"no"`; exam ≤60 min →
`"short"`; oral/midterm → `"mid"`; exam >60 min or unqualified "Klausur" →
`"long"`; unclear → `"unknown"`), `semester` (`"HWS"` / `"FSS"` / `"BOTH"` if
offered both / `"IRREGULAR"` if stated as irregular / `"UNKNOWN"` if not
stated), `language` if stated, `restriction` (enrollment cap text) if stated,
`available: true` unless the PDF marks it not offered this year, and
`sourceCatalog: "businessSchool"`.

Example shape (do not omit any field the source specifies):
```ts
import type { Module } from "../types";

export const BUSINESS_SCHOOL_MODULES: Module[] = [
  {
    code: "ACC 510", name: "Jahresabschluss", ects: 8,
    examForm: "Fallstudie (25%) + Klausur 90 min (75%)", examType: "long",
    semester: "FSS", available: true, sourceCatalog: "businessSchool",
  },
  {
    code: "FIN 500", name: "Investments", ects: 6,
    examForm: "Klausur 60 min", examType: "short",
    semester: "HWS", available: true, sourceCatalog: "businessSchool",
  },
  // ... every ACC/FIN/MAN/MKT/OPM/TAX module in the current PDF
];
```

- [ ] **Step 2: Write the verification test**

`src/data/catalog/businessSchool.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { BUSINESS_SCHOOL_MODULES } from "./businessSchool";

describe("BUSINESS_SCHOOL_MODULES", () => {
  it("has a plausible module count for the current catalog", () => {
    expect(BUSINESS_SCHOOL_MODULES.length).toBeGreaterThan(70);
    expect(BUSINESS_SCHOOL_MODULES.length).toBeLessThan(120);
  });

  it("every module has sourceCatalog businessSchool and a positive ECTS value", () => {
    for (const m of BUSINESS_SCHOOL_MODULES) {
      expect(m.sourceCatalog).toBe("businessSchool");
      expect(m.ects).toBeGreaterThan(0);
    }
  });

  it("has no duplicate codes", () => {
    const codes = BUSINESS_SCHOOL_MODULES.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("contains known anchor modules with correct ECTS", () => {
    const byCode = new Map(BUSINESS_SCHOOL_MODULES.map((m) => [m.code, m]));
    expect(byCode.get("ACC 510")?.ects).toBe(8);
    expect(byCode.get("FIN 500")?.ects).toBe(6);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm run test -- businessSchool` — expect PASS. If the anchor-module
assertions fail because the current PDF changed those specific values,
update the test to match the verified PDF value (the PDF is authoritative).

- [ ] **Step 4: Commit**

```bash
git add src/data/catalog/businessSchool.ts src/data/catalog/businessSchool.test.ts
git commit -m "Add Business School shared elective catalog data"
```

---

### Task 5: Wifo catalog and program definition

**Files:**
- Create: `src/data/catalog/wifo.ts`
- Create: `src/data/programs/wifo.ts`
- Test: `src/data/programs/wifo.test.ts`

**Interfaces:**
- Consumes: `Module`, `Group`, `Program` types (Task 2); `BUSINESS_SCHOOL_MODULES` (Task 4); `buildRegistry`/`resolvePool` (Task 3); `evaluateGroup` (Task 2).
- Produces: `WIFO_MODULES: Module[]` from `catalog/wifo.ts`; `WIFO_PROGRAM: Program` from `programs/wifo.ts`, with group ids: `"fundamentals-cs"`, `"fundamentals-ba"`, `"specialization"`, `"projects-seminars"`. Later UI tasks (7-11) render this program.

- [ ] **Step 1: Extract the Wifo catalog data**

Source: `Modul-Catalogues/MK_Master_Wifo_22072026.pdf`. Populate the same
fields as Task 4. This catalog covers four groups:
- Fundamentals Computer Science (7 modules: CS 500, CS 530, CS 550, CS 560,
  CS 652, IE 500, IE 560 — 6 ECTS each).
- Specialization CS-Courses, Specialization IE-Courses, IS-Courses, and
  Further/Other modules (all feed the single "Specialization Courses"
  group). Extract the full IS-Courses pool from this PDF now — it was not
  captured during design research (only the Wifo-tagged CS/IE/Further
  groups were).
- Projects and Seminars modules (Team Project, Scientific Research,
  Seminar options) if individually listed; if the catalog describes these
  as fixed activities rather than a pool of choosable modules, model each
  as a single mandatory `Module` (e.g. `code: "TEAM-PROJECT"`, `ects: 12`).

```ts
import type { Module } from "../types";

export const WIFO_MODULES: Module[] = [
  {
    code: "CS 500", name: "Advanced Software Engineering", ects: 6,
    examForm: "Klausur 90 min", examType: "long", semester: "HWS",
    available: true, tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  // ... every Fundamentals CS, Specialization CS/IE, IS-Courses, Further, and
  // Projects/Seminars module in the current PDF
];
```

Tag each module with which sub-pool it belongs to (`"fundamentals-cs"`,
`"specialization"`, `"projects-seminars"`) via the `tags` field — the
program definition's groups reference these via `codes` lists built from
the tagged data, e.g.:
```ts
const fundamentalsCsCodes = WIFO_MODULES.filter((m) => m.tags?.includes("fundamentals-cs")).map((m) => m.code);
```

- [ ] **Step 2: Write the program definition**

`src/data/programs/wifo.ts`:
```ts
import { WIFO_MODULES } from "../catalog/wifo";
import type { Program } from "../types";

const codesByTag = (tag: string) => WIFO_MODULES.filter((m) => m.tags?.includes(tag)).map((m) => m.code);

export const WIFO_PROGRAM: Program = {
  id: "wifo",
  name: "M.Sc. Business Informatics",
  shortName: "Wifo",
  totalEctsRange: [120, 120],
  semesters: 4,
  thesisEcts: 30,
  thesisGateEcts: 60,
  groups: [
    {
      id: "fundamentals-cs", name: "Fundamentals Computer Science",
      pool: { codes: codesByTag("fundamentals-cs") },
      rule: { minCount: 3, maxCount: 3 },
    },
    {
      id: "fundamentals-ba", name: "Fundamentals Business Administration",
      pool: { sourceCatalog: "businessSchool" },
      rule: { minEcts: 18 },
    },
    {
      id: "specialization", name: "Specialization Courses",
      pool: { codes: codesByTag("specialization") },
      rule: { minEcts: 36 },
    },
    {
      id: "projects-seminars", name: "Projects and Seminars",
      pool: { codes: codesByTag("projects-seminars") },
      rule: { exactEcts: 18 },
    },
  ],
};
```

Adjust the `rule` values only if the extracted PDF text in Step 1
contradicts the spec's summary (spec: Fundamentals CS 18 ECTS/3-of-7;
Fundamentals BA ≥18; Specialization ≥36; Projects and Seminars 18 fixed).

- [ ] **Step 3: Write the verification test**

`src/data/programs/wifo.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { WIFO_PROGRAM } from "./wifo";
import { WIFO_MODULES } from "../catalog/wifo";
import { BUSINESS_SCHOOL_MODULES } from "../catalog/businessSchool";
import { buildRegistry, resolvePool } from "../registry";
import { evaluateGroup } from "../../lib/planEngine";

const catalogs = { wifo: WIFO_MODULES, businessSchool: BUSINESS_SCHOOL_MODULES };

describe("WIFO_PROGRAM", () => {
  it("builds a registry without duplicate-code errors", () => {
    expect(() => buildRegistry(catalogs)).not.toThrow();
  });

  it("has a Fundamentals Computer Science pool of exactly 7 modules at 6 ECTS each", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "fundamentals-cs")!;
    const pool = resolvePool(group.pool, catalogs);
    expect(pool).toHaveLength(7);
    expect(pool.every((m) => m.ects === 6)).toBe(true);
  });

  it("resolves Fundamentals Business Administration to the shared Business School pool", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "fundamentals-ba")!;
    const pool = resolvePool(group.pool, catalogs);
    expect(pool.length).toBe(BUSINESS_SCHOOL_MODULES.length);
  });

  it("marks Fundamentals CS satisfied once exactly 3 modules are selected", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "fundamentals-cs")!;
    const pool = resolvePool(group.pool, catalogs);
    const plan = Object.fromEntries(pool.slice(0, 3).map((m) => [m.code, 1]));
    expect(evaluateGroup(group, pool, plan).status).toBe("satisfied");
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm run test -- wifo` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/catalog/wifo.ts src/data/programs/wifo.ts src/data/programs/wifo.test.ts
git commit -m "Add Wifo catalog data and program definition"
```

---

### Task 6: Persistence layer

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `Plan` type from `src/data/types.ts`.
- Produces: `loadPlan(programId: string): Plan`, `savePlan(programId: string, plan: Plan): void` from `src/lib/storage.ts`. Used by `ProgramPlanner` (Task 11).

- [ ] **Step 1: Write the failing tests**

`src/lib/storage.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { loadPlan, savePlan } from "./storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty plan when nothing is stored", () => {
    expect(loadPlan("wifo")).toEqual({});
  });

  it("round-trips a saved plan", () => {
    savePlan("wifo", { "CS 500": 1, "CS 530": 0 });
    expect(loadPlan("wifo")).toEqual({ "CS 500": 1, "CS 530": 0 });
  });

  it("keeps plans for different programs separate", () => {
    savePlan("wifo", { "CS 500": 1 });
    savePlan("mathematik", { "MAC 404": 2 });
    expect(loadPlan("wifo")).toEqual({ "CS 500": 1 });
    expect(loadPlan("mathematik")).toEqual({ "MAC 404": 2 });
  });

  it("returns an empty plan if stored JSON is corrupt", () => {
    localStorage.setItem("planner:v2:wifo", "{not json");
    expect(loadPlan("wifo")).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- storage` — expect FAIL.

- [ ] **Step 3: Implement**

`src/lib/storage.ts`:
```ts
import type { Plan } from "../data/types";

const keyFor = (programId: string) => `planner:v2:${programId}`;

export function loadPlan(programId: string): Plan {
  const raw = localStorage.getItem(keyFor(programId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Plan;
  } catch {
    return {};
  }
}

export function savePlan(programId: string, plan: Plan): void {
  localStorage.setItem(keyFor(programId), JSON.stringify(plan));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- storage` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "Add per-program localStorage persistence"
```

---

### Task 7: Hash router and program registry

**Files:**
- Create: `src/lib/useHashRoute.ts`
- Create: `src/data/programs/index.ts`
- Test: `src/lib/useHashRoute.test.tsx`

**Interfaces:**
- Consumes: `WIFO_PROGRAM` (Task 5).
- Produces: `useHashRoute(): string` (returns the current route id: `""` for the picker, or a program id) from `src/lib/useHashRoute.ts`; `PROGRAMS: Program[]` from `src/data/programs/index.ts`. Consumed by `App.tsx` (this task) and `ProgramPicker` (Task 8).

- [ ] **Step 1: Write the program registry**

`src/data/programs/index.ts`:
```ts
import { WIFO_PROGRAM } from "./wifo";
import type { Program } from "../types";

export const PROGRAMS: Program[] = [WIFO_PROGRAM];
```

- [ ] **Step 2: Write the failing hook test**

`src/lib/useHashRoute.test.tsx`:
```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHashRoute } from "./useHashRoute";

describe("useHashRoute", () => {
  afterEach(() => { window.location.hash = ""; });

  it("returns an empty route id for the picker", () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("");
  });

  it("returns the program id from the hash", () => {
    window.location.hash = "#/wifo";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("wifo");
  });

  it("updates when the hash changes", () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute());
    act(() => { window.location.hash = "#/wifo"; });
    expect(result.current).toBe("wifo");
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm run test -- useHashRoute` — expect FAIL.

- [ ] **Step 4: Implement**

`src/lib/useHashRoute.ts`:
```ts
import { useEffect, useState } from "react";

function parseHash(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

export function useHashRoute(): string {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigateTo(routeId: string): void {
  window.location.hash = routeId ? `/${routeId}` : "";
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- useHashRoute` — expect PASS.

- [ ] **Step 6: Commit**

`App.tsx` is not touched by this task — it still renders the Task 1 empty
shell. Full routing wiring happens in Task 11 once `ProgramPicker` (Task 8)
and `ProgramPlanner` (Task 11) both exist; wiring it earlier would require
a fake stand-in component, which the plan avoids.

```bash
git add src/lib/useHashRoute.ts src/lib/useHashRoute.test.tsx src/data/programs/index.ts
git commit -m "Add hash-based routing and the program registry"
```

---

### Task 8: ProgramPicker and StatsBar/GroupProgress components

**Files:**
- Create: `src/components/ProgramPicker.tsx`, `src/components/ProgramPicker.test.tsx`
- Create: `src/components/GroupProgress.tsx`, `src/components/GroupProgress.test.tsx`
- Create: `src/components/StatsBar.tsx`

**Interfaces:**
- Consumes: `Program`, `Group` types; `navigateTo` (Task 7); `evaluateGroup`, `resolvePool` (Tasks 2-3).
- Produces: `ProgramPicker({ programs: Program[] })`; `GroupProgress({ group: Group, poolModules: Module[], plan: Plan })`; `StatsBar({ program: Program, plannedEcts: number, semesterCount: number, onSemesterCountChange: (n: number) => void })`. Consumed by `ProgramPlanner` (Task 11).

- [ ] **Step 1: ProgramPicker test**

`src/components/ProgramPicker.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramPicker } from "./ProgramPicker";
import type { Program } from "../data/types";

const programs: Program[] = [
  { id: "wifo", name: "M.Sc. Business Informatics", shortName: "Wifo", totalEctsRange: [120, 120], semesters: 4, thesisEcts: 30, thesisGateEcts: 60, groups: [] },
];

describe("ProgramPicker", () => {
  it("renders a card per program and navigates on click", () => {
    render(<ProgramPicker programs={programs} />);
    const card = screen.getByText("M.Sc. Business Informatics");
    fireEvent.click(card);
    expect(window.location.hash).toBe("#/wifo");
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement ProgramPicker**

`src/components/ProgramPicker.tsx`:
```tsx
import { navigateTo } from "../lib/useHashRoute";
import type { Program } from "../data/types";

export function ProgramPicker({ programs }: { programs: Program[] }) {
  return (
    <div className="program-picker">
      <h1>WIM Master Planner</h1>
      <div className="program-grid">
        {programs.map((p) => (
          <button key={p.id} className="program-card" onClick={() => navigateTo(p.id)}>
            <h2>{p.name}</h2>
            <p>{p.totalEctsRange[0]}–{p.totalEctsRange[1]} ECTS · {p.semesters} semesters</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

Run: `npm run test -- ProgramPicker` — expect PASS.

- [ ] **Step 3: GroupProgress test**

`src/components/GroupProgress.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupProgress } from "./GroupProgress";
import type { Group, Module } from "../data/types";

const group: Group = { id: "g", name: "Fundamentals CS", pool: { codes: ["A", "B"] }, rule: { minEcts: 12 } };
const modules: Module[] = [
  { code: "A", name: "A", ects: 6, examForm: "", examType: "unknown", semester: "UNKNOWN", available: true, sourceCatalog: "t" },
  { code: "B", name: "B", ects: 6, examForm: "", examType: "unknown", semester: "UNKNOWN", available: true, sourceCatalog: "t" },
];

describe("GroupProgress", () => {
  it("shows the group name and satisfied status once the target is met", () => {
    render(<GroupProgress group={group} poolModules={modules} plan={{ A: 1, B: 1 }} />);
    expect(screen.getByText("Fundamentals CS")).toBeInTheDocument();
    expect(screen.getByText(/satisfied/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement GroupProgress**

`src/components/GroupProgress.tsx`:
```tsx
import { evaluateGroup } from "../lib/planEngine";
import type { Group, Module, Plan } from "../data/types";

export function GroupProgress({ group, poolModules, plan }: { group: Group; poolModules: Module[]; plan: Plan }) {
  const { selectedEcts, status } = evaluateGroup(group, poolModules, plan);
  const target = group.rule.exactEcts ?? group.rule.minEcts ?? group.rule.maxEcts;
  return (
    <div className={`group-progress group-progress--${status}`}>
      <div className="group-progress__head">
        <span>{group.name}</span>
        <span>{selectedEcts}{target ? ` / ${target}` : ""} ECTS · {status}</span>
      </div>
    </div>
  );
}
```

Run: `npm run test -- GroupProgress` — expect PASS.

- [ ] **Step 5: Implement StatsBar (no separate test — covered via ProgramPlanner integration test in Task 11)**

`src/components/StatsBar.tsx`:
```tsx
import type { Program } from "../data/types";

export function StatsBar({
  program, plannedEcts, semesterCount, onSemesterCountChange,
}: {
  program: Program; plannedEcts: number; semesterCount: number; onSemesterCountChange: (n: number) => void;
}) {
  return (
    <div className="stats-bar">
      <div>Planned: {plannedEcts} / {program.totalEctsRange[0]}–{program.totalEctsRange[1]} ECTS</div>
      <label>
        Semesters:
        <input
          type="number" min={1} max={12} value={semesterCount}
          onChange={(e) => onSemesterCountChange(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
        />
      </label>
      <div className="thesis-note">Thesis ({program.thesisEcts} ECTS) unlocks at {program.thesisGateEcts} ECTS planned.</div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ProgramPicker.tsx src/components/ProgramPicker.test.tsx src/components/GroupProgress.tsx src/components/GroupProgress.test.tsx src/components/StatsBar.tsx
git commit -m "Add ProgramPicker, GroupProgress, and StatsBar components"
```

---

### Task 9: ModuleTable component

**Files:**
- Create: `src/components/ModuleTable.tsx`
- Test: `src/components/ModuleTable.test.tsx`

**Interfaces:**
- Consumes: `Module`, `Plan` types.
- Produces: `ModuleTable({ modules: Module[], plan: Plan, onToggle: (code: string) => void })`. Consumed by `ProgramPlanner` (Task 11).

- [ ] **Step 1: Write the failing test**

`src/components/ModuleTable.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModuleTable } from "./ModuleTable";
import type { Module } from "../data/types";

const modules: Module[] = [
  { code: "CS 500", name: "Advanced Software Engineering", ects: 6, examForm: "Klausur 90 min", examType: "long", semester: "HWS", available: true, sourceCatalog: "wifo" },
];

describe("ModuleTable", () => {
  it("lists modules and calls onToggle when a row checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<ModuleTable modules={modules} plan={{}} onToggle={onToggle} />);
    expect(screen.getByText("Advanced Software Engineering")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("CS 500");
  });

  it("filters by search text", () => {
    render(<ModuleTable modules={modules} plan={{}} onToggle={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "zzz-no-match" } });
    expect(screen.queryByText("Advanced Software Engineering")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

`src/components/ModuleTable.tsx`:
```tsx
import { useMemo, useState } from "react";
import type { Module, Plan } from "../data/types";

export function ModuleTable({ modules, plan, onToggle }: { modules: Module[]; plan: Plan; onToggle: (code: string) => void }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return modules.filter((m) => !q || `${m.code} ${m.name}`.toLowerCase().includes(q));
  }, [modules, search]);

  return (
    <div className="module-table">
      <input placeholder="Search code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <table>
        <thead>
          <tr><th /><th>Code</th><th>Module</th><th>ECTS</th><th>Exam</th><th>Semester</th></tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m.code}>
              <td>
                <input
                  type="checkbox" checked={plan[m.code] !== undefined} disabled={!m.available}
                  onChange={() => onToggle(m.code)}
                />
              </td>
              <td>{m.code}</td>
              <td>{m.name}{m.crossListedNote ? <span className="hint"> ({m.crossListedNote})</span> : null}</td>
              <td>{m.ects}</td>
              <td>{m.examForm || "–"}</td>
              <td>{m.semester}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Run to verify pass**

Run: `npm run test -- ModuleTable` — expect PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ModuleTable.tsx src/components/ModuleTable.test.tsx
git commit -m "Add ModuleTable component"
```

---

### Task 10: SemesterBoard component

**Files:**
- Create: `src/components/SemesterBoard.tsx`
- Test: `src/components/SemesterBoard.test.tsx`

**Interfaces:**
- Consumes: `Module`, `Plan` types.
- Produces: `SemesterBoard({ modules: Module[], plan: Plan, semesterCount: number, onAssign: (code: string, semester: number) => void })`. Consumed by `ProgramPlanner` (Task 11).

- [ ] **Step 1: Write the failing test (state transitions, not DOM drag events — jsdom doesn't fire real drag events)**

`src/components/SemesterBoard.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SemesterBoard } from "./SemesterBoard";
import type { Module, Plan } from "../data/types";

const modules: Module[] = [
  { code: "CS 500", name: "Advanced Software Engineering", ects: 6, examForm: "", examType: "unknown", semester: "HWS", available: true, sourceCatalog: "wifo" },
];
const plan: Plan = { "CS 500": 1 };

describe("SemesterBoard", () => {
  it("renders a dropzone per semester plus Unassigned, with modules bucketed by their plan semester", () => {
    render(<SemesterBoard modules={modules} plan={plan} semesterCount={2} onAssign={vi.fn()} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Semester 1")).toBeInTheDocument();
    expect(screen.getByText("Semester 2")).toBeInTheDocument();
    expect(screen.getByText("Advanced Software Engineering")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

`src/components/SemesterBoard.tsx`:
```tsx
import type { Module, Plan } from "../data/types";

export function SemesterBoard({
  modules, plan, semesterCount, onAssign,
}: {
  modules: Module[]; plan: Plan; semesterCount: number; onAssign: (code: string, semester: number) => void;
}) {
  const byCode = new Map(modules.map((m) => [m.code, m]));
  const buckets: Record<number, Module[]> = { 0: [] };
  for (let s = 1; s <= semesterCount; s += 1) buckets[s] = [];
  for (const [code, sem] of Object.entries(plan)) {
    const mod = byCode.get(code);
    if (!mod) continue;
    (buckets[sem] ?? buckets[0]).push(mod);
  }

  const dropzone = (label: string, semester: number) => (
    <div
      key={semester} className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const code = e.dataTransfer.getData("text/plain");
        if (code) onAssign(code, semester);
      }}
    >
      <div className="dz-head">{label}</div>
      {buckets[semester].map((m) => (
        <div key={m.code} className="module-chip" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", m.code)}>
          {m.code} — {m.name} ({m.ects} ECTS)
        </div>
      ))}
    </div>
  );

  return (
    <div className="semester-board">
      {dropzone("Unassigned", 0)}
      {Array.from({ length: semesterCount }, (_, i) => i + 1).map((s) => dropzone(`Semester ${s}`, s))}
    </div>
  );
}
```

- [ ] **Step 3: Run to verify pass**

Run: `npm run test -- SemesterBoard` — expect PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/SemesterBoard.tsx src/components/SemesterBoard.test.tsx
git commit -m "Add SemesterBoard drag-and-drop component"
```

---

### Task 11: Wire ProgramPlanner, retire old files, manual verification

**Files:**
- Create: `src/components/ProgramPlanner.tsx`, `src/components/ProgramPlanner.test.tsx`
- Modify: `src/App.tsx` (remove the Task 7 stub reference, use the real `ProgramPlanner`)
- Delete: `master_studies_planner.html`, `wifo_module_selector.html`, `IS_module_selector.html`, `fundamentals_business_admin_module_selector_v2.html`

**Interfaces:**
- Consumes: everything from Tasks 2-10.
- Produces: `ProgramPlanner({ program: Program })` — the fully assembled per-program view.

- [ ] **Step 1: Write the integration test**

`src/components/ProgramPlanner.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProgramPlanner } from "./ProgramPlanner";
import { WIFO_PROGRAM } from "../data/programs/wifo";

describe("ProgramPlanner", () => {
  beforeEach(() => localStorage.clear());

  it("selecting a module updates the stats bar and persists across remount", () => {
    const { unmount } = render(<ProgramPlanner program={WIFO_PROGRAM} />);
    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);
    unmount();

    render(<ProgramPlanner program={WIFO_PROGRAM} />);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

`src/components/ProgramPlanner.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import type { Program, Plan } from "../data/types";
import { WIFO_MODULES } from "../data/catalog/wifo";
import { BUSINESS_SCHOOL_MODULES } from "../data/catalog/businessSchool";
import { resolvePool } from "../data/registry";
import { loadPlan, savePlan } from "../lib/storage";
import { StatsBar } from "./StatsBar";
import { GroupProgress } from "./GroupProgress";
import { ModuleTable } from "./ModuleTable";
import { SemesterBoard } from "./SemesterBoard";

const CATALOGS_BY_PROGRAM: Record<string, Record<string, typeof WIFO_MODULES>> = {
  wifo: { wifo: WIFO_MODULES, businessSchool: BUSINESS_SCHOOL_MODULES },
};

export function ProgramPlanner({ program }: { program: Program }) {
  const catalogs = CATALOGS_BY_PROGRAM[program.id];
  const allModules = useMemo(() => Object.values(catalogs).flat(), [catalogs]);

  const [plan, setPlan] = useState<Plan>(() => loadPlan(program.id));
  const [semesterCount, setSemesterCount] = useState(4);

  useEffect(() => savePlan(program.id, plan), [program.id, plan]);

  const toggle = (code: string) => {
    setPlan((prev) => {
      const next = { ...prev };
      if (code in next) delete next[code];
      else next[code] = 0;
      return next;
    });
  };

  const assign = (code: string, semester: number) => {
    setPlan((prev) => (code in prev ? { ...prev, [code]: semester } : prev));
  };

  const plannedEcts = allModules
    .filter((m) => plan[m.code] !== undefined)
    .reduce((sum, m) => sum + m.ects, 0);

  return (
    <div className="program-planner">
      <h1>{program.name}</h1>
      <StatsBar program={program} plannedEcts={plannedEcts} semesterCount={semesterCount} onSemesterCountChange={setSemesterCount} />
      <div className="group-panel">
        {program.groups.map((g) => (
          <GroupProgress key={g.id} group={g} poolModules={resolvePool(g.pool, catalogs)} plan={plan} />
        ))}
      </div>
      <div className="planner-layout">
        <ModuleTable modules={allModules} plan={plan} onToggle={toggle} />
        <SemesterBoard modules={allModules} plan={plan} semesterCount={semesterCount} onAssign={assign} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire App.tsx with full routing**

`src/App.tsx`:
```tsx
import "./styles/global.css";
import { useHashRoute } from "./lib/useHashRoute";
import { PROGRAMS } from "./data/programs";
import { ProgramPicker } from "./components/ProgramPicker";
import { ProgramPlanner } from "./components/ProgramPlanner";

export default function App() {
  const routeId = useHashRoute();
  const program = PROGRAMS.find((p) => p.id === routeId);

  return (
    <div className="app-shell">
      {program ? <ProgramPlanner program={program} /> : <ProgramPicker programs={PROGRAMS} />}
    </div>
  );
}
```

Update `src/App.test.tsx` (from Task 1) to match — the shell no longer
renders an empty div by default, it renders the picker:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the program picker at the root route", () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByText("WIM Master Planner")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run all tests**

Run: `npm run test` — expect PASS across every suite from Tasks 1-11.

- [ ] **Step 5: Manual verification in-browser**

Run: `npm run dev`, open the served URL:
- Confirm the picker shows one card ("M.Sc. Business Informatics").
- Click it, confirm the URL becomes `#/wifo` and the planner renders.
- Select a handful of modules across different groups, confirm each
  `GroupProgress` bar's status updates (incomplete → on-track → satisfied).
- Drag a selected module chip from "Unassigned" into "Semester 1", confirm
  it moves.
- Reload the page, confirm selections and semester assignments persist.

- [ ] **Step 6: Retire the old static files**

```bash
git rm master_studies_planner.html wifo_module_selector.html IS_module_selector.html fundamentals_business_admin_module_selector_v2.html
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ProgramPlanner.tsx src/components/ProgramPlanner.test.tsx src/App.tsx src/App.test.tsx
git commit -m "Wire ProgramPlanner end-to-end for Wifo and retire the old static selectors"
```
