"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/** Reserve layout during SSR; mount Recharts only with real, positive sizes. */
export function MeasuredChart({ children, label }: { children: ReactElement; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    function measure() {
      const { width, height } = element!.getBoundingClientRect();
      const next = width > 0 && height > 0
        ? { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
        : null;
      setSize((previous) => previous?.width === next?.width && previous?.height === next?.height
        ? previous : next);
    }
    // Measure in the observer callback as well as on mount: hidden tabs/cards
    // must stop rendering and recover when they become visible again.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={ref} className="h-64 w-full min-w-0" role="img" aria-label={label}>
      {size && (
        <ResponsiveContainer width={size.width} height={size.height}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}
