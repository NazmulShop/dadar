/**
 * Workers-safe structured logger — replaces the Express `pino` shim.
 *
 * Behaviour:
 *   - Outputs single-line JSON to console.{log,warn,error} so `wrangler tail`
 *     and external log drains can index it cleanly.
 *   - Accepts either `logger.info("message")` or `logger.info({ k: v }, "message")`,
 *     mirroring the pino API surface used by the Express code.
 *   - Optional `logger.with({ requestId, … })` returns a child logger that
 *     merges the bound fields into every entry.
 *
 * IMPORTANT: pino is NOT Workers-safe (Node streams). Do not re-add it.
 */

type Fields = Record<string, unknown>;

function norm(
  level: "info" | "warn" | "error" | "debug",
  bound: Fields,
  arg1: unknown,
  arg2?: unknown,
): string {
  let obj: Fields = { ...bound };
  let msg: string | undefined;
  if (typeof arg1 === "string") {
    msg = arg1;
  } else if (arg1 && typeof arg1 === "object") {
    obj = { ...obj, ...(arg1 as Fields) };
    if (typeof arg2 === "string") msg = arg2;
  }
  const entry: Fields = {
    level,
    ts: new Date().toISOString(),
    ...obj,
  };
  if (msg !== undefined) entry.msg = msg;
  try {
    return JSON.stringify(entry);
  } catch {
    return JSON.stringify({ level, ts: entry.ts, msg: msg ?? "<unserializable>" });
  }
}

export interface Logger {
  info(arg1: unknown, arg2?: unknown): void;
  warn(arg1: unknown, arg2?: unknown): void;
  error(arg1: unknown, arg2?: unknown): void;
  debug(arg1: unknown, arg2?: unknown): void;
  with(fields: Fields): Logger;
}

function build(bound: Fields): Logger {
  return {
    info(a, b) {
      console.log(norm("info", bound, a, b));
    },
    warn(a, b) {
      console.warn(norm("warn", bound, a, b));
    },
    error(a, b) {
      console.error(norm("error", bound, a, b));
    },
    debug(a, b) {
      console.log(norm("debug", bound, a, b));
    },
    with(fields) {
      return build({ ...bound, ...fields });
    },
  };
}

export const logger: Logger = build({});
