/* Programme constants shared by server code and client components. */

/** Pricing is in UAE dirhams. */
export const currency = "AED";
export const stages = ["Payment review", "Onboarding", "Active", "Check-in due"] as const;

/* Registration choices: what the member wants, where they'll train and how often. */
export const goals = ["Build strength", "Build a consistent routine", "Feel more confident exercising", "Lose body fat", "Improve mobility"] as const;
export const places = ["At home", "At a gym", "A mix of both"] as const;
export const rhythms = ["2 days a week", "3 days a week", "4 days a week"] as const;

/* Biodata the admin can record for a member. Dates are YYYY-MM-DD. */
export const genders = ["Female", "Male", "Prefer not to say"] as const;
export type Bio = {dob: string | null; gender: string | null; heightCm: number | null};

/** The member's incremental ID as shown to staff, e.g. 7 → "RC-0007". */
export const memberCode = (memberNo: number) => `RC-${String(memberNo).padStart(4, "0")}`;

/** Whole years between a YYYY-MM-DD date of birth and today. */
export function ageFrom(dob: string, today = new Date()) {
  const [y, m, d] = dob.split("-").map(Number);
  return today.getFullYear() - y - (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d) ? 1 : 0);
}
