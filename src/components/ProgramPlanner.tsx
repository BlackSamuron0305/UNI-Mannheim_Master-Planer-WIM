import { useEffect, useMemo, useState } from "react";
import type { Module, Program } from "../data/types";
import { CATALOGS } from "../data/catalog";
import { resolveGroupPools } from "../data/registry";
import { loadPlan, savePlan, type StoredPlan } from "../lib/storage";
import { StatsBar } from "./StatsBar";
import { GroupProgress } from "./GroupProgress";
import { ModuleTable } from "./ModuleTable";
import { SemesterBoard } from "./SemesterBoard";

export function ProgramPlanner({ program }: { program: Program }) {
  // Resolve each group's pool once per program. Module codes are unique
  // across CATALOGS, so no per-program catalog subset is needed.
  const groupPools = useMemo(() => resolveGroupPools(program, CATALOGS), [program]);

  // Selectable pool derived from the program's own groups, not the raw
  // catalog union — a module excluded from every group's pool (e.g. via
  // a group's `excludeCodes`) must not be selectable just because it's
  // still present in one of the underlying catalogs.
  const poolModules = useMemo(() => {
    const byCode = new Map<string, Module>();
    for (const pool of groupPools.values()) {
      for (const m of pool) byCode.set(m.code, m);
    }
    return [...byCode.values()];
  }, [groupPools]);

  const [stored, setStored] = useState<StoredPlan>(() => loadPlan(program.id, program.semesters));
  const { semesters: semesterCount, modules: plan } = stored;

  useEffect(() => savePlan(program.id, stored), [program.id, stored]);

  const toggle = (code: string) => {
    setStored((prev) => {
      const modules = { ...prev.modules };
      if (code in modules) delete modules[code];
      else modules[code] = 0;
      return { ...prev, modules };
    });
  };

  const assign = (code: string, semester: number) => {
    setStored((prev) => (code in prev.modules ? { ...prev, modules: { ...prev.modules, [code]: semester } } : prev));
  };

  // A module sitting in a semester that no longer exists drops back to
  // "unassigned", so the stored plan never points at a phantom semester.
  const changeSemesterCount = (count: number) => {
    setStored((prev) => ({
      semesters: count,
      modules: Object.fromEntries(
        Object.entries(prev.modules).map(([code, semester]) => [code, semester > count ? 0 : semester]),
      ),
    }));
  };

  const plannedEcts = poolModules
    .filter((m) => plan[m.code] !== undefined)
    .reduce((sum, m) => sum + m.ects, 0);

  return (
    <div className="program-planner">
      <h1>{program.name}</h1>
      <StatsBar program={program} plannedEcts={plannedEcts} semesterCount={semesterCount} onSemesterCountChange={changeSemesterCount} />
      <div className="group-panel">
        {program.groups.map((g) => (
          <GroupProgress key={g.id} group={g} poolModules={groupPools.get(g.id) ?? []} plan={plan} />
        ))}
      </div>
      <div className="planner-layout">
        <ModuleTable modules={poolModules} plan={plan} onToggle={toggle} />
        <SemesterBoard modules={poolModules} plan={plan} semesterCount={semesterCount} onAssign={assign} />
      </div>
    </div>
  );
}
