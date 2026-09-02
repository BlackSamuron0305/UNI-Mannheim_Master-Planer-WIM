import type { Program } from "../data/types";

export function StatsBar({
  program, plannedEcts, semesterCount, onSemesterCountChange,
}: {
  program: Program; plannedEcts: number; semesterCount: number; onSemesterCountChange: (n: number) => void;
}) {
  return (
    <div className="stats-bar">
      <div>Planned: {plannedEcts} / {program.totalEctsRange[0]}–{program.totalEctsRange[1]} ECTS</div>
      <label>
        Semesters:
        <input
          type="number" min={1} max={12} value={semesterCount}
          onChange={(e) => onSemesterCountChange(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
        />
      </label>
      <div className="thesis-note">Thesis ({program.thesisEcts} ECTS) unlocks at {program.thesisGateEcts} ECTS planned.</div>
    </div>
  );
}
