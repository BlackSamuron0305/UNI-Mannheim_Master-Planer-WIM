import "./styles/global.css";
import { useHashRoute } from "./lib/useHashRoute";
import { PROGRAMS } from "./data/programs";
import { ProgramPicker } from "./components/ProgramPicker";
import { ProgramPlanner } from "./components/ProgramPlanner";

export default function App() {
  const routeId = useHashRoute();
  const program = PROGRAMS.find((p) => p.id === routeId);

  return (
    <div className="app-shell">
      {program ? <ProgramPlanner key={program.id} program={program} /> : <ProgramPicker programs={PROGRAMS} />}
    </div>
  );
}
