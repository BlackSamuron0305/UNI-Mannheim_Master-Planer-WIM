# Master Planner Redesign — Design Spec

Date: 2026-09-01
Status: Approved for implementation

## Problem

The repo currently has four static HTML files: one full planner app
(`master_studies_planner.html`, React via CDN + Babel) hardcoding a module
list for the M.Sc. Business Informatics ("Wifo") program, and three
standalone fragment selectors (`wifo_module_selector.html`,
`IS_module_selector.html`, `fundamentals_business_admin_module_selector_v2.html`)
that depend on host-page CSS variables and aren't usable standalone. All
four hardcode one program's module data, which is now out of date — the
user has uploaded the current (HWS 2026/FSS 2027) Modulkataloge PDFs for
five WIM master's programs.

Goal: a single redesigned web app that supports module/semester planning
for all five programs, each with its own requirement structure, built on
current catalog data.

## Programs in scope

Five School of Business Informatics and Mathematics (WIM) master's
programs, all 120 ECTS / 4 semesters standard duration. **Mannheim Master
in Management (MMM) is explicitly excluded as a program** — but its
catalog PDF (`Modul-Catalogues/Modulkatalog_Mannheim_Master_in_Management_de.pdf`)
is still the canonical source for the shared Business School elective pool
(ACC/FIN/MAN/MKT/OPM/TAX-coded modules, ~90 modules) that two in-scope
programs draw from.

1. **M.Sc. Business Informatics ("Wifo")** — source: `MK_Master_Wifo_22072026.pdf`
   - Fundamentals Computer Science — 18 ECTS, choose 3 of 7 (CS 500/530/550/560/652, IE 500/560), 6 ECTS each
   - Fundamentals Business Administration — ≥18 ECTS, from the shared Business School pool (minus an exclusion list)
   - Specialization Courses — ≥36 ECTS, single pool combining Specialization CS, Specialization IE, IS-Courses, and International/Other courses
   - Projects and Seminars — 18 ECTS (Team Project 12 + Scientific Research 2 + one Seminar 4)
   - Master's Thesis — 30 ECTS, 6 months, requires ≥60 ECTS earned to register
   - Note: no standalone "18 ECTS IS electives" requirement exists in this catalog — IS-Courses are one of four sub-pools feeding the 36-ECTS Specialization bucket. The current hardcoded app's separate "IS 18 ECTS" UI does not reflect this catalog and will not be carried forward as a distinct group.

2. **M.Sc. Mathematik** — source: `Mathe_Master.pdf`
   - Reine Mathematik — 16–32 ECTS
   - Angewandte Mathematik — 12–38 ECTS
   - Spezialisierungskurse — ≥12 ECTS; pool = all math modules in the catalog + up to 24 ECTS "Externe Spezialisierungskurse" cross-listed from Wifo, Psychologie, Political Science
   - Seminare — exactly 8 ECTS (two seminars, pass/fail, no grade contribution)
   - Masterarbeit — 30 ECTS, requires ≥60 ECTS earned
   - Note: Reine/Angewandte pillars overlap with the Spezialisierungskurse pool (not additive fixed buckets — a module can count toward a pillar minimum and the ≥12 ECTS specialization target at once). Some modules have prerequisite chains (e.g. MAB 520 requires MAB 519) and "unregelmäßig" (irregular) offering — shown as informational badges, not enforced. One module (MAC 515) has no detailed description in this catalog edition (ECTS known, exam/language/semester unknown — marked accordingly).

3. **M.Sc. Wirtschaftsmathematik ("Wima")** — source: `Wima_Master_PO_2025.pdf`
   - Wahlpflicht Reine Mathematik — 13–42 ECTS
   - Wahlbereich Mathematik und Informatik — ≥6 ECTS; up to 18 ECTS may come from the Wifo catalog
   - Wirtschaftswissenschaften — 30–34 ECTS total, of which ≤24 ECTS from BWL (shared Business School pool) and ≥6 ECTS from VWL
   - Seminare Mathematik — 8 ECTS
   - Masterarbeit — 30 ECTS
   - Optional non-credit "Zusatzmodule" (up to 2 Bachelor Wima modules) are informational only, not part of the 120–127 ECTS total and not planner-selectable.

