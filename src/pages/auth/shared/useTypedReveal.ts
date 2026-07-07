import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

// Reveals `text` character-by-character while `active` is true — the
// terminal-style typed loading string in the primary button. Resets when
// deactivated. Reveals instantly under prefers-reduced-motion.
export function useTypedReveal(text: string, active: boolean, speedMs = 16): string {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!active) {
      setShown("");
      return;
    }
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, active, speedMs, reduced]);

  return shown;
}
