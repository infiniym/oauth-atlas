# OAuth Launch Advisor

Turn an integration idea into a sourced OAuth setup and approval guide. Start with what the app should do and what it must never do, then follow registration, redirect, consent, credential and permission instructions with a concrete next action. The guide distinguishes a representative test from customer launch, provider review, marketplace listing and customer-admin policy.

The desktop slice includes reviewed Gmail, Slack and GitHub assessments and live research for unfamiliar providers from a name or ordinary official URL. Saved plans, edits, personal progress, citations and Markdown export use one common guide. The dated 1,694-entry catalog supports discovery.

The candidate source is on [codex/submission-readiness](https://github.com/infiniym/oauth-atlas/tree/codex/submission-readiness). The focused core repair has 378 passing tests and clean local/Vercel production builds. The three live acceptance cases remain incomplete, and the configured Anthropic account has reached its API usage cap. Vercel account access and final public and desktop verification are pending. The earlier Sites demo contains an older version. [Current acceptance evidence](docs/evaluations/SUBMISSION-2026-11-09.md)

## Run locally

Requires Node 22.13+, npm, Python 3 and Bash for the existing request checks. Reviewed assessments work without model credentials. Copy `.dev.vars.example` to the ignored `.dev.vars` and configure `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL=claude-sonnet-5-5` for live generation. Keys stay on the server.

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Initialize an empty local D1 store once. Use a separate persistence directory when reproducing these commands.

```sh
for migration in drizzle/0000_orange_wallop.sql drizzle/0001_groovy_mister_fear.sql drizzle/0002_romantic_lockheed.sql drizzle/0003_simple_vulcan.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration"
done
npm start -- --port 5187 --persist-to .wrangler/state
```

Open [localhost:5187](http://127.0.0.1:5187). Restart the preview after rebuilding. `/api/release` reports the built commit, guide fingerprint, configured model and storage backend. `npm run dev -- --port 5187` starts development mode.

## Vercel setup

`npm run build:vercel` compiles the existing Next.js routes into `.next-vercel`. Local Vinext retains D1. Vercel uses persistent Neon Postgres through the same parameterized storage operations. Configure `DATABASE_URL` and the three model variables above as server-side Vercel environment variables. Initialize `db/postgres.sql` with `npm run db:postgres` in a process with `DATABASE_URL` available. An ignored `.env.local` can be used with `node --env-file=.env.local scripts/migrate-postgres.mjs`.

The checked-in Vercel configuration supplies install and build commands. Use an existing or free database and the intended Vercel account, then deploy this branch. Verify `/api/release`, a fresh anonymous live journey and persistent sharing on the public URL. [Vercel runtime preflight](docs/evidence/submission-2026-11-09/PREFLIGHT.md)

## Try the focused flow

- Compare Gmail read-and-draft with send-only. The selected permissions and launch consequences change. The draft grant also allows sending.
- Compare Slack person/pilot with app/public distribution, then inspect GitHub's selected-repository and Contents read boundary.
- Enter an unfamiliar app name or official URL. Ask for read-only access to the connected person's data, confirm consequential choices, and inspect registration, authorization, permissions and launch guidance.

Live jobs save sources, confirmed choices and completed planning between stages. Reload reconnects to the saved process. An explicit retry resumes unfinished work. Credit, account usage-cap and credential failures preserve completed work and identify the owner action needed before retry. A transient starting-page failure can search for another readable page on the same provider's domain, within the existing time budget. Adding official documentation reopens the affected setup research. Sharing preserves a dated snapshot, while editing creates another version.

Resource API examples are supplementary and labeled as illustrative. Invalid examples are omitted with a reason. Missing core registration, authorization, permission or launch evidence prevents setup readiness. Workload guidance counts the documented setup tasks and states assumptions. Published applicable review times are cited, and unpublished durations remain unknown. Developers register apps, implement callbacks, perform consent and obtain approvals.

[Declared acceptance cases](docs/evidence/submission-2026-11-09/cases.json) · [Current results](docs/evaluations/SUBMISSION-2026-11-09.md) · [One-page overview](docs/SUBMISSION-OVERVIEW.md) · [Submission notes](docs/SUBMISSION-NOTES.md)
