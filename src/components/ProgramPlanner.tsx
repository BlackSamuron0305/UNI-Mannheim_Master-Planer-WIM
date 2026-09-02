import { useEffect, useMemo, useState } from "react";
import type { Module, Program, Plan } from "../data/types";
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

  // Selectable pool derived from the program's own groups, not the raw
  // catalog union — a module excluded from every group's pool (e.g. via
  // a group's `excludeCodes`) must not be selectable just because it's
  // still present in one of the underlying catalogs.
  const poolModules = useMemo(() => {
    const byCode = new Map<string, Module>();
    for (const g of program.groups) {
      for (const m of resolvePool(g.pool, catalogs)) byCode.set(m.code, m);
    }
    return [...byCode.values()];
  }, [program, catalogs]);

  const [plan, setPlan] = useState<Plan>(() => loadPlan(program.id));
  const [semesterCount, setSemesterCount] = useState(program.semesters);

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

  const plannedEcts = poolModules
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
        <ModuleTable modules={poolModules} plan={plan} onToggle={toggle} />
        <SemesterBoard modules={poolModules} plan={plan} semesterCount={semesterCount} onAssign={assign} />
      </div>
    </div>
  );
}
