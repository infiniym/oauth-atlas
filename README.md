# OAuth Launch Advisor

[Hosted demo](https://oauth-launch-advisor.gharkagpt1.chatgpt.site/) · [Source](https://github.com/infiniym/oauth-atlas)

Help an agent developer choose an OAuth app model, understand required permissions and approvals, and reach a first representative API test. Reviewed Gmail, Slack and GitHub rules and live documentation research use the same guide layout, exports and dated share links. Apps can be researched without being in the catalog.

**Release status:** the app is published under its current owner account. See the [hosted release checks](docs/evaluations/HOSTED-2026-11-02.md) for the tested version and verification limits.

## Start here

- **Gmail:** compare reading customer email with sending only. Permission classification and security-assessment guidance change with the requirements.
- **Slack / GitHub:** compare an app's identity with a connected person's identity, pilot versus public distribution, and selected-repository installation.
- **An unfamiliar app:** enter its name or official documentation URL. Confirm meaningful choices, inspect sources and the requested API test, and resolve a missing action using **Find missing request** or **Add documentation**.

Saved sources, a documented request, a developer's reported check, and an executed test are different states. The product does not execute OAuth or obtain provider approval. Failed generation keeps work and explains recovery. Updates create new versions; existing shared links stay unchanged.

## Run locally

Node 22.13+ and npm. The reviewed rules work without credentials. Model-powered live interpretation requires server-side Anthropic configuration.

```sh
npm ci
npm test
npm run typecheck
npm run build
```

For an **empty** local database, apply these four migrations once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_orange_wallop.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_groovy_mister_fear.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_romantic_lockheed.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_simple_vulcan.sql
npm run dev -- --port 5173
```

Open `http://localhost:5173`. Local and hosted databases are separate. For live interpretation, copy `.dev.vars.example` to the ignored `.dev.vars` and set `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` and the exact `ANTHROPIC_MODEL` available to your account. Adaptive thinking remains enabled at medium effort. Restart after changing bindings. Never put keys in the browser, repository or submission.

## Try live research

Use **Notion** with `https://developers.notion.com/guides/get-started/authorization`, choose **Customers / other organizations**, and enter:

> A web app reads titles and content of Notion pages that each customer explicitly shares with this integration. Read content only. Never create or modify pages; no workspace administration.

A fresh local HTTP run produced two cited read requests with reviewed permission mappings in 79.3 seconds. This is a generated, unexecuted guide. The replacement host uses a fresh database; old shared links remain on the earlier host. Hosted checks are recorded in the release evaluation. The [local evidence](docs/evidence/final-2026-11-02/README.md) includes that run and failed cases. Fresh hosted Notion generation failed endpoint validation; adding its specific official reference produced a new guide with both read mappings reviewed. [Open that saved hosted example](https://oauth-launch-advisor.gharkagpt1.chatgpt.site/plan/lg-a66d41a6-cae4-4cb8-ac4e-0ad5674ea86c). It demonstrates the recovered output, not a new generation on every visit.

For reviewed providers, the first-test steps include backend JavaScript using an authorized Composio session. The proxy keeps tokens server-side and needs the Project API key's Proxy execute permission. Replace the test inputs, complete the Connect Link, then run the selected request in your backend. Sending, posting, reviewing and PR creation act on real test resources when you run them; use your own disposable test accounts. These examples have been checked with stubbed execution, not real provider accounts.

## Product decisions

1. Start with a few varied providers instead of claiming 100 complete guides. The 1,694-entry dated catalog is discovery breadth, not validated setup coverage.
2. Use reviewed rules for known requirements and source-checked research for unfamiliar apps. Managed OAuth availability does not prove a scope or token fits the requested feature.
3. Separate preparation, authorization, resource tests and customer launch. Missing evidence belongs to a particular action and fact; reminders are not hard prerequisites.
4. Keep hands-on effort separate from provider waiting, with assumptions and sourced durations. Unknown waiting time remains unknown.
5. Preserve answers, evidence and immutable versions. User reports never become claims of product execution.

## Validation and limits

See [the current hosted evaluation](docs/evaluations/HOSTED-2026-11-02.md), [live-guide architecture](docs/LIVE-GUIDE.md) and [architecture/configuration](docs/ARCHITECTURE.md). The evaluation records unsuccessful runs as well as useful outputs, and separates fixtures, real model calls, browser checks and actual OAuth execution.

Live stages have a 90-second budget, bounded page reading and anonymous quota. Unreadable or moved documentation and unsupported provider facts can still require a direct official URL. The independent model check is fallible. No real provider accounts were connected and no approvals were obtained. The 100-guide library, private workspaces and production hardening are outside this focused slice.

[Product overview](docs/SUBMISSION-OVERVIEW.md) · [Submission materials and form fields](docs/SUBMISSION.md) · [Product walkthrough](docs/PRODUCT-WALKTHROUGH.md) · [Decision log](docs/DECISIONS.md)
