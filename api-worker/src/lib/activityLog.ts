import type { Env } from "../env";
import { getDb, adminActivityLogsTable } from "../db";
import { generateId } from "./ids";

export type AdminAction =
  | "admin_promotion"
  | "admin_removal"
  | "user_ban"
  | "user_unban"
  | "user_suspend"
  | "seller_approval"
  | "product_approval"
  | "product_removal"
  | "settings_change"
  | "super_admin_created"
  | "super_admin_bootstrap_attempt"
  | (string & {});

export async function logAdminActivity(
  env: Env,
  input: {
    adminId: string;
    action: AdminAction;
    targetUserId?: string | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  try {
    const db = getDb(env);
    await db.insert(adminActivityLogsTable).values({
      id: generateId(),
      adminId: input.adminId,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      details: (input.details ?? null) as any,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    // never let logging break the request
    console.warn("[activityLog] failed", err);
  }
}
