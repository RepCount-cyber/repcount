/* A trainer-written nutrition plan for one member. Shared by the trainer editor, the member's Nutrition page and the server. */
export type PlannedMeal = {name: string; detail: string};
export type NutritionPlan = {calories: number | null; protein: number | null; meals: PlannedMeal[]; notes: string};

export const defaultMeals: PlannedMeal[] = ["Breakfast", "Lunch", "Snack", "Dinner"].map(name => ({name, detail: ""}));

const target = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max ? v : null;

/** Coerces untrusted input into a plan, or null when there is nothing in it. Meals without a description are dropped. */
export function sanitizeNutritionPlan(input: unknown): NutritionPlan | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const meals = Array.isArray(p.meals) ? p.meals.flatMap(m => {
    if (!m || typeof m !== "object") return [];
    const {name, detail} = m as Record<string, unknown>;
    const n = typeof name === "string" ? name.trim().slice(0, 30) : "";
    const d = typeof detail === "string" ? detail.trim().slice(0, 300) : "";
    return n && d ? [{name: n, detail: d}] : [];
  }).slice(0, 8) : [];
  const notes = typeof p.notes === "string" ? p.notes.trim().slice(0, 1000) : "";
  const plan = {calories: target(p.calories, 6000), protein: target(p.protein, 400), meals, notes};
  return plan.meals.length || plan.notes || plan.calories || plan.protein ? plan : null;
}
