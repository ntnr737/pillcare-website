# PillCare Reminder

A responsive showcase website for **PillCare Reminder**, a medication reminder and health-tech product by **League of X Technologies Pvt. Ltd.**

## About

PillCare Reminder is designed to make medication routines feel clearer and more manageable through:

- Timely medication reminders
- Daily dose tracking
- Flexible schedules
- Progress insights
- Caregiver-friendly experiences

## Run locally

No installation or build step is required.

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Project structure

```text
.
├── assets/
│   └── pillcare-logo.png
├── index.html          ← Main website
├── styles.css
├── script.js
├── admin.html          ← Admin dashboard (private)
└── README.md
```

## Admin panel

Access at: `https://pillcare.in/admin.html`

Protected by admin secret key. Features:
- User analytics and subscription management
- Per-user feature flag overrides
- Revenue and MRR tracking

## Deployment

Deployed via Cloudflare Workers/Pages on pillcare.in

## Company

Built with care by **League of X Technologies Pvt. Ltd.**

© 2026 League of X Technologies Pvt. Ltd.
