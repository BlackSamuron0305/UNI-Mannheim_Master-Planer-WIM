import type { Module } from "../types";
import { BUSINESS_SCHOOL_MODULES } from "./businessSchool";
import { WIFO_MODULES } from "./wifo";

/**
 * Every catalog the app knows about, keyed by the `sourceCatalog` value its
 * modules carry. Module codes are unique across all catalogs (enforced by
 * `buildRegistry`), so any program may reference any module by code, and a
 * `{ sourceCatalog }` pool may pull in a whole catalog.
 */
export const CATALOGS: Record<string, Module[]> = {
  wifo: WIFO_MODULES,
  businessSchool: BUSINESS_SCHOOL_MODULES,
};
