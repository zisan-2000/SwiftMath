/**
 * Premium full-viewport SVG background scene for SEFT Abacus.
 *
 * One composed artwork (not scattered tiny icons): abacus frame, math operators,
 * sigma brand mark, orbit rings, and equation watermarks. Uses CSS variables so
 * light/dark themes stay in sync. Rendered above the aurora, below the grid.
 */
export function MeshSvgScene() {
  return (
    <svg
      aria-hidden
      className="mesh-svg-scene absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="mesh-brand-stroke"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" className="mesh-grad-a" />
          <stop offset="55%" className="mesh-grad-b" />
          <stop offset="100%" className="mesh-grad-c" />
        </linearGradient>

        <linearGradient id="mesh-brand-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className="mesh-fill-a" />
          <stop offset="100%" className="mesh-fill-b" />
        </linearGradient>

        <radialGradient id="mesh-bead-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" className="mesh-bead-core" />
          <stop offset="100%" className="mesh-bead-edge" />
        </radialGradient>

        <filter
          id="mesh-soft-glow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter
          id="mesh-bloom"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="14" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ---- Orbit rings (depth, centre-back) ---- */}
      <g className="mesh-float-b" opacity="0.9">
        <circle
          cx="720"
          cy="380"
          r="300"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="1.2"
          className="mesh-ring"
        />
        <circle
          cx="720"
          cy="380"
          r="220"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="1"
          className="mesh-ring-soft"
        />
        <circle
          cx="720"
          cy="380"
          r="140"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="0.8"
          className="mesh-ring-soft"
        />
        <path
          d="M720 80 A300 300 0 0 1 1020 380"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="mesh-ring-accent"
        />
        <path
          d="M420 380 A300 300 0 0 1 720 680"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="mesh-ring-accent"
        />
      </g>

      {/* ---- Large plus (top-left) ---- */}
      <g className="mesh-float-a" filter="url(#mesh-soft-glow)">
        <rect
          x="68"
          y="68"
          width="148"
          height="148"
          rx="28"
          className="mesh-glass-plate"
        />
        <path
          d="M142 108v68M108 142h68"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </g>

      {/* ---- Multiply (top-right) ---- */}
      <g className="mesh-float-c" filter="url(#mesh-soft-glow)">
        <rect
          x="1224"
          y="88"
          width="128"
          height="128"
          rx="24"
          className="mesh-glass-plate"
        />
        <path
          d="M1262 126l52 52M1314 126l-52 52"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>

      {/* ---- Abacus (left-centre) — the hero illustration ---- */}
      <g className="mesh-float-b" filter="url(#mesh-bloom)">
        <rect
          x="52"
          y="340"
          width="248"
          height="196"
          rx="20"
          className="mesh-abacus-frame"
        />
        <rect
          x="68"
          y="356"
          width="216"
          height="164"
          rx="14"
          className="mesh-abacus-inner"
        />

        {/* Rods */}
        {[0, 1, 2, 3].map((row) => (
          <line
            key={`rod-${row}`}
            x1="82"
            y1={392 + row * 36}
            x2="270"
            y2={392 + row * 36}
            className="mesh-rod"
            strokeWidth="2"
          />
        ))}

        {/* Beads — 4 rows × varied counts (abacus feel) */}
        {[
          [98, 128, 158, 188, 218, 248],
          [98, 138, 178, 218, 248],
          [98, 128, 168, 208, 238, 248],
          [108, 148, 188, 228],
        ].map((xs, row) =>
          xs.map((x) => (
            <circle
              key={`bead-${row}-${x}`}
              cx={x}
              cy={392 + row * 36}
              r="9"
              fill="url(#mesh-bead-glow)"
              className="mesh-bead"
            />
          )),
        )}
      </g>

      {/* ---- Divide (bottom-left) ---- */}
      <g className="mesh-float-a" filter="url(#mesh-soft-glow)">
        <rect
          x="88"
          y="668"
          width="120"
          height="120"
          rx="22"
          className="mesh-glass-plate"
        />
        <circle cx="148" cy="702" r="7" fill="url(#mesh-brand-fill)" />
        <path
          d="M108 728h80"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="148" cy="754" r="7" fill="url(#mesh-brand-fill)" />
      </g>

      {/* ---- Sigma / brand (bottom-right) ---- */}
      <g className="mesh-float-c" filter="url(#mesh-soft-glow)">
        <rect
          x="1210"
          y="620"
          width="150"
          height="150"
          rx="28"
          className="mesh-glass-plate"
        />
        <path
          d="M1334 652H1268l34 44-34 44h66"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ---- Equals + minus cluster (right) ---- */}
      <g className="mesh-float-b" filter="url(#mesh-soft-glow)">
        <rect
          x="1180"
          y="360"
          width="110"
          height="110"
          rx="20"
          className="mesh-glass-plate"
        />
        <path
          d="M1208 400h84M1208 430h84"
          stroke="url(#mesh-brand-stroke)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>

      {/* ---- Equation watermark (centre-top, behind content) ---- */}
      <g className="mesh-float-a mesh-equation" opacity="0.85">
        <text
          x="720"
          y="168"
          textAnchor="middle"
          className="mesh-equation-text"
        >
          12 + 7 = 19
        </text>
      </g>

      {/* ---- Large number accents ---- */}
      <text x="1080" y="560" className="mesh-num-accent mesh-float-c">
        9
      </text>
      <text x="320" y="248" className="mesh-num-accent mesh-num-sm mesh-float-a">
        3
      </text>

      {/* ---- Spark nodes (calculation graph) ---- */}
      <g className="mesh-spark-lines">
        <circle cx="520" cy="280" r="4" className="mesh-spark-dot" />
        <circle cx="640" cy="220" r="3" className="mesh-spark-dot" />
        <circle cx="900" cy="260" r="4" className="mesh-spark-dot" />
        <circle cx="1020" cy="340" r="3" className="mesh-spark-dot" />
        <path
          d="M520 280 L640 220 L900 260 L1020 340"
          className="mesh-spark-path"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
