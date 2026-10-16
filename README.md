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

Booking submission remains disabled (`bookingsEnabled = false`) until the live Firebase setup is verified. The current form creates a draft only.

To activate:

1. Create the default Cloud Firestore database in the Firebase console, in production mode. Review the location before creation.
2. Enable Authentication → Sign-in method → Anonymous.
3. Publish `firestore.rules` to this project's default database. If using Firebase CLI, run `firebase deploy --only firestore:rules --project kannika-4f9b6` after signing in. Do not replace rules for unrelated data without review.
4. Verify that a signed-in guest can create their own valid pending request, cannot list bookings, cannot read another guest's request, and cannot update or delete requests.
5. Set `bookingsEnabled = true`, verify a test submission and its document in the console, then deploy through GitHub/Vercel.

The browser loads Firebase Auth and Firestore Lite from Google's CDN only when a live request is submitted. Anonymous authentication uses memory persistence. Customer details are stored in `bookings` with status `pending`; they do not reserve or confirm a calendar slot. The console owner can manage records through Firebase IAM. No client admin access is provided.

Requests reuse the same ID for retries during the page session to avoid duplicate writes. Failure keeps the form data and does not show a success message.

Email delivery is not configured. The salon email, address, telephone, social profiles, prices, opening hours and data retention policy still need to be supplied.

Run input validation tests with `node --test tests/booking-validation.test.mjs`. Firebase rules and live persistence require separate verification before activation.

## Content and hosting

The site includes hair services for women and men, colour and styling, nails, eyelash extensions and pedicures for women and men. Journal sharing supports Facebook, WhatsApp, LINE and copying links. Thai language support is planned.

Fonts load from Google Fonts and illustrative photographs from Unsplash. The current Sites deployment is private, so shared story links require access until the site becomes public.

Static hosting should serve the `dist` directory. This GitHub snapshot does not include Sites credentials or deployment-specific project identity.
