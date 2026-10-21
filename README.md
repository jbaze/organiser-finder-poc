# Organiser Finder (POC)

A clickable proof of concept for an event organiser lead sourcing and outreach tool. It shows the full workflow: search sources, collect and deduplicate organisers, review and approve them, push approved leads to an outreach campaign, and follow replies, bounces and unsubscribes.

All data is fake. There is no real scraping, no real email sending, no external API calls and no database. Everything runs in the browser.

## What you can click through

| Page | What it shows |
| --- | --- |
| Dashboard | Pipeline counts, recent runs, and a health check per source. One source is flagged because the latest run collected 80% fewer records than the previous one. |
| Searches | Pick states, suburb or postcode with radius, organiser types and sources. "Run now" walks through queued, scraping, normalising, deduplicating, enriching, verifying and done in about 8 seconds, then adds a few new organisers. "Schedule" saves it as a daily or weekly job. |
| Schedules | Saved searches with enable/disable, delete and next run time. |
| Runs | Run history (expected, collected, new, duplicates merged, errors) with a drawer showing a mock worker log. |
| Organisers | Filter by state, type, source, score range, email status and review status. Sort by score, bulk approve or reject, export CSV. The detail drawer shows the merged record, each source record side by side with differences highlighted, contacts with verification badges, signals, score breakdown, activity history, and approve/reject/edit. |
| Match review | 15 uncertain pairs shown side by side. Amber cells differ; blue cells differ only in formatting. "Merge" combines the records, "Keep separate" leaves them apart. |
| Outreach | Product to campaign mapping. "Push approved leads" previews what will be pushed and what is skipped and why (suppressed, invalid email, no contact, no campaign), then marks the pushed leads "In Instantly". A feed shows simulated replies, bounces and unsubscribes arriving every few seconds, each marked "Synced to CRM". |
| Suppression list | Unsubscribes, bounces and manual entries. Add or remove entries and see which approved leads are blocked from the next push. Bounces and unsubscribes from the feed are added automatically. |
| Settings | Add a product/audience (it appears on Outreach), enable sources and set the consent basis for each, see what "Add source adapter" involves, set data retention and sender details, and reset the demo data. |

Changes are saved in the browser's localStorage, so the demo survives a page reload. If storage is blocked (for example in a private window) the app still works and resets on reload. Use Settings > Reset demo data to start over.

## Simulated here vs the real system

| Area | In this POC | In the real system |
| --- | --- | --- |
| Collection | A seeded generator produces about 150 Australian organisers from 3 mock sources | One adapter per source, using Cheerio for static pages and Playwright for pages that need a browser, running in a Node worker |
| Jobs and schedules | Browser timers move a run through its stages | BullMQ queue on Redis, with repeatable jobs for schedules, retries and rate limits per source |
| Storage | Zustand store saved to localStorage | PostgreSQL holding raw source records, merged organisers, contacts, runs, decisions and the suppression list |
| Deduplication | The same normalisation and match scoring code as the real system would use (`src/lib/normalise.ts`), applied to mock data | Same approach on real records, with thresholds tuned on real data: auto-merge above 85%, human review between 55% and 85% |
| Email verification | Each contact has a fixed valid / risky / invalid status | A verification API (for example ZeroBounce, NeverBounce or Kickbox) called during enrichment |
| Scoring | Events per year, typical attendance and days since last event, combined into 0 to 100 (`src/lib/scoring.ts`) | Same idea, with signals taken from the collected pages and weights tuned with the sales team |
| Outreach | "Push" changes a status. Replies, bounces and unsubscribes are random events every 7 seconds | Instantly API v2 to add leads to campaigns, and Instantly webhooks for replies, bounces and unsubscribes |
| CRM | A "Synced to CRM" badge appears after a short delay | HubSpot or Attio API: create or update the company and contact, and log the reply as an activity |
| Compliance | Settings screen and reminders only | Consent basis stored per source and record, sender identification and unsubscribe enforced on every campaign, retention job deleting stale records |

## Run it locally

All Node tooling runs inside Docker, so nothing is installed on your machine. You need Docker Desktop (or Docker Engine with Compose).

```bash
docker compose up
```

Then open http://localhost:3000. The first start installs dependencies into a Docker volume, which takes a minute or two.

Other commands, all run inside the container:

```bash
docker compose run --rm app npm test
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run build
```

`node_modules` and `.next` live in named Docker volumes, not in the project folder. To start completely fresh:

```bash
docker compose down -v
```

## Deploy to Vercel

The app needs no environment variables and no backend. Vercel builds it on its own servers, so nothing has to be installed locally.

1. Push this repository to GitHub (it is already set up if you cloned it from there).
2. Sign in at https://vercel.com with your GitHub account.
3. Click "Add New..." then "Project".
4. Find the `organiser-finder-poc` repository and click "Import". If it is not listed, click "Adjust GitHub App Permissions" and give Vercel access to it.
5. Leave the settings as detected: Framework Preset "Next.js", Root Directory `./`, Build Command `npm run build`, no environment variables.
6. Click "Deploy". After about a minute Vercel shows the live URL, for example `https://organiser-finder-poc.vercel.app`.
7. Every push to the `main` branch deploys again automatically. Pushes to other branches get their own preview URL.

To keep the demo private, turn on Vercel Authentication under Project Settings > Deployment Protection, or share a preview URL only with the client.

## Project layout

```
src/
  app/                  One folder per page (App Router), all client components
  components/
    ui/                 shadcn/ui style primitives on Radix
    app-shell.tsx       Sidebar, demo banner, dark mode, outreach simulator
    organiser-detail.tsx
    run-progress.tsx
    shared.tsx          Badges, page header, chip multi-select
  data/
    reference.ts        Suburbs, sources, products and campaigns
    generate.ts         Seeded mock data generator
    seed.ts             Builds the full demo dataset
  lib/
    types.ts            All domain types
    normalise.ts        Normalisation and dedup helpers (tested)
    push.ts             Push filter: which approved leads go to Instantly (tested)
    scoring.ts          Score from signals
    health.ts           Source health check
    csv.ts, format.ts, utils.ts
  store/
    demo-store.ts       Zustand store with simulated jobs and webhooks
    safe-storage.ts     localStorage wrapper that never throws
```

## Tests

Vitest covers the normalisation and dedup helpers, the push filter (suppressed and invalid emails are excluded) and the seed data (counts, fake domains, match pairs, determinism).

## Notes

- `npm audit` reports one high severity issue in the copy of PostCSS bundled inside Next.js 15. It only affects build-time CSS processing of untrusted CSS, which this project does not do. The fix is Next.js 16.
- Suburbs and postcodes are real places so the data looks plausible. Every organiser name, phone number, website and email is made up, and all websites and emails use `.test` domains, which can never resolve.
