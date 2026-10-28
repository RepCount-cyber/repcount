/* Completed days, streaks and leaderboard points. Shared by the member app and the server so both count the same way. */

export const shiftDay = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/**
 * Consecutive completed days ending today. A day counts when the member marked it complete or their trainer confirmed the session.
 * Today only adds to the streak once it is complete; until then the streak runs to yesterday, so it doesn't reset each morning.
 */
export function streakFrom(done: Set<string>, today: string) {
  let streak = 0;
  for (let d = done.has(today) ? today : shiftDay(today, -1); done.has(d); d = shiftDay(d, -1)) streak++;
  return streak;
}

/** Leaderboard window and points: 10 for each completed day, plus 5 when the trainer confirmed that day's session. */
export const scoreWindowDays = 30;
export const pointsPerDay = 10;
export const pointsPerConfirmed = 5;

export function scoreFor(done: Set<string>, confirmed: Set<string>, today: string) {
  const from = shiftDay(today, 1 - scoreWindowDays);
  const inWindow = (d: string) => d >= from && d <= today;
  return [...done].filter(inWindow).length * pointsPerDay + [...confirmed].filter(inWindow).length * pointsPerConfirmed;
}

/** pastStreak runs to yesterday, so the member app can add today live as the member marks it complete. */
export type LeaderboardRow = {userId: string; name: string; initials: string; score: number; streak: number; rank: number; pastStreak: number; confirmedToday: boolean};
