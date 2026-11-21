import type { CategoryKey } from "@/lib/categories";
import { CATEGORY_META } from "@/lib/categories";
import type { Tone } from "@/lib/score";

const ORDER: CategoryKey[] = ["citability", "brand", "content", "technical", "schema", "answer"];
const COLORS: Record<Tone | "pending", string> = {
  ok: "var(--ok)",
  mid: "var(--mid)",
  warn: "var(--warn)",
  fail: "var(--fail)",
  pending: "var(--line)",
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
  segments: Partial<Record<CategoryKey, Tone>>;
  host: string;
}) {
  const r = 86;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = ORDER.map((k) => {
    const len = (CATEGORY_META[k].weight / 100) * c;
    const arc = { k, len: Math.max(len - 10, 1), offset: offset + 5 };
    offset += len;
    return arc;
  });
  const label = `Note ${note ?? "ausstehend"}, ${score ?? "–"} von 100 Punkten`;
  return (
    <svg className="seal" viewBox="0 0 220 220" role="img" aria-label={label}>
      <defs>
        <path id="sealText" d="M 110,110 m -100,0 a 100,100 0 1,1 200,0 a 100,100 0 1,1 -200,0" />
        <radialGradient id="sealFace" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef3f8" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="110" r="109" fill="var(--ink)" />
      <text className="seal-ring-text">
        <textPath href="#sealText" textLength={Math.round(2 * Math.PI * 100) - 6} lengthAdjust="spacing">
          {`KI-SICHTBARKEIT · GEPRÜFT · ${host.toUpperCase()} · `}
        </textPath>
      </text>
      <circle cx="110" cy="110" r="93" fill="var(--surface)" />
      <g transform="rotate(-90 110 110)">
        {arcs.map((a) => (
          <circle
            key={a.k}
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={COLORS[segments[a.k] ?? "pending"]}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${a.len} ${c - a.len}`}
            strokeDashoffset={-a.offset}
          />
        ))}
      </g>
      <circle cx="110" cy="110" r="72" fill="url(#sealFace)" stroke="var(--line)" strokeWidth="1" />
      <text x="110" y="90" textAnchor="middle" className="seal-small">
        Note
      </text>
      <text x="110" y="145" textAnchor="middle" className="seal-note">
        {note ?? "–"}
      </text>
      <text x="110" y="166" textAnchor="middle" className="seal-small">
        {score ?? "–"} / 100
      </text>
    </svg>
  );
}
