import type { Module, ModulePool } from "./types";

export function buildRegistry(catalogs: Record<string, Module[]>): Map<string, Module> {
  const map = new Map<string, Module>();
  for (const modules of Object.values(catalogs)) {
    for (const mod of modules) {
      const existing = map.get(mod.code);
      if (existing) {
        throw new Error(`Duplicate module code "${mod.code}" (in "${existing.sourceCatalog}" and "${mod.sourceCatalog}")`);
      }
      map.set(mod.code, mod);
    }
  }
  return map;
}

export function resolvePool(pool: ModulePool, catalogs: Record<string, Module[]>): Module[] {
  if ("codes" in pool) {
    const registry = buildRegistry(catalogs);
    return pool.codes.map((code) => {
      const mod = registry.get(code);
      if (!mod) throw new Error(`Unknown module code "${code}" in pool`);
      return mod;
    });
  }
  const source = catalogs[pool.sourceCatalog];
  if (!source) throw new Error(`Unknown source catalog "${pool.sourceCatalog}"`);
  return [...source];
}
