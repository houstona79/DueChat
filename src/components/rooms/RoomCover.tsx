/**
 * Deterministic generated room artwork: every room name maps to its own
 * colour pair, geometric pattern and glyph, so each thumbnail looks distinct
 * without needing an uploaded image.
 */

function hash(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PATTERNS = ["rings", "bars", "waves", "grid", "burst", "bubbles"] as const;

function glyph(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]).join("");
  return (letters || name.slice(0, 2) || "?").toUpperCase();
}

export function RoomCover({
  name,
  url,
  className = "h-28 w-full rounded-t-3xl",
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  if (url) {
    return (
      <span className={`relative block overflow-hidden ${className}`}>
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      </span>
    );
  }

  const h = hash(name || "room");
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  const pattern = PATTERNS[h % PATTERNS.length];
  const a = `hsl(${hue} 70% 42%)`;
  const b = `hsl(${hue2} 72% 24%)`;
  const light = `hsl(${hue} 90% 78%)`;
  const rot = h % 90;

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${name} room artwork`}
        className="size-full"
      >
        <defs>
          <linearGradient id={`g${h}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
          <linearGradient id={`gloss${h}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill={`url(#g${h})`} />
        <g opacity="0.35" fill="none" stroke={light} strokeWidth="2">
          {pattern === "rings" &&
            [18, 34, 50, 66, 82].map((r) => <circle key={r} cx="252" cy="30" r={r} />)}
          {pattern === "bars" && (
            <g transform={`rotate(${rot} 160 60)`}>
              {[-60, -20, 20, 60, 100, 140, 180, 220, 260].map((x) => (
                <line key={x} x1={x} y1="-40" x2={x + 40} y2="180" strokeWidth="10" />
              ))}
            </g>
          )}
          {pattern === "waves" &&
            [10, 34, 58, 82, 106].map((y) => (
              <path key={y} d={`M-10 ${y} q40 -22 80 0 t80 0 t80 0 t80 0`} />
            ))}
          {pattern === "grid" && (
            <g>
              {[0, 40, 80, 120, 160, 200, 240, 280].map((x) => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" />
              ))}
              {[0, 30, 60, 90].map((y) => (
                <line key={`h${y}`} x1="0" y1={y} x2="320" y2={y} />
              ))}
            </g>
          )}
          {pattern === "burst" &&
            Array.from({ length: 12 }, (_, i) => i * 30 + rot).map((deg) => (
              <line
                key={deg}
                x1="160"
                y1="60"
                x2={160 + 220 * Math.cos((deg * Math.PI) / 180)}
                y2={60 + 220 * Math.sin((deg * Math.PI) / 180)}
                strokeWidth="6"
              />
            ))}
          {pattern === "bubbles" &&
            [
              [40, 90, 26],
              [110, 26, 18],
              [200, 88, 32],
              [270, 34, 22],
              [300, 100, 14],
            ].map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
        </g>
        <rect width="320" height="120" fill={`url(#gloss${h})`} />
        <text
          x="160"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fillOpacity="0.95"
          fontSize="46"
          fontWeight="700"
          fontFamily="Tahoma, Verdana, system-ui, sans-serif"
          letterSpacing="2"
          style={{ paintOrder: "stroke" }}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="4"
        >
          {glyph(name)}
        </text>
      </svg>
    </span>
  );
}
