import { CATEGORY_META, CategoryKey } from "./categories";

export function totalScore(scores: Partial<Record<CategoryKey, number>>) {
  let sum = 0;
  let w = 0;
  for (const [k, meta] of Object.entries(CATEGORY_META) as [CategoryKey, (typeof CATEGORY_META)[CategoryKey]][]) {
    const v = scores[k];
    if (typeof v === "number") {
      sum += v * meta.weight;
      w += meta.weight;
    }
  }
  return w ? Math.round(sum / w) : 0;
}

// German school grade 1 (sehr gut) – 6 (ungenügend)
export function grade(score: number) {
  if (score >= 90) return { note: 1, label: "sehr gut" };
  if (score >= 75) return { note: 2, label: "gut" };
  if (score >= 60) return { note: 3, label: "befriedigend" };
  if (score >= 45) return { note: 4, label: "ausreichend" };
  if (score >= 30) return { note: 5, label: "mangelhaft" };
  return { note: 6, label: "ungenügend" };
}

export function tone(score: number): "ok" | "warn" | "fail" {
  return score >= 70 ? "ok" : score >= 45 ? "warn" : "fail";
}
