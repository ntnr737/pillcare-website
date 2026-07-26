# PillCare Website + Admin Panel

**pillcare.in** — Marketing website and admin panel for PillCare Reminder.

## Structure

```
/
├── index.html          ← Main website (pillcare.in)
├── support.html        ← Support page
├── privacy.html        ← Privacy policy
├── delete-account.html ← Account deletion page
├── admin.html          ← Admin dashboard (pillcare.in/admin.html)
├── assets/
│   └── pillcare-logo.png
└── README.md
```

## Admin panel

Access at: `https://pillcare.in/admin.html`

Protected by admin secret key (set as `ADMIN_SECRET` in Google Cloud Secret Manager).

Features:
- User analytics (total users, adherence, feature usage)
- Subscription management (upgrade/downgrade any user)
- Per-user feature flag overrides
- Revenue and MRR tracking

## Deployment

Upload all files to your hosting provider root directory.
The website is pure static HTML — no build step required.

## Backend

Admin panel connects to:
`https://pillcare-backend-1082668880575.europe-west1.run.app`
