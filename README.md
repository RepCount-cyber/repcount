# RepCount

Interactive demo of a mobile-friendly online fitness coaching service.

## Try it

Client views include a daily overview, a guided sample workout, progress, weekly check-ins, the proposed support team and membership. Programme describes the 30-day pilot. Staff demo includes a sample roster, search, trainer assignment and payment verification.

All client records are fictional. Changes last for the current page visit only. No actual messages, bookings, payments or enrolments are submitted. Staff switching is a preview control, not authentication.

## Development

- Node.js 22.13 or newer.
- `npm ci`
- `npm run dev` for the local app.
- `npm run build:pages` for GitHub Pages output in `docs/`.
- `npm run build` for the optional Cloudflare-compatible worker build.
- `npm test` to build and check rendered output.
- `npx tsc --noEmit` for type checking.

GitHub Pages serves `docs/` from the main branch. Asset URLs are relative to support repository hosting and a future custom domain. Run `npm run build:pages` and commit the updated `docs/` when changing the site.

## Design

Bold red R, charcoal navigation, clean white surfaces, athletic male photography. Original layout and implementation, informed by the client coaching patterns of Future and Trainwell, workout clarity of Freeletics, programme presentation of FITTR and staff workflows of Trainerize.

Photography: Rohit Reddy, https://unsplash.com/photos/FGP9ifRTQaI (Unsplash licence).
Fonts: DM Sans and Manrope via Google Fonts, with system fallbacks.

## Demo boundaries

The programme describes a proposed India adults-only pilot at AED 250 for 30 days, with psychologist onboarding and weekly trainer follow-ups. Proposed provider availability is unconfirmed. Nutrition scope and payment collection currency remain open.

Before real client use, implement authenticated accounts, server-side roles, secure durable storage, scheduling, manual-payment verification and consent-based professional handoffs. Private psychological notes must remain outside general trainer/admin records. Brand availability has not been checked.
