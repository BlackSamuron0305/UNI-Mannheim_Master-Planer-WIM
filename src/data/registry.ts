import type { Module, ModulePool, Program } from "./types";

export function buildRegistry(catalogs: Record<string, Module[]>): Map<string, Module> {
  const map = new Map<string, Module>();
  for (const [key, modules] of Object.entries(catalogs)) {
    for (const mod of modules) {
      if (mod.sourceCatalog !== key) {
        throw new Error(`Module "${mod.code}" has sourceCatalog "${mod.sourceCatalog}" but is filed under "${key}"`);
      }
      const existing = map.get(mod.code);
      if (existing) {
        throw new Error(`Duplicate module code "${mod.code}" (in "${existing.sourceCatalog}" and "${mod.sourceCatalog}")`);
      }
      map.set(mod.code, mod);
    }
  }
  return map;
}

export function resolvePool(
  pool: ModulePool,
  catalogs: Record<string, Module[]>,
  registry?: Map<string, Module>,
): Module[] {
  if ("codes" in pool) {
    const lookup = registry ?? buildRegistry(catalogs);
    return pool.codes.map((code) => {
      const mod = lookup.get(code);
      if (!mod) throw new Error(`Unknown module code "${code}" in pool`);
      return mod;
    });
  }
  const source = catalogs[pool.sourceCatalog];
  if (!source) throw new Error(`Unknown source catalog "${pool.sourceCatalog}"`);
  const excluded = new Set(pool.excludeCodes ?? []);
  return source.filter((m) => !excluded.has(m.code));
}

/** Resolves every group's pool with a single shared registry build, keyed by group id. */
export function resolveGroupPools(program: Program, catalogs: Record<string, Module[]>): Map<string, Module[]> {
  const registry = buildRegistry(catalogs);
  return new Map(program.groups.map((g) => [g.id, resolvePool(g.pool, catalogs, registry)]));
}
