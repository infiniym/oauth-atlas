# OAuth Atlas

**[Working experience](https://oauth-atlas.mossystar19.chatgpt.site) · [Source](https://github.com/infiniym/oauth-atlas)**

A developer field guide for the work between “the provider supports OAuth” and “our customers can connect.” Four researched examples and live research for unfamiliar apps. No API keys required.

![Responsive preview](docs/screenshots/preview.jpg)

## Try it

1. Compare **GitHub, Notion, Slack, and Gmail** in the library. Open a guide for its scoped launch plan, timing, blockers, handoffs, and sources.
2. Check off a step, save the guide, download Markdown, or copy its public share link.
3. Select **Research an app**. Enter `Linear` or an official website such as `https://www.todoist.com`. The agent fetches current sources and streams its real progress. Generated drafts get persistent public URLs.
4. Open **Evidence & sources** to see what was observed, corrected, and left unverified.

## Run locally

Requires Node **22.13+** and npm. Cloudflare's local Worker runtime is installed with dependencies. No cloud account, API key, or provider credentials are needed for local use.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_orange_wallop.sql
npm run dev -- --port 5173
```

Open `http://localhost:5173`. Apply that migration once per fresh local database. `npm start -- --port 5173` serves the production build locally. Local and hosted guide databases are separate.

```sh
npm test
npm run typecheck
npm run build
```

## Key decisions

- **Start with “do I need my own app?”** Managed OAuth may remove registration work. The app explains provider registration → integration configuration → each user's consent, then focuses on the custom-app path.
- **Four different launch risks, not four similar tutorials.** GitHub illustrates customer-admin gates; Notion separates optional listing from direct distribution; Slack exposes commercial eligibility and a long review; Gmail exposes restricted-data verification and assessment.
- **Separate work from waiting.** Setup effort is an author estimate with assumptions. Provider-published turnaround is separately cited and never represented as a launch SLA. Test and public-launch milestones differ.
- **Evidence is part of the product.** Each curated step links to official sources. Setup attempts, corrections, and unknowns remain visible. Checklist completion is the developer's local record, not proof of approval.
- **Live generation is honest and keyless.** A bounded, deterministic source-reading agent discovers a provider, follows public documentation, extracts evidence, identifies gaps, and builds a draft. It is **not an LLM**. It performs real network research; it does not return a cached example for unfamiliar inputs. If it cannot identify the provider or read sources, it asks for a direct docs URL. Unknown time and approval requirements remain unknown.
- **Share the guide, keep credentials out.** Generated guides are public and stored in D1. Browser-only saves and checklist progress remain local. Inputs explicitly request public information; never enter secrets.

## Implementation

React + TypeScript on Vinext/Vite, deployed as a Cloudflare Worker through Sites. D1 stores generated guide snapshots and anonymous hourly rate-limit counters. The frontend consumes an NDJSON progress stream and retrieves shared drafts by ID.

- `app/page.tsx`: library, launch plans, blockers, evidence, live research UI, export/share.
- `lib/research.ts`: source discovery, public-page reading, topic extraction and gap analysis.
- `data/guides.json`: normalized curated guides; `research/`: original agent dossiers.
- `scripts/prepare-guides.py`: regenerate curated data after research edits.
- `db/schema.ts` and `drizzle/`: persistent guide schema and migration.
- `docs/VALIDATION.md`: tested behavior, source checks, corrections, and limits.
- `docs/DECISIONS.md`: product rationale and path to 100 guides.

## Limitations

This is a working slice, not a completed 100-app library. Live drafts are less detailed than reviewed guides. The source-reader uses topic heuristics, a maximum of four successful source pages, and a 58-second deadline; search engines can block automation, JS-only pages may not render, and name matching can select the wrong provider. Supply the official docs URL for better results. It does not semantically resolve every policy, estimate unknown timing, or perform authenticated setup.

No OAuth token exchange, completed provider approval, or security assessment was performed. Agents reached public setup gates and inspected Google's client creation form without submission. No credentials were generated or retained. Requirements can change after the stated check date.

Preview safeguards include input bounds, public-HTTPS and DNS checks, redirect revalidation, response/time limits, and 10 runs per hour per connection. DNS checks are not resolver pinning. This does not constitute a hardened, large-scale research service. Production would need a maintained public-suffix list, stronger egress controls, global quotas, abuse handling, content revalidation, and draft moderation/retention controls.

Public drafts contain only the supplied app/use case and extracted public evidence. There is no user account or cross-device personal checklist. No generated guide is silently promoted into the reviewed library.
