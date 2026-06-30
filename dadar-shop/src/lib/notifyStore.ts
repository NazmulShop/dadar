import { toast } from "sonner";
import {
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABEL,
  DEFAULT_NOTIFICATION_PREFS,
  type AppNotification,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationTemplate,
} from "@/data/account";

/* ============================================================
 * Dadar Shop — Notification dispatcher
 * ------------------------------------------------------------
 * Sends notifications across 4 channels using event templates:
 *   - in_app   → appended to local feed (visible in /account/notifications)
 *   - email    → mock SMTP (console + toast badge)
 *   - sms      → mock SMS gateway (console + toast badge)
 *   - push     → uses Web Notifications API when permitted, else mocks
 *
 * Respects per-user channel preferences (DEFAULT_NOTIFICATION_PREFS,
 * overridable via /account/notifications UI).
 * ============================================================ */

const LS_FEED = "dadar.notify.feed.v1";
const LS_PREFS = "dadar.notify.prefs.v1";
const LS_LOG = "dadar.notify.log.v1";

type Prefs = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

export interface DispatchLog {
  id: string;
  at: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  to: string;
  subject: string;
  body: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function getPrefs(): Prefs {
  return readJson<Prefs>(LS_PREFS, DEFAULT_NOTIFICATION_PREFS);
}

export function setPrefs(p: Prefs) {
  writeJson(LS_PREFS, p);
}

export function getFeed(): AppNotification[] {
  return readJson<AppNotification[]>(LS_FEED, []);
}

export function setFeed(list: AppNotification[]) {
  writeJson(LS_FEED, list);
}

export function getLog(): DispatchLog[] {
  return readJson<DispatchLog[]>(LS_LOG, []);
}

function pushLog(entry: DispatchLog) {
  const next = [entry, ...getLog()].slice(0, 200);
  writeJson(LS_LOG, next);
}

function render(template: string, data: Record<string, string | number | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(data[k] ?? `{{${k}}}`));
}

/**
 * NotificationTemplate uses `inApp` (camelCase) for the in-app message body,
 * while NotificationChannel uses `"in_app"` (snake_case) as the channel id.
 * This map bridges that naming difference so `tpl[TEMPLATE_FIELD[channel]]`
 * always resolves to a real string — accessing `tpl["in_app"]` directly
 * would be `undefined` and crash `render()`.
 */
const TEMPLATE_FIELD: Record<NotificationChannel, keyof NotificationTemplate> = {
  in_app: "inApp",
  email: "email",
  sms: "sms",
  push: "push",
};

interface Recipient {
  name?: string;
  email?: string;
  phone?: string;
}

interface DispatchOptions {
  event: NotificationEvent;
  to: Recipient;
  data?: Record<string, string | number | undefined>;
  /** Force channels (skips user prefs) */
  channels?: NotificationChannel[];
  /** Suppress UI toasts (useful for batch backend events) */
  silent?: boolean;
}

/** Mock email/SMS/push sender — replace with real provider later. */
function mockSend(channel: NotificationChannel, to: string, subject: string, body: string) {
  // Real integration goes here (Lovable Emails, SMS gateway, Web Push…).
  // For demo we just log and persist.
  // eslint-disable-next-line no-console
  console.info(`[Dadar Notify][${channel}] → ${to}\n${subject}\n${body}`);
}

function maybeWebPush(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
      return true;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Dispatch a notification across all channels the user has enabled
 * for this event.
 */
export function notify(opts: DispatchOptions): {
  delivered: NotificationChannel[];
  skipped: NotificationChannel[];
} {
  const { event, to, data = {}, silent = false } = opts;
  const tpl = NOTIFICATION_TEMPLATES.find((t) => t.event === event);
  if (!tpl) return { delivered: [], skipped: NOTIFICATION_CHANNELS };

  const prefs = getPrefs();
  const enabled =
    opts.channels ??
    NOTIFICATION_CHANNELS.filter((c) => prefs[event]?.[c] !== false);

  const fullData = { name: to.name ?? "Customer", ...data };
  const subject = render(tpl.subject, fullData);

  const delivered: NotificationChannel[] = [];
  const skipped: NotificationChannel[] = [];

  for (const channel of NOTIFICATION_CHANNELS) {
    if (!enabled.includes(channel)) {
      skipped.push(channel);
      continue;
    }
    const body = render(tpl[TEMPLATE_FIELD[channel]], fullData);

    if (channel === "in_app") {
      const feed = getFeed();
      const entry: AppNotification = {
        id: "n_" + Math.random().toString(36).slice(2, 10),
        title: subject,
        body,
        at: new Date().toISOString(),
        kind:
          event.startsWith("payment")
            ? "payment"
            : event === "refund_approved"
              ? "refund"
              : event === "coupon_available"
                ? "promo"
                : "order",
        event,
        channels: [channel],
        unread: true,
      };
      setFeed([entry, ...feed].slice(0, 100));
    } else if (channel === "push") {
      maybeWebPush(subject, body);
    } else {
      mockSend(channel, channel === "email" ? to.email ?? "" : to.phone ?? "", subject, body);
    }

    pushLog({
      id: "lg_" + Math.random().toString(36).slice(2, 10),
      at: new Date().toISOString(),
      event,
      channel,
      to: channel === "email" ? to.email ?? "" : channel === "sms" ? to.phone ?? "" : to.name ?? "",
      subject,
      body,
    });
    delivered.push(channel);
  }

  if (!silent && delivered.length > 0) {
    toast.success(subject, {
      description:
        delivered.map((c) => NOTIFICATION_CHANNEL_LABEL[c]).join(" · "),
    });
  }

  return { delivered, skipped };
}
