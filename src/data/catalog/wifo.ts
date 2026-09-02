import type { Module } from "../types";

/**
 * M.Sc. Business Informatics ("Wifo") module catalog, HWS 2026 / FSS 2027 edition
 * (`Modul-Catalogues/MK_Master_Wifo_22072026.pdf`).
 *
 * Covers four of the program's five groups (the fifth, Fundamentals Business
 * Administration, is the shared `businessSchool` catalog resolved directly by
 * `programs/wifo.ts`):
 *  - Fundamentals Computer Science (tag "fundamentals-cs"): the 7 mandatory-pool
 *    modules, 6 ECTS each, choose 3 of 7 = 18 ECTS.
 *  - Specialization Courses (tag "specialization"): CS-Courses, IE-Courses,
 *    IS-Courses, and "International Courses and other Specialization Courses"
 *    (DS 203, MAB 519, MAC 404) all feed this single group. IS-Courses have no
 *    description of their own in this PDF ("see MMM module catalogue"); their
 *    fields were pulled from `Modulkatalog_Mannheim_Master_in_Management_de.pdf`
 *    (Area Information Systems chapter) using the codes/ECTS from this PDF's
 *    IS-Courses overview table.
 *  - Projects and Seminars (tag "projects-seminars"): Team Project (TP 500) and
 *    Scientific Research (SQ 500) are each individually listed with fixed ECTS,
 *    plus a pool of 19 individually-listed Seminar options at 4 ECTS each
 *    (15 CS-coded, 4 IS-coded). TP 500 (12) + SQ 500 (2) + any one seminar (4)
 *    = 18 ECTS, matching the group's fixed total. The 4 IS-coded seminars
 *    (IS 703, IS 712, IS 742, IS 751) carry the Wifo-specific 4-ECTS value from
 *    this PDF's own overview table, not the (higher, MMM-student) ECTS value
 *    quoted on the shared IS 703/IS 742 description pages in the MMM catalog.
 *
 * Excluded by design:
 *  - `BI 656` "International Course": no fixed ECTS value ("depends on course
 *    taken abroad", "Max. 18"), only bookable while on an exchange semester —
 *    same exclusion rationale as the "International Course" placeholders left
 *    out of `catalog/businessSchool.ts`.
 *
 * Known data gap (flagged, not silently dropped):
 *  - `IS 751` "E-Government Adoption and Societal Change" is listed in this
 *    PDF's Projects and Seminars overview table (code, name, 4 ECTS) with a
 *    pointer to the MMM catalog for its full description, but no module with
 *    that code or name exists in the current MMM catalog PDF (verified: not
 *    found by code, title, or content search). Its `examForm`/`examType`/
 *    `semester` are therefore honestly marked unknown/unavailable rather than
 *    guessed.
 */
