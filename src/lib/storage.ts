import { MAX_SEMESTERS, type Plan } from "../data/types";

/** What the planner persists per program. */
export interface StoredPlan {
  semesters: number;
  modules: Plan;
}

const keyV3 = (programId: string) => `planner:v3:${programId}`;
/** Pre-semester-count format: the bare `Plan` map. Read for migration only. */
const keyV2 = (programId: string) => `planner:v2:${programId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSemesterIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** Keeps only entries whose value is a valid semester index; anything else is dropped. */
function parseModules(value: unknown): Plan {
  if (!isRecord(value)) return {};
  const modules: Plan = {};
  for (const [code, semester] of Object.entries(value)) {
    if (isSemesterIndex(semester)) modules[code] = semester;
  }
  return modules;
}

function parseSemesters(value: unknown, fallback: number): number {
  return isSemesterIndex(value) && value >= 1 && value <= MAX_SEMESTERS ? value : fallback;
}

export function loadPlan(programId: string, defaultSemesters: number): StoredPlan {
  const v3 = readJson(keyV3(programId));
  if (v3 !== undefined) {
    return isRecord(v3)
      ? { semesters: parseSemesters(v3.semesters, defaultSemesters), modules: parseModules(v3.modules) }
      : { semesters: defaultSemesters, modules: {} };
  }
  return { semesters: defaultSemesters, modules: parseModules(readJson(keyV2(programId))) };
}

export function savePlan(programId: string, plan: StoredPlan): void {
  localStorage.setItem(keyV3(programId), JSON.stringify(plan));
}
