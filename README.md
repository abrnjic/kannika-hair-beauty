# Kannika — Hair & Beauty Salon

English and Thai website for Kannika Hair & Beauty Salon in Pattaya, Thailand.

## Run locally

Static pages can be previewed without dependencies. Booking submission requires the Vercel Function and its production secret; a plain static server does not send requests. With Python 3 installed:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173.

## Contents

- `dist/index.html`: website content and appointment planner
- `dist/style.css`: responsive black and gold design
- `dist/app.js`: appointment drafts, sharing and navigation
- `dist/assets/`: transparent logo and emblem

## Booking status and Firebase

Firebase project: `kannika-4f9b6`. The web configuration in `dist/firebase-config.js` is public app configuration, not a service account secret.

Booking submission is enabled. The default Firestore Standard database is in `asia-southeast3` (Bangkok), Anonymous Authentication is enabled, and the repository's `firestore.rules` are deployed.

Verified against the live project on 2026-10-16:

- Valid requests are saved with status `pending`.
- Retrying the same request in one page session keeps the same ID.
- Unauthenticated reads, another guest's reads, listing bookings, modifying submitted requests, and invalid data are denied.

To change the rules with Firebase CLI, sign in and run `firebase deploy --only firestore:rules --project kannika-4f9b6`. To temporarily return to draft-only mode, set `bookingsEnabled = false` in `dist/firebase-config.js` and deploy.

The browser loads Firebase Auth from Google's CDN only when a live request is submitted. It sends the guest's Firebase ID token, canonical request data and a stable UUID to `/api/bookings`. The Vercel Function saves the request through Firestore REST under the same deployed security rules, verifies the stored fields, then sends the salon email through Resend. Anonymous authentication uses memory persistence. Customer details are stored in `bookings` with status `pending`; they do not reserve or confirm a calendar slot. The console owner can manage records through Firebase IAM. Authorised salon administrators can manage requests at `/admin`.

Requests reuse the same ID for retries during the page session to avoid duplicate writes. A storage failure keeps the form data. If storage succeeds but email fails, the UI explicitly shows that the request is saved and offers an idempotent notification retry plus the salon phone number.

New booking notifications are sent to kannika54932@gmail.com through Resend; client confirmation emails are not automatic. The salon contact email is kannika54932@gmail.com. The salon address is 20/115 ม.10 พัทยาใต้ซอย 16 เมืองพัทยา ตำบลหนองปรือ Bang Lamung District, Chon Buri 20150. The salon telephone is +66 81 727 4874. Social profiles, prices, opening hours and data retention policy still need to be supplied.

Run input validation tests with `node --test tests/booking-validation.test.mjs`. The legacy `tests/firebase-integration.html` harness requires the updated booking API to be served as well (not just a static Python server). This creates one clearly labelled synthetic request in Firebase; do not include the test harness in the production `dist` directory.

## Content and hosting

The site includes hair services for women and men, colour and styling, nails, eyelash extensions and pedicures for women and men. Journal sharing supports Facebook, WhatsApp, LINE and copying links. English and Thai are available via the language switch.

Fonts load from Google Fonts and illustrative photographs from Unsplash. Production hosting is on Vercel at https://kannika-hair-beauty.vercel.app/.

Static hosting should serve the `dist` directory. This GitHub snapshot does not include Sites credentials or deployment-specific project identity.

## Salon administration

The protected admin workspace is available at `/admin` on Vercel (`/admin.html` during local preview). It uses Google sign-in with session-only persistence. Firestore enforces the administrator role independently of the UI.

Administrators can review requests, search loaded pages, confirm a specific date/time in Pattaya, decline requests and reopen them for review. Confirmations are transactional and reject stale edits. Requests load in pages of 100, newest first; summary counts and search apply to loaded records. Customer contact and request fields cannot be changed, and records cannot be deleted through the app.

