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

## Booking status

The appointment form currently creates a local draft. It does not send email, reserve a time or store customer details on a server. The salon email, address, telephone, social profiles, prices and opening hours will be supplied later.

`SALON_EMAIL` in `dist/app.js` can later enable a prepared email in the visitor’s email application. Automatic email delivery requires a server integration.

## Content and hosting

The site includes hair services for women and men, colour and styling, nails, eyelash extensions and pedicures for women and men. Journal sharing supports Facebook, WhatsApp, LINE and copying links. Thai language support is planned.

Fonts load from Google Fonts and illustrative photographs from Unsplash. The current Sites deployment is private, so shared story links require access until the site becomes public.

Static hosting should serve the `dist` directory. This GitHub snapshot does not include Sites credentials or deployment-specific project identity.
