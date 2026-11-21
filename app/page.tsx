import { headers } from "next/headers";
import { brandFor } from "@/lib/brand";
import Checker from "@/components/Checker";
import { NextSteps, Newsletter, Pricing } from "@/components/Sections";

export default async function Page({ searchParams }: { searchParams: Promise<{ brand?: string; url?: string }> }) {
  const sp = await searchParams;
  const brand = brandFor((await headers()).get("host"), sp.brand);
  return (
    <div style={{ ["--accent" as string]: brand.accent, ["--accent-ink" as string]: brand.accentInk }}>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="wordmark" href={brand.ctaUrl.replace(/#.*/, "")}>
            {brand.name}
          </a>
          <nav className="topnav">
            <a href="#preise">Preise</a>
            <a className="topbar-link" href={brand.ctaUrl}>
              Kontakt
            </a>
          </nav>
        </div>
      </header>
      <Checker brand={brand} initialUrl={sp.url || ""} />
      <NextSteps />
      <Pricing brand={brand} />
      <Newsletter brand={brand} />
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
            <a href={brand.privacyUrl}>Datenschutz</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
