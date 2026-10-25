/** Today and the Monday of this week in India time, as YYYY-MM-DD. The pilot runs on IST. */
export function istToday() {
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const monday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)));
  return {day: iso(today), weekStart: iso(monday)};
}