Google-authenticated, verified users signing in as `kannika54932@gmail.com`, or with an `admins/{firebaseUid}` document containing `role: "owner"`, can read all requests or save decisions. The salon email is enforced in Firestore rules as well as the UI; the existing owner role remains active. These role documents must be created by a project owner in the Firebase console; client-side role creation is denied. An unapproved signed-in account can see only its own Firebase UID to request access.

The Google provider must be enabled in Authentication and the production domain must be in its authorised domains. Deploy `firestore.rules` whenever permissions change. Do not add staff role records without owner authorisation.

Decisions do not send email or check for staff/calendar conflicts. Staff must contact clients separately and check availability before confirming.

Run policy and validation checks with `node --test tests/*.test.mjs`.

Admin verification (2026-10-16): Google-authenticated owner access, live request listing, confirming an exact appointment and declining a synthetic request were checked on the production admin page. Ten local policy/input tests pass. Five live access checks deny unauthenticated and guest listing, guest role access, self-assigned roles and guest confirmation. Serve the repository root and open `tests/admin-access.html` to repeat these negative access checks without creating appointments.

Brand colour: the logo and emblem SVG wrappers use the exact `--gold` value from `dist/style.css` (`#cbb17c`) with the original alpha silhouette. Source PNGs are preserved. Run `node scripts/build-brand-assets.mjs` on macOS to rebuild the self-contained SVG assets after changing the gold token.

Production admin sign-in uses a full-page Google redirect, with same-origin Firebase auth helper rewrites in `vercel.json`. OAuth client authorised redirect URI: `https://kannika-hair-beauty.vercel.app/__/auth/handler`. Keep this URI and Firebase authorised domains aligned if changing domains. Local preview continues to use popup sign-in.

English and Thai: `/` and `/th/`; administration: `/admin` and `/th/admin`. All public copy, booking controls, validation messages, request downloads, sharing and administrator decisions are translated. Thai uses Noto Sans Thai and Gregorian dates in the Pattaya time zone. Submitted treatment/time/status values remain canonical English keys for compatibility with existing Firebase records and rules. Customer names and notes are preserved verbatim. Edit `translations/th.json`, then run `python3 scripts/build-translations.py` to rebuild the Thai pages and browser dictionary. New online booking requests notify the salon by email; administrator decisions do not send client emails.

Thai verification (2026-10-16): 15 local tests pass, including canonical booking values in Thai locale and Thai request downloads. A labelled synthetic booking with a Thai name and notes was submitted successfully, displayed in the production Thai admin, confirmed with an exact time, and then declined to close the test. Desktop and 390px mobile Thai layouts were checked.

## Booking email notifications

- Handler: `api/bookings.mjs`; validation, Firestore persistence and bilingual email template: `server/booking-notifications.mjs`.
- Recipient is fixed server-side to `kannika54932@gmail.com`. Sender defaults to `Kannika <appointments@kannikabeauty.com>`. Replies go to the client's submitted email.
- `RESEND_API_KEY` is a Vercel Production Secret, restricted to sending from `kannikabeauty.com`. Never commit, print or put this key in browser code. `BOOKING_FROM_EMAIL` is an optional server override.
- DNS on Cloudflare: TXT `resend._domainkey` (Resend DKIM public key), DNS-only CNAME `rsend` → `rsend-apne1.forge.rmta.net`, and DNS-only CNAME `send` → `send.forge.rmta.net`. Incoming email hosting is unchanged.
- Every operation uses the customer's Firebase ID token; Firestore verifies it and enforces the existing rules. No Firebase administrator private key is required. Client request values cannot change the sender or recipient.
- Stable request UUIDs prevent duplicate bookings. Resend uses `kannika-booking/{uuid}` as its idempotency key; replays stop after 23 hours to stay within Resend's 24-hour retention. Provider errors return a saved-but-not-notified state, rather than pretending the email was sent. No periodic retry worker is configured.
- Run `node --test tests/*.test.mjs` (24 checks including invalid authentication, owner isolation, safe HTML, duplicate suppression and provider failures).
