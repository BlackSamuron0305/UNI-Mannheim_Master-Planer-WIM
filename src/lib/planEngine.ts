import type { EctsCap, Group, Module, Plan } from "../data/types";

export type GroupStatus = "incomplete" | "on-track" | "satisfied" | "over";

export interface GroupEvaluation {
  selectedCount: number;
  /** Raw ECTS of every selected module in the pool. */
  selectedEcts: number;
  /** ECTS that count toward the group's rules once `caps` are applied. */
  countedEcts: number;
  status: GroupStatus;
}

const sumEcts = (modules: Module[]) => modules.reduce((sum, m) => sum + m.ects, 0);

const matchesCap = (m: Module, cap: EctsCap) =>
  (cap.sourceCatalog === undefined || m.sourceCatalog === cap.sourceCatalog) &&
  (cap.tag === undefined || (m.tags?.includes(cap.tag) ?? false));

function applyCaps(selected: Module[], caps: EctsCap[]): number {
  let counted = sumEcts(selected);
  for (const cap of caps) {
    const capped = sumEcts(selected.filter((m) => matchesCap(m, cap)));
    if (capped > cap.maxEcts) counted -= capped - cap.maxEcts;
  }
  return counted;
}

export function evaluateGroup(group: Group, poolModules: Module[], plan: Plan): GroupEvaluation {
  const selected = poolModules.filter((m) => plan[m.code] !== undefined);
  const selectedCount = selected.length;
  const selectedEcts = sumEcts(selected);
  const { minEcts, maxEcts, exactEcts, minCount, maxCount, tagRequirements = [], caps = [] } = group.rule;
  const countedEcts = applyCaps(selected, caps);
  const base = { selectedCount, selectedEcts, countedEcts };

  const overEcts =
    (maxEcts !== undefined && countedEcts > maxEcts) ||
    (exactEcts !== undefined && countedEcts > exactEcts);
  const overCount = maxCount !== undefined && selectedCount > maxCount;

  if (overEcts || overCount) {
    return { ...base, status: "over" };
  }

  if (selectedCount === 0) {
    return { ...base, status: "incomplete" };
  }

  const meetsEcts =
    (exactEcts === undefined || countedEcts === exactEcts) &&
    (minEcts === undefined || countedEcts >= minEcts) &&
    (maxEcts === undefined || countedEcts <= maxEcts);
  const meetsCount =
    (minCount === undefined || selectedCount >= minCount) &&
    (maxCount === undefined || selectedCount <= maxCount);
  const meetsTags = tagRequirements.every((req) => {
    const tagged = selected.filter((m) => m.tags?.includes(req.tag));
    const countOk = req.minCount === undefined || tagged.length >= req.minCount;
    const ectsOk = req.minEcts === undefined || sumEcts(tagged) >= req.minEcts;
    return countOk && ectsOk;
  });

  return { ...base, status: meetsEcts && meetsCount && meetsTags ? "satisfied" : "on-track" };
}

/**
 * The ECTS figure a progress display should show as the group's goal, or
 * `undefined` when the rule implies none. A count-based rule ("choose 3")
 * only has an ECTS target when every module in the pool is worth the same.
 */
export function groupTargetEcts(group: Group, poolModules: Module[]): number | undefined {
  const { exactEcts, minEcts, minCount, maxEcts } = group.rule;
  if (exactEcts !== undefined) return exactEcts;
  if (minEcts !== undefined) return minEcts;
  const [first] = poolModules;
  if (minCount !== undefined && first !== undefined && poolModules.every((m) => m.ects === first.ects)) {
    return minCount * first.ects;
  }
  return maxEcts;
}
