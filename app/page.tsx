import { headers } from "next/headers";
import { brandFor } from "@/lib/brand";
import Checker from "@/components/Checker";
import { NextSteps, Newsletter, Weitermachen } from "@/components/Sections";

// brandFor() honours ?brand= only via the herkunft whitelist (lib/herkunft.ts), and only on hosts that are not one of the brand domains (test domains).
export default async function Page({ searchParams }: { searchParams: Promise<{ brand?: string; url?: string }> }) {
  const sp = await searchParams;
  const brand = brandFor((await headers()).get("host"), sp.brand);
  return (
    <div style={{ ["--accent" as string]: brand.accent, ["--accent-ink" as string]: brand.accentInk }}>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="wordmark" href={brand.kontaktUrl.replace(/#.*/, "")}>
            {brand.name}
          </a>
          <nav className="topnav">
            <a href="#weitermachen">Weitermachen</a>
            <a className="topbar-link" href={brand.kontaktUrl}>
              Kontakt
            </a>
          </nav>
        </div>
      </header>
      <Checker brand={brand} initialUrl={sp.url || ""} />
      <NextSteps />
      <Weitermachen brand={brand} />
      <Newsletter />
      <footer className="footer">
        <div className="wrap footer-inner">
          <p>
            Ein Werkzeug von {brand.name}, in Zusammenarbeit mit <a href="https://ki.services">ki.services</a>. Die Prüfmethode
            basiert auf dem Open-Source-Projekt{" "}
            <a href="https://github.com/zubair-trabzada/geo-seo-claude">geo-seo-claude</a> (MIT-Lizenz) und wurde für
            deutschsprachige Websites erweitert.
          </p>
          <p className="footer-links">
            <a href={brand.imprintUrl}>Impressum</a>
            <a href="/datenschutz">Datenschutz</a>
            <a href="/e/datenanfrage">Meine Daten</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
