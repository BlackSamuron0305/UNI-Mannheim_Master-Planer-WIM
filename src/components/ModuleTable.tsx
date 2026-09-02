import { useMemo, useState } from "react";
import type { Module, Plan } from "../data/types";

export function ModuleTable({ modules, plan, onToggle }: { modules: Module[]; plan: Plan; onToggle: (code: string) => void }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return modules.filter((m) => !q || `${m.code} ${m.name}`.toLowerCase().includes(q));
  }, [modules, search]);

  return (
    <div className="module-table">
      <input placeholder="Search code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <table>
        <thead>
          <tr><th /><th>Code</th><th>Module</th><th>ECTS</th><th>Exam</th><th>Semester</th></tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m.code}>
              <td>
                <input
                  type="checkbox" checked={plan[m.code] !== undefined} disabled={!m.available}
                  onChange={() => onToggle(m.code)}
                />
              </td>
              <td>{m.code}</td>
              <td>{m.name}{m.crossListedNote ? <span className="hint"> ({m.crossListedNote})</span> : null}</td>
              <td>{m.ects}</td>
              <td>{m.examForm || "–"}</td>
              <td>{m.semester}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
