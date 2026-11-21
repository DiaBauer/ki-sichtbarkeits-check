import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { brandFor } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = brandFor((await headers()).get("host"));
  return {
    title: `KI-Sichtbarkeits-Check | ${brand.name}`,
    description:
      "Prüfen Sie kostenlos, ob ChatGPT, Perplexity und Google AI Overviews Ihre Website verstehen, zitieren und empfehlen können. Mit Note, Einzelbefunden und konkreten Maßnahmen.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
