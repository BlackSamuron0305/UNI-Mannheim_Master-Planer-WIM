import type { Module, Plan } from "../data/types";

export function SemesterBoard({
  modules, plan, semesterCount, onAssign,
}: {
  modules: Module[]; plan: Plan; semesterCount: number; onAssign: (code: string, semester: number) => void;
}) {
  const byCode = new Map(modules.map((m) => [m.code, m]));
  const buckets: Record<number, Module[]> = { 0: [] };
  for (let s = 1; s <= semesterCount; s += 1) buckets[s] = [];
  for (const [code, sem] of Object.entries(plan)) {
    const mod = byCode.get(code);
    if (!mod) continue;
    (buckets[sem] ?? buckets[0]).push(mod);
  }

  const dropzone = (label: string, semester: number) => (
    <div
      key={semester} className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const code = e.dataTransfer.getData("text/plain");
        if (code) onAssign(code, semester);
      }}
    >
      <div className="dz-head">{label}</div>
      {buckets[semester].map((m) => <div key={m.code} className="module-chip" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", m.code)}>{m.code} — <span>{m.name}</span> ({m.ects} ECTS)</div>)}
    </div>
  );

  return (
    <div className="semester-board">
      {dropzone("Unassigned", 0)}
      {Array.from({ length: semesterCount }, (_, i) => i + 1).map((s) => dropzone(`Semester ${s}`, s))}
    </div>
  );
}
