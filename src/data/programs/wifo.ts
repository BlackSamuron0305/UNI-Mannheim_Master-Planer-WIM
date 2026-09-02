import { WIFO_MODULES } from "../catalog/wifo";
import type { Program } from "../types";

const codesByTag = (tag: string) => WIFO_MODULES.filter((m) => m.tags?.includes(tag)).map((m) => m.code);

/**
 * M.Sc. Business Informatics ("Wifo") program definition, per
 * `Modul-Catalogues/MK_Master_Wifo_22072026.pdf` section A (Overview):
 *   Fundamentals Computer Science: 18 ECTS (three "Computer Science
 *     Fundamentals" courses, 6 ECTS each) -> minCount 3, maxCount 3.
 *   Fundamentals Business Administration: 18 ECTS at least, from the shared
 *     Mannheim Master in Management module catalog -> minEcts 18. The Wifo
 *     PDF's own Fundamentals section (page 4-5) excludes 14 specific MAN/MKT
 *     codes from Wifo enrollment even though they're part of the shared
 *     businessSchool catalog; `excludeCodes` filters those out.
 *   Specialization Courses: 36 ECTS at least -> minEcts 36.
 *   Projects and Seminars: Team Project, Scientific Research and Seminars,
 *     18 ECTS fixed -> exactEcts 18, plus tagRequirements requiring at least
 *     one `team-project`-tagged and one `scientific-research`-tagged module
 *     selected (an ECTS total alone doesn't guarantee TP 500 + SQ 500 are
 *     both actually in the plan, since e.g. four seminars + SQ 500 also sums
 *     to 18).
 *   Master's Thesis: 30 ECTS, gated on 60 ECTS already earned.
 *   Total: 120 ECTS across 4 semesters.
 * All values verified directly against the PDF; none of the brief's
 * illustrative rule values needed adjustment.
 */
export const WIFO_PROGRAM: Program = {
  id: "wifo",
  name: "M.Sc. Business Informatics",
  shortName: "Wifo",
  totalEctsRange: [120, 120],
  semesters: 4,
  thesisEcts: 30,
  thesisGateEcts: 60,
  groups: [
    {
      id: "fundamentals-cs", name: "Fundamentals Computer Science",
      pool: { codes: codesByTag("fundamentals-cs") },
      rule: { minCount: 3, maxCount: 3 },
    },
    {
      id: "fundamentals-ba", name: "Fundamentals Business Administration",
      pool: {
        sourceCatalog: "businessSchool",
        excludeCodes: [
          "MAN 605", "MAN 608", "MAN 646", "MAN 647", "MAN 648", "MAN 654", "MAN 655", "MAN 656", "MAN 699",
          "MKT 575", "MKT 580", "MKT 622", "MKT 623", "MKT 625",
        ],
      },
      rule: { minEcts: 18 },
    },
    {
      id: "specialization", name: "Specialization Courses",
      pool: { codes: codesByTag("specialization") },
      rule: { minEcts: 36 },
    },
    {
      id: "projects-seminars", name: "Projects and Seminars",
      pool: { codes: codesByTag("projects-seminars") },
      rule: {
        exactEcts: 18,
        tagRequirements: [
          { tag: "team-project", minCount: 1 },
          { tag: "scientific-research", minCount: 1 },
        ],
      },
    },
    {
      id: "thesis", name: "Master's Thesis",
      pool: { codes: codesByTag("thesis") },
      rule: { exactEcts: 30 },
    },
  ],
};
