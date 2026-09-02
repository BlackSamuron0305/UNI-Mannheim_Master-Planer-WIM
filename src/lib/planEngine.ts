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
