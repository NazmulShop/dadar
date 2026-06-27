import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

/** Origin point (in viewport px) the circular reveal animation grows from. */
interface ToggleOrigin {
  x: number;
  y: number;
}

interface ThemeApi {
  theme: Theme;
  /** Pass the click/tap coordinates so the reveal animates from that point —
   *  e.g. `toggle({ x: e.clientX, y: e.clientY })` from a button's onClick.
   *  Omit it (or call with no args) to animate from the viewport center. */
  toggle: (origin?: ToggleOrigin) => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);
const LS_KEY = "dadar.theme.v1";

// Keeps the iOS/Android status-bar + home-indicator color (set in
// index.html's inline script for first paint) in sync on every later
// toggle too, so neither end of the screen ever reverts to white.
const THEME_COLOR_LIGHT = "#fcfaf4";
const THEME_COLOR_DARK = "#05100c";

function syncThemeColorMeta(theme: Theme) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
}

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v === "dark" || v === "light") return v;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    // ignore
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(readInitial());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    syncThemeColorMeta(theme);
    // index.html sets an inline background-color as a zero-flash placeholder
    // before the stylesheet loads. Inline styles beat stylesheet rules
    // regardless of specificity, so it has to be cleared explicitly here —
    // otherwise the real --gradient-cream background in styles.css would
    // never be visible again.
    root.style.removeProperty("background-color");
    try {
      window.localStorage.setItem(LS_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const applyTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      // Direct sets (e.g. a settings page radio group) get the same smooth
      // circular reveal, originating from the center of the screen since
      // there's no button coordinate to anchor it to.
      runThemeTransition(applyTheme, t, null);
    },
    [applyTheme],
  );

  const toggle = useCallback(
    (origin?: ToggleOrigin) => {
      setThemeState((current) => {
        const next: Theme = current === "dark" ? "light" : "dark";
        runThemeTransition(applyTheme, next, origin ?? null, current);
        // The actual state update happens inside runThemeTransition (so it
        // can be sequenced with the view-transition snapshot); returning
        // `current` here avoids a duplicate, unanimated update.
        return current;
      });
    },
    [applyTheme],
  );

  const value = useMemo<ThemeApi>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Runs the actual theme change wrapped in document.startViewTransition when
 * the browser supports it, so the swap renders as a circle growing from
 * `origin` (the toggle button's position) instead of an instant snap.
 * Falls back to a plain state update — still smoothed by the CSS
 * background-color/color transitions in styles.css — everywhere else.
 */
function runThemeTransition(
  apply: (t: Theme) => void,
  next: Theme,
  origin: ToggleOrigin | null,
  previous?: Theme,
) {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  const supportsViewTransitions =
    root && typeof (document as any).startViewTransition === "function";
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!root || !supportsViewTransitions || prefersReducedMotion) {
    apply(next);
    return;
  }

  const { innerWidth, innerHeight } = window;
  const x = origin?.x ?? innerWidth / 2;
  const y = origin?.y ?? innerHeight / 2;
  root.style.setProperty("--theme-toggle-x", `${x}px`);
  root.style.setProperty("--theme-toggle-y", `${y}px`);
  // Going dark -> light needs the *old* frame to clip away (see the
  // matching ::view-transition-old(root) rule in styles.css) so the light
  // frame doesn't appear to flood in from every edge at once.
  root.classList.toggle("theme-to-light", previous === "dark" && next === "light");
  root.classList.add("theme-transitioning");

  const transition = (document as any).startViewTransition(() => {
    flushSync(() => apply(next));
  });

  Promise.resolve(transition?.finished).finally(() => {
    root.classList.remove("theme-transitioning", "theme-to-light");
  });
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback for SSR / outside provider
    return { theme: "light", toggle: () => {}, setTheme: () => {} };
  }
  return ctx;
}
