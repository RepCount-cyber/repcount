# RepCount database and accounts — Neon

RepCount stores everything in Postgres. Production uses Neon; any Postgres 15+ works locally.

## Connect Neon

1. In the Neon console, open the project and copy the **pooled** connection string (the host contains `-pooler`).
2. Set it as `DATABASE_URL` in Vercel (Production and Preview) and in `.env.local`. Keep it out of chat, GitHub and any `NEXT_PUBLIC_` variable.
3. Set `ADMIN_EMAIL` to the owner's Google account (and optionally `ADMIN_PASSWORD`, 10+ characters).
4. Deploy, or run `npm run dev`. The first request creates the tables and the super admin. Creating the schema is idempotent and runs under an advisory lock, so concurrent cold starts are safe.

Use a Neon branch (for example `dev`) for local work, so development never writes to production data.

## Tables

| Table | Holds |
|---|---|
| `users` | Every sign-in (member, trainer, admin): scrypt password hash or Google-only, `active`, `session_version` |
| `clients` | Client record: stage, `trainer_id`, payment, progress, `last_workout_on`, contact details |
| `member_state` | The member's current day and week (tracker, workouts, check-in, booking, meals) |
| `member_history` | Archived days (tracker) and weeks (full state), written when a new day or week starts |
| `workout_plans` | Trainer-scheduled workouts per client, week and day |
| `audit_log` | Every staff action, with actor and subject |
| `login_attempts` | Shared sign-in limiter: 5 failures per email and IP, 20 per email, per 15 minutes |
| `settings` | Programme price (AED) and cohort size |

## Accounts

- No open sign-up. The super admin adds trainers and clients; each can sign in with Google using that email, or with a password the admin sets.
- Deactivating an account (client detail page, or the trainer card) blocks sign-in and revokes every existing session.
- Demo logins exist only in a database seeded with `SEED_DEMO_DATA=true`. Never seed a database that will hold real clients.

## Still to do before real clients

- Password reset and invitation emails (needs a transactional email provider such as Resend or Postmark).
- Backups and retention: turn on Neon point-in-time restore for the production branch and decide a retention period.
- Privacy policy, consent at sign-up and a data-deletion process for health data.
