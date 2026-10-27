# RepCount

Interactive demo of a mobile-friendly online fitness coaching service.

## Try it

`/` is the public homepage. `/login` signs in members, trainers and the super admin, and each role lands on its own area:

| Role | Area | Demo account (only in a database seeded with `SEED_DEMO_DATA=true`) |
|---|---|---|
| Member | `/member/overview` (plan, nutrition, progress, team, membership) | `member@repcount.demo` / `Member#2026`, `member2@repcount.demo` / `Member2#2026` |
| Trainer | `/trainer` (today, schedule, my clients, check-ins, client details) | `trainer@repcount.demo` / `Trainer#2026`, `trainer2@repcount.demo` / `Trainer2#2026` |
| Super admin | `/admin` (overview, clients & payments, trainers, settings) | `admin@repcount.demo` / `Admin#2026` |

Signed-out visitors are sent to `/login`; signed-in users who open another role's area are sent back to their own.

## Data

Everything is stored in Postgres (Neon in production) through `DATABASE_URL`. Tables are created on first use; see `ACCOUNT-SETUP.md` for the schema and Neon setup.

- Members: daily tracker, workout progress, weekly check-in, booking, payment reference and meal log save automatically ("All changes saved" in the top bar). Daily entries start fresh each day and weekly ones each week (India time, decided by the server). The previous day and week are archived, and staff see past weeks on the client page.
- Trainers see only their assigned clients (linked by trainer ID), including each client's detail page and latest check-in, and mark check-ins reviewed.
- The super admin adds clients and trainers, verifies payments, assigns trainers, changes a client's stage, deactivates accounts and edits the price and cohort size. Prices are in AED.
- Every staff action is written to an audit log shown on the admin overview.

## Staff features

- **Trainer → Workout schedule:** pick a client and a week (this week or the next three), set each day as rest or a workout (templates or custom), add start time, duration, exercises and an optional live-session link (Google Meet, Zoom, Teams; https only). A weekly check-in call link can be saved per client. Members see the schedule on My plan with a "Join live session" button and mark workouts done; their weekly progress follows the schedule.
- **Admin → Trainers:** trainer performance (client load, average progress, trained today, check-ins waiting/reviewed, unpaid clients) and an Add trainer form. New trainers sign in with Google using that email, or with an optional password.
- **Admin → Clients & payments:** filter by trainer and sort by name, trainer, progress or stage. Each name opens `/admin/clients/<id>` with contact details, payment, trainer, this week's schedule, the member's saved tracker/workout/check-in/meal data, weight trend and the client's history.

## Google sign-in

Optional. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to show "Continue with Google" on `/login`. Only emails that already belong to a RepCount user are admitted; there is no open sign-up.

1. Google Cloud Console → APIs & Services → OAuth consent screen: create it (External), add your app name and support email.
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Authorised redirect URIs: `https://<your-domain>/api/auth/google/callback` and, for local work, `http://localhost:3100/api/auth/google/callback`.
4. Copy the client ID and secret into Vercel (and `.env.local`). Set `SITE_URL` to your domain so the redirect URI matches exactly.

## Authentication

- Credentials are checked by a server action (`app/actions/auth.ts`) against salted scrypt hashes (`lib/users.ts`). Failed attempts are limited in Postgres: 5 per email and IP and 20 per email in 15 minutes, across all server instances.
- Success sets a signed (HS256), httpOnly, SameSite=Lax session cookie for 7 days (`lib/session.ts`). It carries the user's session version; deactivating an account bumps it, which revokes every existing cookie.
- `proxy.ts` redirects early; every protected layout re-checks the session, role, active flag and session version on the server (`lib/dal.ts`).
- The first super admin comes from `ADMIN_EMAIL` (and optional `ADMIN_PASSWORD`). Demo accounts are only created with `SEED_DEMO_DATA=true`, and listed on the login page outside production builds or when `SHOW_DEMO_ACCOUNTS=true`.
- Still missing before real clients: password reset and invitation emails.

## Development

- Node.js 22.13 or newer, and a Postgres database (a Neon dev branch, or local Postgres).
- `npm ci`
- `cp .env.example .env.local`, then set `SESSION_SECRET` (32+ random characters) and `DATABASE_URL`. Add `SEED_DEMO_DATA=true` to get the sample cohort and demo logins in an empty dev database.
- `npm run dev` for the local app.
- `npm run build` and `npm start` for a production server.
- `npm test` builds, starts the production server against `TEST_DATABASE_URL` (a throwaway database whose name contains "test"; it is wiped), and checks rendered pages, role access and session revocation.
- `npm run lint` and `npm run typecheck`. CI runs all of these, plus `npm audit`, on every push and pull request.

Hosting: Vercel, or any Node host, with `DATABASE_URL` pointing at Neon's pooled connection string. Required environment variables: `SESSION_SECRET`, `DATABASE_URL`, `ADMIN_EMAIL`. Optional: `ADMIN_PASSWORD`, `SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SHOW_DEMO_ACCOUNTS`, `SEED_DEMO_DATA` (demo deployments only).

## Design

An original crimson R identity, warm ivory and charcoal, editorial typography, and approachable women and men exercising at home. One interactive phone demonstrates movement, nutrition concepts, progress and coaching. The member demo shares the same visual identity.

Illustrative media comes from Pexels, commercial-free Mixkit clips and Unsplash. Sources and licences are recorded in `MEDIA-CREDITS.md`. Stock subjects are not presented as actual staff, clients or endorsements. Videos are remote CDN assets, load near the viewport and provide explicit playback controls; automatic playback honours reduced motion and page visibility.
Fonts: DM Sans and Manrope via Google Fonts, with system fallbacks.

Reduced-motion and Save Data preferences keep video posters visible without automatically attaching remote video sources. Explicit Play remains available. A JavaScript-disabled visitor receives a short branded explanation rather than an empty page.

## Demo boundaries

The programme describes an India adults-only pilot, priced in AED (default AED 299 for 30 days, editable by the super admin) with a personal training plan and weekly trainer follow-ups. Nutrition scope remains open. The psychologist onboarding service has been withdrawn and is not offered.

Before real client use, add password-reset and invitation emails, real messaging, a privacy policy with consent, and backups. Brand availability has not been checked.
