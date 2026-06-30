import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { Env } from "../env";

/**
 * Returns a per-request Drizzle handle bound to the D1 binding.
 * IMPORTANT: never cache this at module scope — Workers ban that.
 */
export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type DB = ReturnType<typeof getDb>;
export * from "./schema";
