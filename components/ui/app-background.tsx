import { cn } from "@/lib/utils";
import { MeshSvgScene } from "@/components/ui/mesh-svg-scene";

/**
 * Full-viewport ambient background for the whole product.
 *
 * "Cognitive Aurora Mesh" — indigo brand glow + faint math grid (precision /
 * mental math) + soft violet accent + floating SVG math glyphs. Mounted once in
 * the root layout.
 */
export function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
    >
      <div className="absolute inset-0 bg-mesh-base" />

      <div className="absolute -top-[18%] left-1/2 aspect-square w-[min(75vw,44rem)] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />

      <div className="absolute -bottom-[10%] -right-[12%] aspect-square w-[min(55vw,28rem)] rounded-full bg-chart-4/15 blur-3xl dark:bg-chart-4/20" />

      <div className="absolute -bottom-[6%] -left-[8%] aspect-square w-[min(45vw,22rem)] rounded-full bg-chart-2/10 blur-3xl dark:bg-chart-2/12" />

      <MeshSvgScene />

      <div className="absolute inset-0 bg-mesh-grid opacity-100" />

      <div className="absolute inset-0 bg-mesh-vignette" />
    </div>
  );
}

/**
 * Extra brand glow for marketing / first-impression pages (landing). Stacks on
 * top of {@link AppBackground} without duplicating the grid.
 */
export function HeroAccent({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -top-[24%] left-1/2 aspect-square w-[min(92vw,50rem)] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl dark:bg-primary/30" />
      <div className="absolute top-[35%] right-[-15%] aspect-square w-[min(50vw,24rem)] rounded-full bg-chart-4/20 blur-3xl dark:bg-chart-4/25" />
    </div>
  );
}
