/* Trainer-assigned weekly workouts. Shared by the trainer editor, the member plan and the server. */
export type PlannedWorkout = {title: string; exercises: string[]; time: string | null; durationMin: number | null; meetingUrl: string | null};
export type WeekPlan = (PlannedWorkout | null)[]; // index 0 = Monday … 6 = Sunday; null = rest day

/** The weeks a trainer can plan: this week and the next three, from the Monday weekStart (YYYY-MM-DD). */
export function planningWeeks(weekStart: string) {
  const monday = Date.parse(`${weekStart}T00:00:00Z`);
  return [0, 1, 2, 3].map(i => {
    const start = new Date(monday + i * 7 * 86400000);
    const label = start.toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"});
    return {start: start.toISOString().slice(0, 10), label: i === 0 ? `This week · from ${label}` : i === 1 ? `Next week · from ${label}` : `Week of ${label}`};
  });
}

export const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
/** URL segment for each day, e.g. /trainer/clients/<id>/workouts/<week>/monday */
export const daySlugs = dayNames.map(d => d.toLowerCase());

export const templates: Record<string, {exercises: string[]; durationMin: number}> = {
  "Full-body foundations": {durationMin: 25, exercises: ["Easy warm-up · 5 min", "Chair squat · 2 × 8", "Wall push-up · 2 × 8", "Standing calf raise · 2 × 10", "Gentle cool-down · 5 min"]},
  "Lower body strength": {durationMin: 35, exercises: ["Warm-up walk · 5 min", "Goblet squat · 3 × 10", "Reverse lunge · 3 × 8 each leg", "Glute bridge · 3 × 12", "Calf raise · 3 × 15", "Stretch · 5 min"]},
  "Upper body strength": {durationMin: 35, exercises: ["Arm circles · 3 min", "Push-up (incline if needed) · 3 × 8", "Dumbbell row · 3 × 10 each side", "Shoulder press · 3 × 10", "Plank · 3 × 30 s", "Stretch · 5 min"]},
  "Cardio conditioning": {durationMin: 30, exercises: ["Easy march · 5 min", "Intervals: 40 s on / 20 s off × 12", "Battle ropes or fast steps · 3 × 30 s", "Walk it out · 5 min"]},
  "Mobility & stretch": {durationMin: 20, exercises: ["Cat-cow · 1 min", "Hip flexor stretch · 1 min each side", "Hamstring stretch · 1 min each side", "Thoracic rotations · 10 each side", "Deep breathing · 2 min"]},
};

/** Accepts only https links (Meet, Zoom, Teams…), so a stored link can never run script in the member's browser. */
export function cleanMeetingUrl(value: string | null | undefined): string | null | "invalid" {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && trimmed.length <= 500 ? url.toString() : "invalid";
  } catch {
    return "invalid";
  }
}

export function sanitizeWeekPlan(input: unknown): WeekPlan | null {
  if (!Array.isArray(input) || input.length !== 7) return null;
  const plan: WeekPlan = [];
  for (const day of input) {
    if (day === null) { plan.push(null); continue; }
    if (typeof day !== "object") return null;
    const d = day as Record<string, unknown>;
    const title = typeof d.title === "string" ? d.title.trim().slice(0, 60) : "";
    if (!title) return null;
    const exercises = Array.isArray(d.exercises) ? d.exercises.filter((e): e is string => typeof e === "string").map(e => e.trim().slice(0, 80)).filter(Boolean).slice(0, 15) : [];
    const time = typeof d.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time) ? d.time : null;
    const duration = typeof d.durationMin === "number" && Number.isInteger(d.durationMin) && d.durationMin > 0 && d.durationMin <= 240 ? d.durationMin : null;
    const meeting = cleanMeetingUrl(typeof d.meetingUrl === "string" ? d.meetingUrl : null);
    if (meeting === "invalid") return null;
    plan.push({title, exercises, time, durationMin: duration, meetingUrl: meeting});
  }
  return plan;
}

/** "18:30" → "6:30 PM" */
export function formatTime(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
