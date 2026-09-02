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