4. **Mannheim Master in Data Science (MMDS)** — source: `MK_MMDS_NeuePO_22072026.pdf`
   - Data Science Fundamentals — 27 ECTS fixed, all 4 modules mandatory
   - Data Management — 6–24 ECTS, min. 1 course
   - Data Analytics Methods — 12–36 ECTS, min. 2 courses totaling ≥12 ECTS
   - Responsible Data Science — 3–7 ECTS, min. 1 course
   - Data Science Applications — 0–12 ECTS elective
   - Projects and Seminars — 14–18 ECTS (Team Project 12 *or* Individual Project 8, + Scientific Research + Seminars)
   - Master's Thesis — 30 ECTS, requires ≥60 ECTS earned
   - "Additional Course" (AC 651–655) slots allow importing up to 18 ECTS of outside coursework per area.

5. **Mannheim Master in Social Data Science (MMSDS)** — source: `MMSDS.pdf`
   - Foundations of Data Science — 27 ECTS fixed, all 5 mandatory
   - Data Science Methods: Fundamentals — 27 ECTS fixed, all 3 mandatory
   - Data Science Methods: Specialization — 18–23 ECTS, min. 3 courses from MMDS's Data Management/Data Analytics Methods pools
   - Data Science Applications — 18–23 ECTS; at least 2 electives must come from the School of Social Sciences (Pol/Soc/Psych) — modeled via a `tagRequirements` sub-constraint, not a separate group
   - Master's Thesis — 30 ECTS, requires ≥60 ECTS earned, English only

## Data model

Two layers so shared pools (Business School electives, Wifo's catalog
cross-listed into Mathematik/Wima) are stored once, not duplicated.

### Catalog layer — `src/data/catalog/*.ts`

One file per source catalog: `wifo.ts`, `mathematik.ts`, `wima.ts`,
`mmds.ts`, `mmsds.ts`, `businessSchool.ts` (the shared ACC/FIN/MAN/MKT/OPM/TAX
pool, sourced from the MMM PDF). Each exports a flat array of:

```ts
interface Module {
  code: string;            // e.g. "CS 500"; synthetic slug for codeless entries
  name: string;
  ects: number;
  examForm: string;        // raw description, e.g. "Klausur 90 min"
  examType: "no" | "short" | "mid" | "long" | "unknown"; // derived
  semester: "HWS" | "FSS" | "BOTH" | "IRREGULAR" | "UNKNOWN";
  language?: string;
  restriction?: string;    // enrollment cap note, if any
  available: boolean;      // offered in the current catalog year
  prerequisites?: string[]; // module codes, informational only
  tags?: string[];          // e.g. "social-science", for tagRequirements
  crossListedNote?: string; // e.g. "Full description in MMM catalog"
  sourceCatalog: string;    // which catalog file this lives in
}
```

