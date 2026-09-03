import { evaluateGroup, groupTargetEcts } from "../lib/planEngine";
import type { Group, Module, Plan } from "../data/types";

export function GroupProgress({ group, poolModules, plan }: { group: Group; poolModules: Module[]; plan: Plan }) {
  const { countedEcts, status } = evaluateGroup(group, poolModules, plan);
  const target = groupTargetEcts(group, poolModules);
  return (
    <div className={`group-progress group-progress--${status}`}>
      <div className="group-progress__head">
        <span>{group.name}</span>
        <span>{countedEcts}{target !== undefined ? ` / ${target}` : ""} ECTS · {status}</span>
      </div>
    </div>
  );
}
