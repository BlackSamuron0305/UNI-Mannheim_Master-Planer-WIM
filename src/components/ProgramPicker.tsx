import { navigateTo } from "../lib/useHashRoute";
import type { Program } from "../data/types";

export function ProgramPicker({ programs }: { programs: Program[] }) {
  return (
    <div className="program-picker">
      <h1>WIM Master Planner</h1>
      <div className="program-grid">
        {programs.map((p) => (
          <button key={p.id} className="program-card" onClick={() => navigateTo(p.id)}>
            <h2>{p.name}</h2>
            <p>{p.totalEctsRange[0]}–{p.totalEctsRange[1]} ECTS · {p.semesters} semesters</p>
          </button>
        ))}
      </div>
    </div>
  );
}
