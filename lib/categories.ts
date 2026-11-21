export type Status = "ok" | "warn" | "fail";
export type Finding = { id: string; label: string; status: Status; detail: string };
export type CategoryKey = "citability" | "brand" | "content" | "technical" | "schema" | "answer";

export const CATEGORY_META: Record<CategoryKey, { label: string; weight: number; explain: string }> = {
  citability: { label: "KI-Zitierfähigkeit", weight: 25, explain: "Können KI-Systeme Ihre Inhalte lesen und als Quelle übernehmen?" },
  brand: { label: "Markenautorität", weight: 20, explain: "Wie gut ist Ihr Unternehmen außerhalb der eigenen Website belegt?" },
  content: { label: "Inhalt & Vertrauen", weight: 20, explain: "Expertise, Erfahrung und Glaubwürdigkeit (E-E-A-T)." },
  technical: { label: "Technik", weight: 15, explain: "Kann ein KI-Crawler die Seite ohne JavaScript vollständig lesen?" },
  schema: { label: "Strukturierte Daten", weight: 10, explain: "Maschinenlesbare Angaben dazu, wer Sie sind und was Sie anbieten." },
  answer: { label: "Antwort-Struktur", weight: 10, explain: "Liefert die Seite direkte Antworten auf konkrete Kundenfragen?" },
};

