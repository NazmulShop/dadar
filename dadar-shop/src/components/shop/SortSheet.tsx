import { X, Check } from "lucide-react";
import { SORT_OPTIONS, type SortId } from "@/data/products";
import { cn } from "@/lib/utils";

interface SortSheetProps {
  open: boolean;
  value: SortId;
  onClose: () => void;
  onChange: (id: SortId) => void;
}

export function SortSheet({ open, value, onClose, onChange }: SortSheetProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <div onClick={onClose} className="bg-foreground/40 absolute inset-0 backdrop-blur-sm" />
      <div
        className={cn(
          "bg-background absolute inset-x-0 bottom-0 rounded-t-[2rem] shadow-float transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-display text-lg font-semibold">Sort by</h3>
          <button
            onClick={onClose}
            className="bg-muted tap-scale tap-scale-active flex size-9 items-center justify-center rounded-pill"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          {SORT_OPTIONS.map((opt) => {
            const active = opt.id === value;
            return (
              <li key={opt.id}>
                <button
                  onClick={() => {
                    onChange(opt.id);
                    onClose();
                  }}
                  className="tap-scale tap-scale-active flex w-full items-center justify-between rounded-2xl px-3 py-3.5 text-left text-[15px] hover:bg-muted"
                >
                  <span className={active ? "font-semibold text-primary" : "text-foreground"}>
                    {opt.label}
                  </span>
                  {active && (
                    <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