A single `Map<code, Module>` built at load time is the lookup table
(equivalent to today's `BY_CODE`), deduplicated across catalog files by
`code`.

### Program layer — `src/data/programs/*.ts`

One file per program:

```ts
interface Group {
  id: string;
  name: string;
  pool: { codes: string[] } | { sourceCatalog: string; capEcts?: number };
  rule: {
    minEcts?: number;
    maxEcts?: number;
    exactEcts?: number;
    minCount?: number;
    maxCount?: number;
    tagRequirements?: { tag: string; minCount?: number; minEcts?: number }[];
  };
}

interface Program {
  id: string;
  name: string;
  shortName: string;
  totalEctsRange: [number, number];
  semesters: number;         // 4
  thesisEcts: number;        // 30
  thesisGateEcts: number;    // 60
  groups: Group[];
}
```

`evaluateGroup(group, modules, plan)` is a pure function returning
`{ selectedCount, selectedEcts, status: "incomplete" | "on-track" | "satisfied" | "over" }`
by checking whichever constraints are present on `rule`. This one function
drives every program's group-progress UI — adding a 6th program later is a
new data file, not new code.

**Approach considered and rejected:** bespoke per-program progress
functions. More precise for one-off rules, but 5x the code with no shared
test surface, and directly against the goal of one generic tool for all
WIM masters.

## App structure

- **Stack**: Vite + React + TypeScript. Plain CSS (no utility framework).
- **Routing**: hash-based, no router library — `#/` (picker), `#/<programId>`
  (planner). Two view shapes don't justify a router dependency; hash keeps
  deep-linking and back/forward working.
- **`ProgramPicker`**: cards for the 5 programs (name, ECTS range, one-line
  blurb). Always the landing view — no default program.
- **`ProgramPlanner`**: generic, parametrized by a `Program` definition.
  - Stats bar: planned ECTS vs. program total range, semester count control,
    thesis-gate note ("thesis unlocks at 60 ECTS" — informational only).
  - Group progress panel: one row per requirement group with a progress
    bar/status driven by `evaluateGroup`.
  - Module explorer table: search + filter (semester, exam type,
    restriction), rows grouped under requirement-group headers. Rows for
    cross-listed/partial-data modules show a "see &lt;source&gt; catalog"
    note instead of blank fields.
  - Semester board: drag-and-drop assignment of selected modules into
    semesters 1..N (same interaction as today's planner), plus an
    "Unassigned" bucket.
  - Prerequisites and irregular-offering modules: badge/tooltip only, never
    block selection.
- **Persistence**: `localStorage`, one key per program
  (`planner:v2:<programId>`), storing selections + semester assignment +
  filter state — same pattern as the current app.
- **Retired**: `master_studies_planner.html`, `wifo_module_selector.html`,
  `IS_module_selector.html`, `fundamentals_business_admin_module_selector_v2.html`
  are deleted once the new app covers their function.

## Out of scope

- `Bachelor.py` — untouched (Bachelor's GPA calculator, unrelated to
  master's module selection).
- Enforcing prerequisites or offering-irregularity as hard validation.
- Backend/accounts — stays a static, client-only app.
- Any UI/data support for the MMM program itself.

## Data extraction status

Structural research (group breakdowns above) is done for all five
programs. Module-level data was extracted per program into scratch JSON
during research, with known gaps to close during implementation:

- Wifo: Fundamentals CS + Specialization CS/IE + Further modules captured;
  the IS-Courses pool and the Business School pool still need extraction
  (from the MMM PDF).
- Mathematik: 56 modules captured; MAC 515 has no detailed description in
  this catalog (ECTS only); a few copy-paste artifacts from the sibling
  Wima catalog need spot-checking against source text.
- Wima: 104 modules captured (47 fully detailed; 57 BWL/VWL/Informatik
  entries have only code/title/ECTS/semester, deferring detail to the
  Business School / Wifo catalogs — expected to resolve once those shared
  pools are extracted).
- MMDS: 74 modules captured; extraction required manual correction of a
  regex-parsing artifact — spot-check against source PDF during data
  entry.
- MMSDS: 45 modules captured.

Each program's data file must be hand-verified against its source PDF
during implementation, not copied blindly from the scratch JSON.

## Testing

- Unit tests for `evaluateGroup` covering each rule shape (fixed/choose-N/
  min/max/range/tagRequirements) found across the five programs.
- Unit tests for the module registry loader (dedup by code, cross-catalog
  pool resolution with `capEcts`).
- Manual verification in-browser for each of the 5 programs: module
  selection, drag-and-drop semester assignment, group progress bars
  reflecting real catalog rules, localStorage persistence across reload.
