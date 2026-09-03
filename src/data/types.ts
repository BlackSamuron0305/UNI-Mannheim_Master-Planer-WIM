export type ExamType = "no" | "short" | "mid" | "long" | "unknown";
export type SemesterOffering = "HWS" | "FSS" | "BOTH" | "IRREGULAR" | "UNKNOWN";

/** Upper bound for the semester board and the persisted semester count. */
export const MAX_SEMESTERS = 12;

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

export type ModulePool = { codes: string[] } | { sourceCatalog: string; excludeCodes?: string[] };

export interface TagRequirement {
  tag: string;
  minCount?: number;
  minEcts?: number;
}

/**
 * Caps how many ECTS from a subset of the pool count toward the group's ECTS
 * rules (e.g. "up to 24 ECTS may come from the Wifo catalog"). Modules match
 * by source catalog, by tag, or by both. Excess ECTS stay selected but are
 * not counted.
 */
export interface EctsCap {
  sourceCatalog?: string;
  tag?: string;
  maxEcts: number;
}

export interface GroupRule {
  minEcts?: number;
  maxEcts?: number;
  exactEcts?: number;
  minCount?: number;
  maxCount?: number;
  tagRequirements?: TagRequirement[];
  caps?: EctsCap[];
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
