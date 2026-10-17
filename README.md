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

New booking notifications are sent to kannika54932@gmail.com through Resend; clients receive an immediate awaiting-review receipt, then status emails when an administrator saves a decision. The salon contact email is kannika54932@gmail.com. The salon address is 20/115 ม.10 พัทยาใต้ซอย 16 เมืองพัทยา ตำบลหนองปรือ Bang Lamung District, Chon Buri 20150. The salon telephone is +66 81 727 4874. Opening hours are 09:00–22:00, Pattaya time. The owner has not specified opening days. Social profiles, prices and data retention policy still need to be supplied.

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

Decisions are saved by `/api/booking-status`, which verifies administrator access through Firestore, atomically checks for concurrent changes, and sends the client an English or Thai status email using the language recorded with their booking. Staff must check availability before confirming. Email failures preserve the decision and show an explicit retry message. Re-saving an unchanged decision uses the same email idempotency key.

Run policy and validation checks with `node --test tests/*.test.mjs`.

Admin verification (2026-10-16): Google-authenticated owner access, live request listing, confirming an exact appointment and declining a synthetic request were checked on the production admin page. Ten local policy/input tests pass. Five live access checks deny unauthenticated and guest listing, guest role access, self-assigned roles and guest confirmation. Serve the repository root and open `tests/admin-access.html` to repeat these negative access checks without creating appointments.

Brand colour: the logo and emblem SVG wrappers use the exact `--gold` value from `dist/style.css` (`#cbb17c`) with the original alpha silhouette. Source PNGs are preserved. Run `node scripts/build-brand-assets.mjs` on macOS to rebuild the self-contained SVG assets after changing the gold token.

Production admin sign-in uses a full-page Google redirect, with same-origin Firebase auth helper rewrites in `vercel.json`. OAuth client authorised redirect URI: `https://kannika-hair-beauty.vercel.app/__/auth/handler`. Keep this URI and Firebase authorised domains aligned if changing domains. Local preview continues to use popup sign-in.

English and Thai: `/` and `/th/`; administration: `/admin` and `/th/admin`. All public copy, booking controls, validation messages, request downloads, sharing and administrator decisions are translated. Thai uses Noto Sans Thai and Gregorian dates in the Pattaya time zone. Submitted treatment/time/status values remain canonical English keys for compatibility with existing Firebase records and rules. Customer names and notes are preserved verbatim. Edit `translations/th.json`, then run `python3 scripts/build-translations.py` to rebuild the Thai pages and browser dictionary. New online booking requests notify the salon and immediately email the client an awaiting-review receipt; administrator decisions send further client status emails in the submitted language.

Thai verification (2026-10-16): 15 local tests pass, including canonical booking values in Thai locale and Thai request downloads. A labelled synthetic booking with a Thai name and notes was submitted successfully, displayed in the production Thai admin, confirmed with an exact time, and then declined to close the test. Desktop and 390px mobile Thai layouts were checked.

## Booking email notifications

- Handler: `api/bookings.mjs`; validation, Firestore persistence and bilingual email template: `server/booking-notifications.mjs`.
- Recipient is fixed server-side to `kannika54932@gmail.com`. Sender defaults to `Kannika <appointments@kannikabeauty.com>`. Replies go to the client's submitted email.
- `RESEND_API_KEY` is a Vercel Production Secret, restricted to sending from `kannikabeauty.com`. Never commit, print or put this key in browser code. `BOOKING_FROM_EMAIL` is an optional server override.
- DNS on Cloudflare: TXT `resend._domainkey` (Resend DKIM public key), DNS-only CNAME `rsend` → `rsend-apne1.forge.rmta.net`, and DNS-only CNAME `send` → `send.forge.rmta.net`. Incoming email hosting is unchanged.
- Every operation uses the customer's Firebase ID token; Firestore verifies it and enforces the existing rules. No Firebase administrator private key is required. Client request values cannot change the sender or recipient.
- Stable request UUIDs prevent duplicate bookings. Resend uses `kannika-booking/{uuid}` as its idempotency key; replays stop after 23 hours to stay within Resend's 24-hour retention. Provider errors return a saved-but-not-notified state, rather than pretending the email was sent. No periodic retry worker is configured.
- Run `node --test tests/*.test.mjs` (24 checks including invalid authentication, owner isolation, safe HTML, duplicate suppression and provider failures).

Live email verification (2026-10-16, Asia/Bangkok): domain `kannikabeauty.com` is verified in Resend. A production Thai booking (`bb34ef1f-7486-42c4-8df0-40a282b965b4`) was saved in Firestore and its bilingual salon notification to `kannika54932@gmail.com` reached **Delivered** in Resend (message `01a14293-f556-7655-bc33-f429c7e524b8`). The synthetic request was then declined in admin. An unauthenticated production API probe returned `authentication_required`. No client email was sent.

## Client status notifications

New requests persist immutable `language` (`en` or `th`) from the booking page. Legacy requests without a language use English, with a visible label in admin. Status templates cover confirmed, declined and awaiting review, including the reference, treatment, salon contacts and Pattaya timezone. Confirmations show the exact confirmed date and time. The recipient and language come exclusively from the saved booking.

