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

The browser loads Firebase Auth and Firestore Lite from Google's CDN only when a live request is submitted. Anonymous authentication uses memory persistence. Customer details are stored in `bookings` with status `pending`; they do not reserve or confirm a calendar slot. The console owner can manage records through Firebase IAM. No client admin access is provided.

Requests reuse the same ID for retries during the page session to avoid duplicate writes. Failure keeps the form data and does not show a success message.

Email delivery is not configured. The salon email, address, telephone, social profiles, prices, opening hours and data retention policy still need to be supplied.

Run input validation tests with `node --test tests/booking-validation.test.mjs`. For the live integration checks, serve the repository root locally and open `tests/firebase-integration.html`. This creates one clearly labelled synthetic request in Firebase; do not include the test harness in the production `dist` directory.

## Content and hosting

The site includes hair services for women and men, colour and styling, nails, eyelash extensions and pedicures for women and men. Journal sharing supports Facebook, WhatsApp, LINE and copying links. Thai language support is planned.

Fonts load from Google Fonts and illustrative photographs from Unsplash. Production hosting is on Vercel at https://kannika-hair-beauty.vercel.app/.

Static hosting should serve the `dist` directory. This GitHub snapshot does not include Sites credentials or deployment-specific project identity.
