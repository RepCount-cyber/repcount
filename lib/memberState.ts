/* A member's saved progress. Shared by the client (to build it) and the server (to validate and store it). */
export type Point = {label: string; value: number};
export type MemberState = {
  day: string;
  weekStart: string;
  tracker: {water: number; steps: number; sleep: number | null; mood: string | null; trained: boolean; weights: Point[]; fats: Point[]};
  workout: {done: number[]; finished: boolean; feedback: string};
  checkin: {submitted: boolean; energy: string; planFit: string};
  booking: string | null;
  payment: {submitted: boolean; reference: string};
  nutrition: {preference: string; logged: string[]; water: Record<string, number>};
};
export type NutritionState = MemberState["nutrition"];

export const moods = ["Low", "Okay", "Good", "Great"] as const;
export const energies = ["Low", "Steady", "High"] as const;
export const planFits = ["Manageable", "I need shorter sessions", "I would like more guidance"] as const;
export const feedbacks = ["", "Too easy", "About right", "Too difficult"] as const;
export const preferences = ["Balanced", "Vegetarian"] as const;

export const baseWeights: Point[] = [
  {label: "D1", value: 78.4}, {label: "D3", value: 78.2}, {label: "D5", value: 78.1}, {label: "D7", value: 77.8}, {label: "D9", value: 77.7},
];
export const baseFats: Point[] = [
  {label: "D1", value: 27.0}, {label: "D3", value: 26.9}, {label: "D5", value: 26.9}, {label: "D7", value: 26.7}, {label: "D9", value: 26.6},
];

export function defaultMemberState(day: string, weekStart: string): MemberState {
  return {
    day, weekStart,
    tracker: {water: 3, steps: 4280, sleep: null, mood: null, trained: false, weights: baseWeights, fats: baseFats},
    workout: {done: [], finished: false, feedback: ""},
    checkin: {submitted: false, energy: "Steady", planFit: "Manageable"},
    booking: null,
    payment: {submitted: false, reference: "DEMO-299"},
    nutrition: {preference: "Balanced", logged: [], water: {}},
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => options.includes(v as T) ? v as T : fallback;
const text = (v: unknown, max: number, fallback: string) => typeof v === "string" ? v.slice(0, max) : fallback;
const points = (v: unknown, fallback: Point[]) => Array.isArray(v)
  ? v.slice(0, 60).filter(isObject).map(p => ({label: text(p.label, 12, "?"), value: num(p.value, 0, 400, 0)}))
  : fallback;

/** Coerces untrusted input into a valid MemberState, keeping defaults for anything missing or malformed. */
export function sanitizeMemberState(input: unknown, day: string, weekStart: string): MemberState {
  const d = defaultMemberState(day, weekStart);
  if (!isObject(input)) return d;
  const t = isObject(input.tracker) ? input.tracker : {};
  const w = isObject(input.workout) ? input.workout : {};
  const c = isObject(input.checkin) ? input.checkin : {};
  const p = isObject(input.payment) ? input.payment : {};
  const n = isObject(input.nutrition) ? input.nutrition : {};
  return {
    day: text(input.day, 10, day),
    weekStart: text(input.weekStart, 10, weekStart),
    tracker: {
      water: num(t.water, 0, 30, d.tracker.water),
      steps: num(t.steps, 0, 15000, d.tracker.steps),
      sleep: t.sleep === null ? null : num(t.sleep, 0, 24, 0) || null,
      mood: t.mood === null ? null : pick(t.mood, moods, "Okay"),
      trained: t.trained === true,
      weights: points(t.weights, d.tracker.weights),
      fats: points(t.fats, d.tracker.fats),
    },
    workout: {
      done: Array.isArray(w.done) ? [...new Set(w.done.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < 5))] : [],
      finished: w.finished === true,
      feedback: pick(w.feedback, feedbacks, ""),
    },
    checkin: {submitted: c.submitted === true, energy: pick(c.energy, energies, "Steady"), planFit: pick(c.planFit, planFits, "Manageable")},
    booking: typeof input.booking === "string" ? input.booking.slice(0, 60) : null,
    payment: {submitted: p.submitted === true, reference: text(p.reference, 40, "DEMO-299")},
    nutrition: {
      preference: pick(n.preference, preferences, "Balanced"),
      logged: Array.isArray(n.logged) ? n.logged.filter((k): k is string => typeof k === "string").slice(0, 100).map(k => k.slice(0, 40)) : [],
      water: isObject(n.water) ? Object.fromEntries(Object.entries(n.water).slice(0, 7).map(([k, v]) => [k.slice(0, 2), num(v, 0, 30, 0)])) : {},
    },
  };
}

/** Starts a fresh day (daily tracker) or week (workout, check-in, booking, meals) when the saved state is older. */
export function rollOver(state: MemberState, day: string, weekStart: string): MemberState {
  const fresh = defaultMemberState(day, weekStart);
  let next = state;
  if (state.weekStart !== weekStart) {
    next = {...fresh, tracker: {...fresh.tracker, weights: state.tracker.weights, fats: state.tracker.fats}, payment: state.payment};
  } else if (state.day !== day) {
    next = {...state, day, tracker: {...fresh.tracker, weights: state.tracker.weights, fats: state.tracker.fats}};
  }
  return next;
}
