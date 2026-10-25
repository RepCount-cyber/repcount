# RepCount

Interactive demo of a mobile-friendly online fitness coaching service.

## Try it

`/` is the public homepage. `/login` signs in members, trainers and the super admin, and each role lands on its own area:

| Role | Area | Demo account (development only) |
|---|---|---|
| Member | `/member/overview` (plan, nutrition, progress, team, membership) | `member@repcount.demo` / `Member#2026` |
| Trainer | `/trainer` (today, my clients, check-ins) | `trainer@repcount.demo` / `Trainer#2026` |
| Super admin | `/admin` (overview, clients & payments, trainers, settings) | `admin@repcount.demo` / `Admin#2026` |

Signed-out visitors are sent to `/login`; signed-in users who open another role's area are sent back to their own.

## Data

Everything is saved in a local SQLite database (`data/repcount.db`, created and seeded on first run, ignored by git) using Node's built-in `node:sqlite`:

- Members: daily tracker, workout progress, weekly check-in, booking, payment reference and meal log save automatically ("All changes saved" in the top bar). Daily entries start fresh each day and weekly ones each week (India time).
- Trainers see only their assigned clients, including the member's latest check-in, and mark check-ins reviewed.
- The super admin verifies payments, assigns trainers and edits price, currency and cohort size; the homepage and membership page use the live price.
- Every staff action is written to an audit log shown on the admin overview.

Delete `data/repcount.db` to reset to the sample cohort. Set `DATABASE_PATH` to store it elsewhere. SQLite suits a single Node server; for serverless hosting or real clients, move these tables to Neon Postgres (`ACCOUNT-SETUP.md`).

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

- Credentials are checked by a server action (`app/actions/auth.ts`) against salted scrypt hashes (`lib/users.ts`), with a 5-failures-per-15-minutes limit per email and IP.
- Success sets a signed (HS256), httpOnly, SameSite=Lax session cookie for 7 days (`lib/session.ts`).
- `proxy.ts` redirects early; every protected layout re-checks the session and role on the server (`lib/dal.ts`).
- Demo accounts are listed on the login page outside production builds, or when `SHOW_DEMO_ACCOUNTS=true`.
- Before real clients: replace `lib/users.ts` with the Neon-backed store in `ACCOUNT-SETUP.md`, add invitation and password reset, and move the attempt limiter to a shared store.

## Development

- Node.js 22.13 or newer.
- `npm ci`
- `cp .env.example .env.local` and set `SESSION_SECRET` (32+ random characters).
- `npm run dev` for the local app.
- `npm run build` and `npm start` for a production server.
- `npm test` builds, starts the production server and checks rendered pages and role access.
- `npm run typecheck` for type checking.

Hosting needs a long-running Node.js server with a persistent disk for the SQLite file (for example Render with a disk, Railway or a VPS); on Vercel the database falls back to `/tmp`, which resets on cold starts and is not shared between instances, so treat Vercel as a demo until the Neon database is connected. Required environment variables: `SESSION_SECRET` (32+ random characters); optional: `SITE_URL`, `SHOW_DEMO_ACCOUNTS`, `DATABASE_PATH`. GitHub Pages cannot run the login, so the old static `docs/` build has been removed.

## Design

An original crimson R identity, warm ivory and charcoal, editorial typography, and approachable women and men exercising at home. One interactive phone demonstrates movement, nutrition concepts, progress and coaching. The member demo shares the same visual identity.

Illustrative media comes from Pexels, commercial-free Mixkit clips and Unsplash. Sources and licences are recorded in `MEDIA-CREDITS.md`. Stock subjects are not presented as actual staff, clients or endorsements. Videos are remote CDN assets, load near the viewport and provide explicit playback controls; automatic playback honours reduced motion and page visibility.
Fonts: DM Sans and Manrope via Google Fonts, with system fallbacks.

Reduced-motion and Save Data preferences keep video posters visible without automatically attaching remote video sources. Explicit Play remains available. A JavaScript-disabled visitor receives a short branded explanation rather than an empty page.

## Demo boundaries

The programme describes an India adults-only pilot (default AED 299 for 30 days, editable by the super admin) with a personal training plan and weekly trainer follow-ups. Nutrition scope remains open. The psychologist onboarding service has been withdrawn and is not offered.

Before real client use, connect durable storage for profiles, plans, check-ins and payments, add invitation-based account creation and scheduling. Brand availability has not been checked.
