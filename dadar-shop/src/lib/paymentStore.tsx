import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

/* ------------------------------- Types ---------------------------------- */

export type PaymentMethodId = "bkash" | "nagad" | "rocket" | "upay" | "visa" | "cod";

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  note: string;
  /** Bangla number prefix shown in payment instructions */
  number?: string;
  comingSoon?: boolean;
  /** brand color used in chips */
  color: string;
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { id: "bkash", label: "bKash", note: "Send money to 01XXXXXXXXX", number: "01711-000000", color: "#E2136E" },
  { id: "nagad", label: "Nagad", note: "Send money to 01XXXXXXXXX", number: "01711-000001", color: "#EB6E1F" },
  { id: "rocket", label: "Rocket", note: "DBBL Rocket transfer", number: "017110000002", color: "#8C2D8D" },
  { id: "upay", label: "Upay", note: "Send money via Upay", number: "01711-000003", color: "#E60000" },
  { id: "visa", label: "Visa / Mastercard", note: "Card payments — Coming soon", color: "#1A1F71", comingSoon: true },
  { id: "cod", label: "Cash on Delivery", note: "Pay when your order arrives", color: "#0F766E" },
];

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refund_requested"
  | "refunded"
  | "cancelled";

export interface PaymentLog {
  at: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

export interface RefundRecord {
  id: string;
  requestedAt: string;
  amount: number;
  reason: string;
  status: "requested" | "approved" | "rejected" | "completed";
  resolvedAt?: string;
  note?: string;
}

export interface Transaction {
  id: string;            // TXN-XXXX
  orderId: string;       // linked order id from checkout
  createdAt: string;
  updatedAt: string;
  method: PaymentMethodId;
  methodLabel: string;
  amount: number;
  currency: "BDT";
  status: PaymentStatus;
  customerName: string;
  customerPhone: string;
  trxRef?: string;       // user-supplied wallet TrxID
  note?: string;
  logs: PaymentLog[];
  refunds: RefundRecord[];
}

/* ----------------------------- State / store ---------------------------- */

interface PaymentState {
  transactions: Transaction[];
}

const initial: PaymentState = { transactions: [] };

type Action =
  | { type: "hydrate"; state: PaymentState }
  | { type: "create"; tx: Transaction }
  | { type: "updateStatus"; id: string; status: PaymentStatus; message?: string }
  | { type: "addLog"; id: string; log: PaymentLog }
  | { type: "requestRefund"; id: string; refund: RefundRecord }
  | { type: "resolveRefund"; id: string; refundId: string; status: RefundRecord["status"]; note?: string }
  | { type: "clearAll" };

function nowISO() {
  return new Date().toISOString();
}

function withLog(tx: Transaction, log: PaymentLog): Transaction {
  return { ...tx, logs: [log, ...tx.logs].slice(0, 50), updatedAt: log.at };
}

function reducer(state: PaymentState, action: Action): PaymentState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "create":
      return { transactions: [action.tx, ...state.transactions] };
    case "updateStatus":
      return {
        transactions: state.transactions.map((t) => {
          if (t.id !== action.id) return t;
          const log: PaymentLog = {
            at: nowISO(),
            level:
              action.status === "paid"
                ? "success"
                : action.status === "failed"
                  ? "error"
                  : action.status === "refunded" || action.status === "cancelled"
                    ? "warn"
                    : "info",
            message: action.message ?? `Status changed to ${action.status}`,
          };
          return withLog({ ...t, status: action.status }, log);
        }),
      };
    case "addLog":
      return {
        transactions: state.transactions.map((t) =>
          t.id === action.id ? withLog(t, action.log) : t,
        ),
      };
    case "requestRefund":
      return {
        transactions: state.transactions.map((t) => {
          if (t.id !== action.id) return t;
          const updated: Transaction = {
            ...t,
            status: "refund_requested",
            refunds: [action.refund, ...t.refunds],
          };
          return withLog(updated, {
            at: action.refund.requestedAt,
            level: "info",
            message: `Refund requested · ৳${action.refund.amount.toLocaleString()} · ${action.refund.reason}`,
          });
        }),
      };
    case "resolveRefund":
      return {
        transactions: state.transactions.map((t) => {
          if (t.id !== action.id) return t;
          const refunds = t.refunds.map((r) =>
            r.id === action.refundId
              ? { ...r, status: action.status, resolvedAt: nowISO(), note: action.note }
              : r,
          );
          const newStatus: PaymentStatus =
            action.status === "completed"
              ? "refunded"
              : action.status === "rejected"
                ? "paid"
                : t.status;
          return withLog(
            { ...t, refunds, status: newStatus },
            {
              at: nowISO(),
              level: action.status === "rejected" ? "warn" : "success",
              message: `Refund ${action.status}${action.note ? ` · ${action.note}` : ""}`,
            },
          );
        }),
      };
    case "clearAll":
      return { transactions: [] };
    default:
      return state;
  }
}

