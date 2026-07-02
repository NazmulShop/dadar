import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onFilter?: () => void;
  onOpen?: () => void;
}

export function SearchBar({
  placeholder = "What do you want to buy today?",
  className,
  onFilter,
  onOpen,
}: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onOpen}
        className="glass-strong tap-scale tap-scale-active flex h-12 flex-1 items-center gap-3 rounded-pill px-4 text-left shadow-card"
      >
        <Search className="size-4 text-muted-foreground" strokeWidth={2.25} />
        <span className="flex-1 truncate text-[15px] text-muted-foreground/80">
          {placeholder}
        </span>
      </button>
      <button
        onClick={onFilter ?? onOpen}
        type="button"
        className="glass-strong tap-scale tap-scale-active flex size-12 items-center justify-center rounded-pill shadow-card"
        aria-label="Filter"
      >
        <SlidersHorizontal className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
