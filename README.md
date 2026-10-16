# Kannika — Hair & Beauty Salon

English working version of the Kannika salon website in Pattaya, Thailand.

## Run locally

No build step or Node dependencies are required. With Python 3 installed:

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

The browser loads Firebase Auth and Firestore Lite from Google's CDN only when a live request is submitted. Anonymous authentication uses memory persistence. Customer details are stored in `bookings` with status `pending`; they do not reserve or confirm a calendar slot. The console owner can manage records through Firebase IAM. Authorised salon administrators can manage requests at `/admin`.

Requests reuse the same ID for retries during the page session to avoid duplicate writes. Failure keeps the form data and does not show a success message.

Email delivery is not configured. The salon contact email is kannika54932@gmail.com. The address, telephone, social profiles, prices, opening hours and data retention policy still need to be supplied.

Run input validation tests with `node --test tests/booking-validation.test.mjs`. For the live integration checks, serve the repository root locally and open `tests/firebase-integration.html`. This creates one clearly labelled synthetic request in Firebase; do not include the test harness in the production `dist` directory.

## Content and hosting

The site includes hair services for women and men, colour and styling, nails, eyelash extensions and pedicures for women and men. Journal sharing supports Facebook, WhatsApp, LINE and copying links. Thai language support is planned.

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
