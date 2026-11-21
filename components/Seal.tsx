import type { CategoryKey, Status } from "@/lib/categories";
import { CATEGORY_META } from "@/lib/categories";

const ORDER: CategoryKey[] = ["citability", "brand", "content", "technical", "schema", "answer"];
const COLORS: Record<Status | "pending", string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  fail: "var(--fail)",
  pending: "var(--rule)",
};

// Round inspection seal: the six ring segments are the six test categories,
// sized by their weight and coloured by their result. The grade sits in the middle.
export default function Seal({
  note,
  score,
  segments,
  host,
}: {
  note: number | null;
  score: number | null;
  segments: Partial<Record<CategoryKey, Status>>;
  host: string;
}) {
  const r = 86;
  const c = 2 * Math.PI * r;
  const gap = 3;
  let offset = 0;
  const arcs = ORDER.map((k) => {
    const len = (CATEGORY_META[k].weight / 100) * c;
    const arc = { k, len: len - gap, offset };
    offset += len;
    return arc;
  });
  const label = `Note ${note ?? "ausstehend"}, ${score ?? "–"} von 100 Punkten`;
  return (
    <svg className="seal" viewBox="0 0 220 220" role="img" aria-label={label}>
      <defs>
        <path id="sealText" d="M 110,110 m -99,0 a 99,99 0 1,1 198,0 a 99,99 0 1,1 -198,0" />
      </defs>
      <circle cx="110" cy="110" r="108" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="1.5" />
      <text className="seal-ring-text">
        <textPath href="#sealText" startOffset="0" textLength={Math.round(2 * Math.PI * 99) - 4} lengthAdjust="spacing">
          {`KI-SICHTBARKEIT · GEPRÜFT · ${host.toUpperCase()} · `}
        </textPath>
      </text>
      <g transform="rotate(-90 110 110)">
        {arcs.map((a) => (
          <circle
            key={a.k}
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={COLORS[segments[a.k] ?? "pending"]}
            strokeWidth="14"
            strokeDasharray={`${a.len} ${c - a.len}`}
            strokeDashoffset={-a.offset}
          />
        ))}
      </g>
      <circle cx="110" cy="110" r="74" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
      <text x="110" y="92" textAnchor="middle" className="seal-small">
        Note
      </text>
      <text x="110" y="146" textAnchor="middle" className="seal-note">
        {note ?? "–"}
      </text>
      <text x="110" y="168" textAnchor="middle" className="seal-small">
        {score ?? "–"} / 100
      </text>
    </svg>
  );
}
