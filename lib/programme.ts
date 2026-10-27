/* Programme constants shared by server code and client components. */

/** Pricing is in UAE dirhams. */
export const currency = "AED";
export const stages = ["Payment review", "Onboarding", "Active", "Check-in due"] as const;

/* Registration choices: what the member wants, where they'll train and how often. */
export const goals = ["Build strength", "Build a consistent routine", "Feel more confident exercising", "Lose body fat", "Improve mobility"] as const;
export const places = ["At home", "At a gym", "A mix of both"] as const;
export const rhythms = ["2 days a week", "3 days a week", "4 days a week"] as const;