`api/booking-status.mjs` delegates to `server/booking-status.mjs`. All database access uses the administrator's Firebase ID token under the deployed rules, including owner-role verification. Changes use a Firestore update-time precondition. Each saved decision's server timestamp forms the Resend idempotency key; unchanged decisions retain their timestamp. Manual retries stop after 23 hours. There is no background retry worker. “Sent” means accepted by Resend; final delivery is available in the Resend dashboard.

Live client notification verification (2026-10-16): Thai request `09a14742-3900-440e-8d33-6dddf436440d` received a Thai confirmation showing 4 November 2026, 10:30 Pattaya time; Resend message `01a142a6-1aae-7d7c-a247-e8b03f5982c5` was Delivered. English request `699d1a20-8e59-44c1-9fe0-dc662df60f29` received an English decline from the Thai admin page; Resend message `01a142a7-43f7-751c-b814-433ba1fb958f` was Delivered. Both synthetic clients used the salon email, avoiding messages to real clients. Both test requests were then declined. The existing customer's pending request was left untouched. All 35 automated tests passed.

Immediate client receipts: `/api/bookings` sends a separate, localised receipt to the saved client email after verifying the booking in Firestore. It explains that the requested time awaits salon approval and that a second email will provide the confirmed appointment. Client receipts use the stable idempotency key `kannika-receipt/{uuid}`, independently of salon notifications. Both sends run independently; partial failures return separate `notification` and `clientNotification` states and the form offers a safe retry. No awaiting-review receipt is sent when a retry finds that the salon has already confirmed or declined the request. The existing 23-hour replay cutoff applies to both messages.

Confirmed appointment emails include the salon's full address and Google Maps / Apple Maps directions buttons in English or Thai, in both HTML and plain text. Links use the owner's verified coordinates as the destination; clients choose their own starting point. They appear only on confirmed appointments. Official URL references: https://developers.google.com/maps/documentation/urls/get-started and https://developer.apple.com/documentation/mapkit/unified-map-urls . Status notification keys now use `kannika-status-v3/{uuid}/{updatedAt}` so corrected map destinations cannot conflict with previously cached email payloads.

Verified salon location (2026-10-16): owner supplied https://maps.app.goo.gl/mu6Yk287XR7qLmxD7, whose place marker is **12.922515, 100.8778609** (`!3d` / `!4d` in the resolved Google place URL). Do not use the separate map viewport centre after `@`. The listing is currently named “Sanwariya seth nail shop” and displays the exact salon address. `salon-location.json` is the source for email directions and generated footer links. Both Google and Apple email directions target the numeric coordinates, preventing the old street-text geocoding error. Footer address and map links open the owner-supplied place URL. Rebuild with `python3 scripts/build-translations.py` after changing location settings.

## Kannika Beauty Club

Public card: `/club` and `/th/club`. Clients authenticate with a verified Firebase email link or the existing Google provider, then explicitly join. Joining stores a separate, optional marketing preference; appointment submission alone never joins the programme. The Firebase Spark email-link quota is currently 5 sign-in messages/day, so Google sign-in is also offered. No billing plan was changed. Email/password and email-link providers were explicitly approved by the owner on 2026-10-17. Links return to the production card page, contain single-use Firebase credentials, and require the matching email to complete sign-in. Client sessions use session persistence; no passwords or private card tokens appear in application-generated URLs.

`loyaltyMembers/{firebaseUid}` holds the verified email, name, language, consent version, stamps and redemption counts. Only the verified owner can create a zero-balance membership or read their own card; only existing administrators can list members or change balances. Immutable nested `events` document each stamp or redemption. Every balance update must atomically create a matching event under Firestore rules. Client self-awards, direct balance edits and event rewrites/deletions are denied.

One completed, paid visit earns one stamp. Five stamps in each ten-visit cycle earn a 10% reward for the next visit; ten earn a complimentary care treatment selected with salon staff. Available rewards carry forward until staff redeem them. The model does not invent a minimum spend, expiry date or specific gift menu. No payment amount is calculated online; staff apply the discount at checkout. Staff should agree the gift and any combination with other offers with the client before redeeming it.

Admin includes email lookup, booking-linked completed visits, walk-ins with a unique receipt/visit reference, rewards and an activity log. A booking's UUID is the stamp event ID; a normalised walk-in date/reference is hashed to a stable ID. Retrying either cannot double-credit a visit. Reward submissions retain their request ID across failed attempts. All writes run as Firestore transactions; counters are never increased just because a booking is confirmed.

`api/loyalty-notification.mjs` sends progress and reward emails via the existing server-only Resend key. It reads the immutable event and verified member address using the signed administrator token under Firestore rules. Event IDs are provider idempotency keys; retries stop after 23 hours. The activity list provides a manual retry if email delivery fails; no background worker is configured. English and Thai UI/email copy are included. Templates and member pages use safe text rendering for customer content.

Admin invitation workflow: the visible `Invite client` button opens a name/email/English-or-Thai form. `/api/loyalty-invitation` verifies the signed Firebase token through an admin-only Firestore query before sending via Resend. The invitation links to the selected-language public club page; it carries no authentication credentials or customer data in the URL. It creates no Firebase user, membership, stamps or marketing consent. The client signs in with the invited address and explicitly joins as usual. Identical normalized invitation contents use the same daily Resend idempotency key, so retries during that UTC day do not send another copy; a later-day invitation is a new send. Changing name, email or language creates a distinct invitation. A pending/error response keeps the form available for retry. Invitation sending is available to existing salon administrators only; no access rules were changed.
