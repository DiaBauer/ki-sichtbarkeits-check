import { Bot, CheckCircle2, XCircle } from "lucide-react";

// Static preview of a report: shows visitors what they will get.
const BARS = [
  { label: "KI-Zitierfähigkeit", v: 74, tone: "ok" },
  { label: "Markenautorität", v: 38, tone: "fail" },
  { label: "Inhalt & Vertrauen", v: 61, tone: "mid" },
  { label: "Strukturierte Daten", v: 46, tone: "warn" },
];
const CRAWLERS: [string, boolean][] = [
  ["GPTBot", true],
  ["ClaudeBot", true],
  ["PerplexityBot", false],
  ["Google-Extended", true],
];

export default function HeroVisual() {
  return (
    <div className="hv" aria-hidden="true">
      <div className="hv-glow" />
      <div className="hv-card">
        <div className="hv-head">
          <div className="hv-dot-row">
            <span />
            <span />
            <span />
          </div>
          <span className="hv-url">prüfbericht · ihre-firma.de</span>
        </div>
        <div className="hv-top">
          <svg viewBox="0 0 120 120" className="hv-seal">
            <circle cx="60" cy="60" r="58" fill="#18202f" />
            <circle cx="60" cy="60" r="49" fill="#ffffff" />
            {[
              ["#16a673", 0, 70],
              ["#e5484d", 75, 50],
              ["#e0b419", 130, 55],
              ["#f07d2e", 190, 40],
              ["#16a673", 235, 60],
              ["#e0b419", 300, 52],
            ].map(([c, start, len], i) => (
              <circle
                key={i}
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke={c as string}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(((len as number) - 8) / 360) * 276.5} 276.5`}
                strokeDashoffset={-(((start as number) + 4) / 360) * 276.5}
                transform="rotate(-90 60 60)"
              />
            ))}
            <text x="60" y="54" textAnchor="middle" className="hv-seal-s">
              Note
            </text>
            <text x="60" y="82" textAnchor="middle" className="hv-seal-n">
              3
            </text>
          </svg>
          <div>
            <p className="hv-title">Note 3: befriedigend</p>
            <p className="hv-sub">63 von 100 Punkten</p>
          </div>
        </div>
        <ul className="hv-bars">
          {BARS.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span>
              <div className={`bar ${b.tone}`}>
                <span style={{ width: `${b.v}%` }} />
              </div>
              <b>{b.v}</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="hv-chip">
        <p className="hv-chip-title">
          <Bot size={15} /> KI-Crawler
        </p>
        <ul>
          {CRAWLERS.map(([n, ok]) => (
            <li key={n} className={ok ? "ok" : "fail"}>
              {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