export const WIFO_MODULES: Module[] = [
  // ---------------------------------------------------------------------
  // B. Fundamentals Computer Science (choose 3 of 7, 6 ECTS each = 18 ECTS)
  // ---------------------------------------------------------------------
  {
    code: "CS 500", name: "Advanced Software Engineering", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "HWS", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  {
    code: "CS 530", name: "Database Systems II", ects: 6,
    examForm: "Schriftliche Prüfung (90 Minuten)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  {
    code: "CS 550", name: "Algorithmics", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  {
    code: "CS 560", name: "Large-Scale Data Management", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "HWS", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  {
    code: "CS 652", name: "Data Security and Privacy", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  {
    code: "IE 500", name: "Data Mining", ects: 6,
    examForm: "Written examination (60 min, 75%), project report (20%), oral project presentation (5%)",
    examType: "short", semester: "BOTH", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },
  {
    code: "IE 560", name: "Foundations of Artificial Intelligence - Reasoning and Decision Making", ects: 6,
    examForm: "Written examination (90 minutes); admission requirement: midterm exam (45 min, propositional logic and probability theory)",
    examType: "long", semester: "HWS", language: "EN", available: true,
    tags: ["fundamentals-cs"], sourceCatalog: "wifo",
  },

  // ---------------------------------------------------------------------
  // C. Specialization Courses - CS-Courses
  // ---------------------------------------------------------------------
  {
    code: "CS 600", name: "Model Driven Development", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 606", name: "Foundations of Artificial Intelligence: Search and Problem Solving", ects: 6,
    examForm: "Schriftliche Prüfung (90 Minuten)", examType: "long",
    semester: "HWS", language: "DE/EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 630", name: "Generative Software Engineering", ects: 6,
    examForm: "Project reports (70%) and oral presentations (30%)", examType: "no",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 646", name: "Higher Level Computer Vision", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 647", name: "Image Processing", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 651", name: "Cryptography II", ects: 6,
    examForm: "Oral examination (30 minutes)", examType: "mid",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 664", name: "Blockchain Security", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },
  {
    code: "CS 668", name: "Generative Computer Vision Models", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "cs-courses"], sourceCatalog: "wifo",
  },

  // ---------------------------------------------------------------------
  // C. Specialization Courses - IE-Courses
  // ---------------------------------------------------------------------
  {
    code: "IE 630", name: "Anfrageoptimierung / Query Optimization", ects: 6,
    examForm: "Mündliche Prüfung (30 Minuten)", examType: "mid",
    semester: "FSS", language: "DE", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 650", name: "Knowledge Graphs", ects: 6,
    examForm: "Written examination (60 minutes); admission requirement: project report and oral presentation",
    examType: "short", semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 655", name: "Industrial Applications of Artificial Intelligence", ects: 9,
    examForm: "Learning portfolio (continuous assessment)", examType: "no",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 670", name: "Web Data Integration", ects: 3,
    examForm: "Written examination (60 minutes)", examType: "short",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 675b", name: "Machine Learning", ects: 9,
    examForm: "Written examination (120 minutes); admission requirement: pass at least 3 homework assignments",
    examType: "long", semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 678", name: "Deep Learning", ects: 6,
    examForm: "Oral examination (25 minutes); admission requirement: pass at least 2 homework assignments",
    examType: "mid", semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 679", name: "AI Deployment and Operations", ects: 3,
    examForm: "Coding project submission and group presentation (10-15 minutes per participant)",
    examType: "no", semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 683", name: "Web Data Integration Project", ects: 3,
    examForm: "Project report (70%, 10-20 pages), oral project presentation (30%, 15-20 minutes)",
    examType: "no", semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 685", name: "Large Language Models and Agents", ects: 3,
    examForm: "Written examination (60 minutes)", examType: "short",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 686", name: "Large Language Models and Agents Project", ects: 3,
    examForm: "Project report (50%, 10-20 pages), oral project presentation and Q&A (50%, 15-20 minutes)",
    examType: "no", semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 692", name: "Advanced Process Mining", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 695", name: "Reinforcement Learning", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 696", name: "Advanced Methods in Text Analytics", ects: 6,
    examForm: "Written examination (90 minutes)", examType: "long",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 698", name: "Foundations and Applications of Digital Health Technologies", ects: 3,
    examForm: "Written examination (45 minutes)", examType: "short",
    semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IE 699", name: "Co-creating digital health applications with design methodology", ects: 6,
    examForm: "Presentation in course (20 minutes: 15 minutes presentation, 5 minutes Q&A)",
    examType: "no", semester: "FSS", language: "EN", available: true,
    tags: ["specialization", "ie-courses"], sourceCatalog: "wifo",
  },

  // ---------------------------------------------------------------------
  // C. Specialization Courses - IS-Courses
  // (No detail pages in the Wifo PDF; fields sourced from
  // Modulkatalog_Mannheim_Master_in_Management_de.pdf, Area Information
  // Systems chapter. ECTS/language taken from the Wifo overview table.)
  // ---------------------------------------------------------------------
  {
    code: "IS 512", name: "IT Management in the Digital Age", ects: 6,
    examForm: "Written exam (60 min)", examType: "short",
    semester: "FSS", language: "EN", restriction: "Limited to 80 participants",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 513", name: "Applied IT Management in the Digital Age", ects: 6,
    examForm: "Case study: written assignment (slide deck, 80%) and presentation (20%)",
    examType: "no", semester: "FSS", language: "EN",
    restriction: "Enrollment via the student portal required for course material access (no participant cap)",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 540", name: "Management of Enterprise Systems", ects: 6,
    examForm: "Case study (20%) and written exam (60 min, 80%)", examType: "short",
    semester: "HWS", language: "EN", restriction: "Limited to 80 participants",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 541", name: "Methods and Theories in Information Systems (ManTIS)", ects: 6,
    examForm: "Presentation (30%), written term paper (70%, ten pages)", examType: "no",
    semester: "FSS", language: "EN", restriction: "Restricted admission",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 603", name: "IT Leadership in Organizations", ects: 6,
    examForm: "Written examination (60 min, 80%) and presentation (20%)", examType: "short",
    semester: "HWS", language: "DE", restriction: "Limited to 35 participants",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 607", name: "Digital Innovation", ects: 6,
    examForm: "Written exam (60 min)", examType: "short",
    semester: "FSS", language: "EN", restriction: "Restricted admission",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 609", name: "AI and Technology Strategy", ects: 6,
    examForm: "Written, closed book exam (60 minutes)", examType: "short",
    semester: "FSS", language: "EN", restriction: "Restricted admission; register via the student portal",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 611", name: "Advanced Topics in Large Language Models", ects: 6,
    examForm: "Written exam (60 min); admission requirement: pass at least 50% of exercise/assignment points",
    examType: "short", semester: "FSS", language: "EN", restriction: "Restricted admission",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 612", name: "Product Experimentation and Analytics", ects: 6,
    examForm: "Written exam, closed book (60 min)", examType: "short",
    semester: "HWS", language: "EN", restriction: "Restricted admission; register via the student portal",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 613", name: "Applied Project in Design Thinking and Lean Software Development", ects: 6,
    examForm: "Software development term project", examType: "no",
    semester: "HWS", language: "EN", restriction: "Limited to 32 participants",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 614", name: "Corporate Knowledge Management", ects: 6,
    examForm: "Written exam (60 min); preliminary case study (pass/fail) required for admission",
    examType: "short", semester: "HWS", language: "EN",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 615", name: "Enterprise Cloud Design and Development", ects: 6,
    examForm: "Written exam (60 min, 80%), case study (20%)", examType: "short",
    semester: "HWS", language: "EN", restriction: "Restricted admission",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 617", name: "Large Language Models for the Economic and Social Sciences", ects: 6,
    examForm: "Project presentation (30%) and report (50%), class participation (20%)", examType: "no",
    semester: "HWS", language: "EN", restriction: "Restricted admission",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 629", name: "Agile Software Product Management and Design", ects: 6,
    examForm: "Written exam (60 min, 60%) and case study (40%)", examType: "short",
    semester: "FSS", language: "EN",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },
  {
    code: "IS 661", name: "Text Analytics", ects: 6,
    examForm: "Written exam (90 min); preliminary requirement: pass at least 50% of exercise assignments",
    examType: "long", semester: "HWS", language: "EN", restriction: "Restricted admission",
    available: true, tags: ["specialization", "is-courses"], sourceCatalog: "wifo",
  },

  // ---------------------------------------------------------------------
  // C. Specialization Courses - International Courses and other
  // Specialization Courses ("Further")
  // `BI 656` International Course excluded: no fixed ECTS value (see file
  // header comment).
  // ---------------------------------------------------------------------
  {
    code: "DS 203", name: "Responsible AI: Conceptual Foundations, Methods and Applications", ects: 6,
    examForm: "Essay (due December 8th)", examType: "no",
    semester: "HWS", language: "EN", available: true,
    tags: ["specialization", "further"], sourceCatalog: "wifo",
  },
  {
    code: "MAB 519", name: "Reinforcement Learning", ects: 10,
    examForm: "Oral examination (30 minutes); admission requirement: participation in the exercises",
    examType: "mid", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["specialization", "further"], sourceCatalog: "wifo",
  },
  {
    code: "MAC 404", name: "Lineare Optimierung / Linear Optimization", ects: 8,
    examForm: "Schriftliche Prüfung (90 Minuten); Vorleistung: Bearbeitung von Übungsblättern mit mind. 50% der Punkte",
    examType: "long", semester: "HWS", language: "DE/EN", available: true,
    tags: ["specialization", "further"], sourceCatalog: "wifo",
  },

  // ---------------------------------------------------------------------
  // D. Projects and Seminars (Team Project + Scientific Research + one
  // Seminar = 18 ECTS fixed)
  // ---------------------------------------------------------------------
  {
    code: "TP 500", name: "Team Project", ects: 12,
    examForm: "One or more reports totaling 50-120 pages, plus a presentation (10-90 minutes)",
    examType: "no", semester: "BOTH", language: "EN", available: true,
    tags: ["projects-seminars", "team-project"], sourceCatalog: "wifo",
  },
  {
    code: "SQ 500", name: "Scientific Research", ects: 2,
    examForm: "Eine digital unterstützte Hausarbeit (150 minutes)", examType: "long",
    semester: "BOTH", language: "EN", available: true,
    tags: ["projects-seminars", "scientific-research"], sourceCatalog: "wifo",
  },
  {
    code: "CS 701", name: "Selected Topics in Algorithmics and Cryptography", ects: 4,
    examForm: "Presentation and discussion (60 min presentation, 15-30 min discussion), written report (15 pages)",
    examType: "no", semester: "FSS", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 704", name: "Master Seminar Artificial Intelligence", ects: 4,
    examForm: "Two presentations (30 minutes total) and a final seminar report (12-20 pages)",
    examType: "no", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 707", name: "Data Analytics Seminar", ects: 4,
    examForm: "Oral presentation, experimental results (if applicable), active participation, written discussion summary",
    examType: "no", semester: "BOTH", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 708", name: "Seminar Software Engineering", ects: 4,
    examForm: "Seminar paper (12-13 pages), presentation (15 min) plus discussion (5-10 min), peer review (1-5 pages)",
    examType: "no", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 709", name: "Seminar Text Analytics", ects: 4,
    examForm: "Flash presentation (3 min), final presentation (15 min + discussion), report (10 pages + references), peer review",
    examType: "no", semester: "IRREGULAR", language: "DE/EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 710", name: "Selected Topics in Data Science", ects: 4,
    examForm: "Seminar paper (5-25 pages), peer review (1-10 pages), presentation (15-60 minutes)",
    examType: "no", semester: "IRREGULAR", language: "DE/EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 715", name: "Solving Complex Tasks using Large Language Models", ects: 4,
    examForm: "Report (12-15 pages excluding references), presentation (12 min + 8 min discussion)",
    examType: "no", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 716", name: "IT-Security", ects: 4,
    examForm: "Presentation and technical discussion (90 minutes total), seminar paper (8 pages, double-column)",
    examType: "no", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 717", name: "Master Seminar on Computer Vision", ects: 4,
    examForm: "Two presentations (50%, 3-5 min + 25-30 min), seminar report (50%, 10-20 pages)",
    examType: "no", semester: "BOTH", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 718", name: "AI and Data Science in Fiction and Society", ects: 4,
    examForm: "Seminar paper (15-20 pages), peer review (up to 10 pages), presentation (20-30 minutes)",
    examType: "no", semester: "HWS", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 720", name: "Uncertainty Estimation", ects: 4,
    examForm: "Seminar paper (5-25 pages), peer review (1-10 pages), presentation (15-60 minutes)",
    examType: "no", semester: "IRREGULAR", language: "DE/EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 721", name: "Seminar Data-Science I", ects: 4,
    examForm: "Seminar report (12-14 pages + bibliography), presentation (40 min) and Q&A, participation, reflection on a peer's report",
    examType: "no", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 730", name: "Advanced Implementation Techniques for Database Systems", ects: 4,
    examForm: "Presentation (30 min, 80%), report (17 pages, 20%)", examType: "no",
    semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 731", name: "Database Theory", ects: 4,
    examForm: "Presentation (30 min, 80%), report (17 pages, 20%)", examType: "no",
    semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "CS 733", name: "Advanced Topics in Process Mining", ects: 4,
    examForm: "Seminar paper (50%, 18 pages), mid-term presentation (10%, 10+10 min), final presentation (40%, 20+10 min)",
    examType: "no", semester: "FSS", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "IS 703", name: "Master Seminar \"AI, Platforms, and the Digital Economy\"", ects: 4,
    examForm: "Written seminar paper (50%), presentation (30%), discussion (20%)", examType: "no",
    semester: "BOTH", language: "EN",
    restriction: "Necessary: successful completion of IS 609, IS 608, or IS 612 before the seminar kick-off",
    available: true, tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "IS 712", name: "Contemporary Issues in Information Systems Research", ects: 4,
    examForm: "Seminar paper (15-25 pages), presentation (15-30 min), discussant statement (2-5 min), participation in the plenary discussion",
    examType: "no", semester: "IRREGULAR", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "IS 742", name: "Seminar Trends in Enterprise Systems", ects: 4,
    examForm: "Written report (80%, scope depends on the assigned topic) and presentation (20%)",
    examType: "no", semester: "BOTH", language: "EN",
    restriction: "Restricted admission; application via email (motivation letter, transcript of records, CV)",
    available: true, tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
  {
    code: "IS 751", name: "E-Government Adoption and Societal Change", ects: 4,
    examForm: "Unknown - listed in this catalog's overview table with a pointer to the MMM module catalogue, but no module with this code exists there in the current edition",
    examType: "unknown", semester: "UNKNOWN", language: "EN", available: true,
    tags: ["projects-seminars", "seminar"], sourceCatalog: "wifo",
  },
];
