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
