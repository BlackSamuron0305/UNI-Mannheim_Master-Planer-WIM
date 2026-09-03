# UNI Mannheim Master Planer (WIM)

A module planner for University of Mannheim master's degree students.
Pick a program, select modules from its catalog, drag them onto
semesters, and track live progress toward each requirement group's
ECTS target — all persisted locally in the browser. The first program
supported is M.Sc. Business Informatics (Wifo); module data is sourced
directly from the official Mannheim module catalogs in
`Modul-Catalogues/`.

## Getting started

Requires Node 22.12 or newer.

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the test suite (vitest)
npm run lint     # oxlint
npm run build    # typecheck (tsc -b) and build for production
```

## Adding a program

1. Add a catalog under `src/data/catalog/` and register it in `src/data/catalog/index.ts`.
   Module codes must be unique across all catalogs, and each module's
   `sourceCatalog` must match the key it is registered under.
2. Add a program definition under `src/data/programs/` and list it in
   `src/data/programs/index.ts`. Group rules support ECTS/count bounds,
   `tagRequirements`, and `caps` (limit how many ECTS from a source
   catalog or tag count toward the group).
3. Add data tests like `src/data/programs/wifo.test.ts`: pool sizes,
   exclusions, and group targets summing to the program total.

## Deployment

The app is a static bundle with no runtime configuration. The
`Dockerfile` builds it and serves `dist/` with nginx (`nginx.conf` adds
the SPA fallback). It is deployed through Coolify.

```bash
docker build -t wim-master-planner .
docker run --rm -p 8080:80 wim-master-planner
```

CI (`.github/workflows/ci.yml`) runs lint, build, and tests on every
push and pull request to `main`, and builds and smoke-tests the Docker
image on `main`.