const KEY = "dadar.payments.v1";

const PaymentContext = createContext<{
  state: PaymentState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) dispatch({ type: "hydrate", state: JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  return <PaymentContext.Provider value={{ state, dispatch }}>{children}</PaymentContext.Provider>;
}

export function usePayments() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayments must be used within PaymentProvider");
  return ctx;
}

export interface CreateTxInput {
  orderId: string;
  method: PaymentMethodId;
  amount: number;
  customerName: string;
  customerPhone: string;
  trxRef?: string;
  note?: string;
}

export function usePaymentActions() {
  const { dispatch } = usePayments();
  return useMemo(
    () => ({
      createTransaction: (input: CreateTxInput): Transaction | null => {
        const meta = PAYMENT_METHODS.find((m) => m.id === input.method);
        if (!meta) {
          console.error(`Unknown payment method: ${input.method}`);
          return null;
        }
        const initialStatus: PaymentStatus =
          input.method === "cod"
            ? "pending"
            : input.method === "visa"
              ? "failed" // coming soon — record as failed attempt
              : "processing";
        const tx: Transaction = {
          id: `TXN-${Date.now().toString(36).toUpperCase()}`,
          orderId: input.orderId,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          method: input.method,
          methodLabel: meta.label,
          amount: input.amount,
          currency: "BDT",
          status: initialStatus,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          trxRef: input.trxRef,
          note: input.note,
          logs: [
            {
              at: nowISO(),
              level: "info",
              message: `Transaction created via ${meta.label}`,
            },
            ...(input.trxRef
              ? [{ at: nowISO(), level: "info" as const, message: `TrxID submitted: ${input.trxRef}` }]
              : []),
            ...(input.method === "visa"
              ? [{ at: nowISO(), level: "error" as const, message: "Visa gateway not yet available" }]
              : []),
          ],
          refunds: [],
        };
        dispatch({ type: "create", tx });
        return tx;
      },
      updateStatus: (id: string, status: PaymentStatus, message?: string) =>
        dispatch({ type: "updateStatus", id, status, message }),
      addLog: (id: string, log: Omit<PaymentLog, "at"> & { at?: string }) =>
        dispatch({ type: "addLog", id, log: { at: log.at ?? nowISO(), ...log } }),
      requestRefund: (id: string, amount: number, reason: string) =>
        dispatch({
          type: "requestRefund",
          id,
          refund: {
            id: `RF-${Date.now().toString(36).toUpperCase()}`,
            requestedAt: nowISO(),
            amount,
            reason,
            status: "requested",
          },
        }),
      resolveRefund: (
        id: string,
        refundId: string,
        status: RefundRecord["status"],
        note?: string,
      ) => dispatch({ type: "resolveRefund", id, refundId, status, note }),
      clearAll: () => dispatch({ type: "clearAll" }),
    }),
    [dispatch],
  );
}

export const STATUS_TONE: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-800" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Failed", cls: "bg-rose-100 text-rose-800" },
  refund_requested: { label: "Refund requested", cls: "bg-violet-100 text-violet-800" },
  refunded: { label: "Refunded", cls: "bg-slate-200 text-slate-800" },
  cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-700" },
};

export const _keepCallback = useCallback;
