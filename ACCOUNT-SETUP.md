# RepCount accounts — Neon

The owner selected Neon on 29 September 2026. This replaces the Supabase proposal. No cloud project, migration or auth connection has been created. Login and access-request screens remain non-collecting previews.

## Owner setup

1. Open https://console.neon.tech and create a business-owned account. Start with Free; no paid plan is authorised.
2. Create project `repcount-pilot`. Proposed region: AWS Singapore (`aws-ap-southeast-1`) for the India-first pilot. Neon currently lists no Mumbai region. Confirm before creation: changing region requires a new project and migration.
3. Enable Managed Better Auth and Data API on a development branch, using Managed Better Auth as identity provider. Leave broad automatic public-schema grants unchecked; use explicit migration grants.
4. Provide public HTTPS Auth/Data API endpoints through the implementation workflow. Keep database connection strings/passwords and API tokens out of chat, GitHub and browser environment variables.
5. Configure trusted origins for https://repcount-cyber.github.io and localhost only for development. Add exact invitation/recovery redirects once implemented; configure and test email delivery.

## Confirmed account journey

Client details or manual payment → admin independently verifies payment → approves access → private invitation/activation → client sets password → authenticated client area.

No open signup UI. Verify provider-side public signup restrictions and supported invitation APIs before implementation. If a trusted server approval endpoint is needed, authentication alone must never grant membership. Never email readable passwords or insert directly into managed neon_auth tables. The public staff demo is not a real admin console.

## Storage

- Identity, password hashes and sessions: Neon Managed Better Auth (`neon_auth`).
- Profiles and membership: Neon Postgres with client-specific row-level policies.
- Intake: private schema, accessible only through validated server functions and authorised administration.
- Plans/progress: later migrations with client and assigned-trainer policies, plus active-membership/date checks.
- Future uploads: private object storage with per-user access.
- Psychologist clinical notes: excluded; remain in the professional's separate record system initially.

GitHub Pages hosts the frontend only. Intake and privileged approval need trusted server functions. Database owner credentials must never enter browser code. Public sample member views remain separate from real account routes.

## Implementation status and next steps

`backend/schema-draft.sql` is now a Neon-only, UNAPPLIED draft requiring Data API roles and auth.user_id(). Identity IDs are text. Browser users get only own-profile/own-membership reads, no writes and no intake access. Trusted provisioning must match IDs to verified Auth users and clean up on account deletion. Server roles still need least-privilege configuration.

After the project exists: connect the official Neon React SDK, implement login/logout/invitation/recovery and real client routes; implement rate-limited intake, admin authorisation and audited payment approval. Test two clients with real JWTs through Data API, anonymous denial, forbidden payment writes, pending/expired/paused membership, admin access and revoked access. Owner SQL queries bypass RLS and cannot prove client isolation. Test sender delivery and mobile screens before enabling collection. Select retention/backups before live records.

No SQL execution or cloud verification has occurred. Chrome remote-debugging permission currently blocks browser-assisted setup/publication. No login deployment has occurred.

## Official references checked 29 September 2026

- https://neon.com/docs/auth/overview
- https://neon.com/docs/data-api/get-started
- https://neon.com/docs/guides/row-level-security
- https://neon.com/docs/introduction/regions
