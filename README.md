# OAuth Launch Advisor

Turn an integration idea into a sourced setup plan and first representative API test. Start with what the agent should do and what it must never do; then choose an app model, understand the actual permission boundary, and separate testing from customer launch.

Reviewed Gmail, Slack and GitHub rules and live research for unfamiliar providers share one desktop experience, immutable saved plans and Markdown export. The dated 1,694-entry directory is discovery coverage, not 1,694 validated guides.

**Release status:** local validation is in progress. Publication to Sites and GitHub was deferred by the user on 3 November 2026; Vercel is a later step. The existing public demo and repository main are earlier candidates. Use the [local release evaluation](docs/evaluations/LOCAL-2026-11-03.md) for the selected source, exact outcomes and verification boundaries.

## Run locally

Requires Node 22.13+, npm, Python 3 and Bash for the request-verification tests. Reviewed rules work without credentials. For model-powered live guides, copy `.dev.vars.example` to the ignored root `.dev.vars` and configure `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` and an exact `ANTHROPIC_MODEL` supporting adaptive thinking and structured outputs. The evaluated model is `claude-haiku-5-5`. Keep keys server-side.

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Initialize an **empty** local database once (do not reapply SQL to an existing store):

```sh
for migration in drizzle/0000_orange_wallop.sql drizzle/0001_groovy_mister_fear.sql drizzle/0002_romantic_lockheed.sql drizzle/0003_simple_vulcan.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration"
done
npm start -- --port 5187 --persist-to .wrangler/state
```

Open [localhost:5187](http://127.0.0.1:5187). `npm start` loads the root `.dev.vars` by absolute path. Restart after binding changes. `/api/release` exposes the built source commit and prompt version; rebuild after code changes. The development command is `npm run dev -- --port 5187`.

## Three starting journeys

- **Gmail:** compare read-and-draft with send-only. Permissions and launch consequences change; the draft grant also permits sending.
- **Slack / GitHub:** compare person versus app identity and pilot versus public distribution; inspect GitHub's selected-repository installation and Contents read boundary.
- **An unfamiliar app:** enter a name or ordinary official documentation URL. Try Notion: “Read titles and content of pages each customer explicitly shares. Read only; never create or modify pages.” Confirm consequential setup choices, then inspect the cited requests, required inputs, response and boundary check.

The planner researches public facts and automatically retrieves missing evidence within bounded work. **Find missing request** and **Add documentation** update a selected action while preserving answers, other actions and earlier versions. Reloading reconnects to the saved job. Personal checkmarks advance the next action; a reported check is never treated as verified execution.

## Evidence and scope

[Current evaluation](docs/evaluations/LOCAL-2026-11-03.md) · [Exact cases and retained attempts](docs/evidence/completion-2026-11-02/cases.json) · [Diagnostic corrections](docs/evidence/completion-2026-11-02/DIAGNOSTIC-NOTES.md)

Acceptance inspects real model output and parses each generated request with dummy inputs, including method, URL, headers and body. It does not call provider APIs. The product supplies instructions; developers register their apps, authorize accounts, run requests and obtain applicable approvals. No real provider account connection or completed approval is claimed.

The selected slice targets a desktop developer workflow. The larger guide library, private workspaces and a deployment migration are outside this release. Historical evaluations retain their original failures and dated hosts; they are not claims about the final local code.

[Product overview](docs/SUBMISSION-OVERVIEW.md) · [Submission notes](docs/SUBMISSION-NOTES.md) · [Architecture](docs/ARCHITECTURE.md) · [Live workflow](docs/LIVE-GUIDE.md) · [Walkthrough](docs/PRODUCT-WALKTHROUGH.md)
