import { useEffect, useRef, useCallback, useState } from "react";

export type WSEvent =
  | { type: "order_update"; orderId: string; status: string; customerName: string; total: number; at: string }
  | { type: "review_pending"; reviewId: string; productName: string; authorName: string; rating: number; at: string }
  | { type: "system_alert"; severity: "warning" | "critical"; code: string; message: string; solution: string; at: string }
  | { type: "system_ok"; at: string }
  | { type: "ping"; at: string };

export interface SystemAlert {
  severity: "warning" | "critical";
  code: string;
  message: string;
  solution: string;
  at: string;
}

export interface Notification {
  id: string;
  type: "order" | "review";
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export function useAdminWS() {
  const [systemAlert, setSystemAlert] = useState<SystemAlert | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Resolve API origin: prefer VITE_API_URL (cross-origin deploy);
    // fall back to current host (Vite dev proxy / same-origin).
    const apiOrigin = (
      ((import.meta as any).env?.VITE_API_URL as string | undefined) ?? ""
    ).replace(/\/$/, "");

    let base: string;
    if (apiOrigin) {
      base = apiOrigin.replace(/^http/, "ws");
    } else {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      base = `${proto}//${window.location.host}`;
    }

    // Pass bearer token via ?token= (browsers can't set headers on `new WebSocket()`).
    // Token lives inside the dadar.auth.session.v2 JSON payload.
    let token = "";
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("dadar.auth.session.v2");
        if (raw) token = (JSON.parse(raw) as { token?: string }).token ?? "";
      } catch {
        /* ignore */
      }
    }
    const url = `${base}/api/admin/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        reconnectAttempt.current = 0;
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (ev) => {
        if (!mountedRef.current) return;
        try {
          const event: WSEvent = JSON.parse(ev.data as string);
          handleEvent(event);
        } catch {
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        const attempt = reconnectAttempt.current++;
        const delay = Math.min(30_000, 1_000 * 2 ** attempt);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
    }
  }, []);

  function handleEvent(event: WSEvent) {
    if (event.type === "system_alert") {
      setSystemAlert({ severity: event.severity, code: event.code, message: event.message, solution: event.solution, at: event.at });
    } else if (event.type === "system_ok") {
      setSystemAlert(null);
    } else if (event.type === "order_update") {
      setNotifications((prev) => [
        {
          id: `${event.orderId}-${event.at}`,
          type: "order",
          title: `Order ${event.orderId} → ${event.status}`,
          body: `${event.customerName} · ৳${event.total.toLocaleString()}`,
          at: event.at,
          read: false,
        },
        ...prev.slice(0, 49),
      ]);
    } else if (event.type === "review_pending") {
      setNotifications((prev) => [
        {
          id: `${event.reviewId}-${event.at}`,
          type: "review",
          title: `New review pending`,
          body: `${event.authorName} · ${event.productName} · ${"★".repeat(event.rating)}`,
          at: event.at,
          read: false,
        },
        ...prev.slice(0, 49),
      ]);
    }
  }

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissAlert = useCallback(() => {
    setSystemAlert(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { systemAlert, notifications, connected, markAllRead, dismissAlert };
}
