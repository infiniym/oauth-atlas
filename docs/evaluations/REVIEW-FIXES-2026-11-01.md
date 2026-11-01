# Guided flow review: fixes and remaining limits

Reviewed and implemented locally on **1 November 2026**. This follows the supplied review of commit `ffa1ff7` and the [process proposal](../LIVE-GUIDE-PROCESS-PLAN.md). It does not describe a refreshed hosted deployment.

## Are the criticisms fair?

**Yes, the six principal findings are relevant and fair.** The saved Linear interaction and the conditional metadata-sharing failure are particularly strong diagnoses. The review distinguishes current implementation from proposed work and distinguishes synthetic counterexamples from errors observed in actual saved plans. That is the correct standard.

Three qualifications remain important:

- A synthetic read/delete or metadata example proves the implementation permits an error. It is not a measured incidence rate for all generated guides.
- Historical and fresh timings describe different requests and failures. They should not be combined into a universal average or price estimate.
- No successful provider OAuth connection or developer study has been demonstrated. This work fixes generation behavior and internal consistency; it does not establish provider acceptance, universal applicability or measured usability.

The generic planner and common UI are worth retaining. The review does not justify a rewrite or a Linear-only workaround.

## What changed

| Finding | Implemented correction | Evidence |
| --- | --- | --- |
| Expensive confirmation loop | Name discovery returns an identity checkpoint before documentation crawling or model planning. Existing pending questions are returned with zero network calls. A compact requirements response batches consequential choices; answered requests proceed to a guide, with any new ambiguity localized as a blocker. | Exact saved Linear replay and new workflow regression cases. |
| “Mapped” versus unresolved explanations | Documented mapping, unresolved mapping and untested execution are represented separately. Explicit unresolved explanations downgrade the label. A failed semantic review does not certify access. | Saved-record adapter and semantic-review regression cases. |
| Genuine citation used for a wrong conclusion | Local checks reject clear read-to-write/delete contradictions. Coverage references explicit requested actions and relationship evidence; a separate model review checks support, omitted actions and conflicting uncertainties. | Read/delete counterexample is rejected; incomplete review fails closed. This review is an additional fallible check, not semantic proof. |
| Share changes the visible decision | The server selects metadata, computes and stores the reviewed plan before display. Share and export use that stored output. Research plans freeze their adapted output at generation; legacy records freeze on first canonical read. | Synthetic live-metadata custom route remains custom; real Gmail/Slack/GitHub API round-trips return identical output. |
| Blockers and prerequisites disagree with next action | Steps carry IDs, dependencies, requested-action IDs and targeted blockers. The next action skips blocked tests; independent preparation remains available. Prerequisites appear with preparation/testing rather than all being placed under launch. | Blocked-test, missing-dependency, cycle and prerequisite-placement checks. |
| Request lost during unfamiliar-provider handoff | Both paths retain 1,500 characters, with explicit validation instead of slicing. Unknown provider candidates survive intake. Audience, full description and prohibitions reach saved processing and final interpretation. | Long request with a terminal prohibition survives routing/storage; real intake detects Linear as an unfamiliar-provider candidate. |

The processing UI uses **Continue**, **Continue with this provider**, and **Continue to my guide** at their respective stages. It shows the current work in the same workspace instead of rendering the original form during generation.

## Processing, recovery and duplicate submissions

`guide_jobs` stores the request, current outcome, timed progress events, evidence/planning checkpoints, attempt metrics and a processing lease. Creation uses an idempotency key; equivalent continuation answers use the same operation even when their object-key order changes. An atomic lease prevents concurrent duplicate processing. Opening a completed operation returns its saved outcome without a new model request.

The UI saves `/live-guide?job=…` before processing begins. Reloading reconnects to that process. A process that loses its runtime becomes **interrupted**, retains its available evidence and requires an explicit retry. Completed planning and reviewed mappings can be resumed without repeating them.

This is durable **progress storage**, not an unlimited background execution service. A Worker or computer can stop while an external API call is in flight. The external call might already have incurred tokens. Finite runtime retention and atomic local leases cannot guarantee exactly-once external billing after such an interruption. The implementation does not silently retry ambiguous work or promise that `waitUntil` runs indefinitely. See [Cloudflare's execution-context limits](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil).

## Model contract and cost boundaries

Haiku 5.5 still uses adaptive thinking at medium effort. Thinking was not disabled.

The expanded nested structured-output schema was rejected by the real API as too large. A JSON-string plan envelope also exhausted output budgets in development tests. The final implementation uses:

1. A small structured requirements task, with a 4,096-token output limit and a compact source subset.
2. A detailed JSON plan with strict local schema, citation, permission, destination and dependency checks; one bounded repair is available. The final JSON is not constrained by the provider's oversized grammar.
3. A separate compact, fallible action-to-permission review. Missing or contradictory support becomes unresolved.

A fully specified request therefore normally incurs the small requirements task as well as detailed planning and access review. This is a conscious tradeoff, not a claim that the ordinary journey always uses one model call. It avoids generating discarded full plans to discover questions.

Only material setup/API-test gaps trigger automatic targeted follow-up. Launch-only policy gaps remain visible instead of forcing another full-plan round before useful preparation can be shown. HTML/Markdown aliases are deduplicated before reading. API references for actual resources outrank similarly named count endpoints.

## Testing

**163 automated cases pass**, including 25 new review regressions. TypeScript checking and the production Worker build pass. The new process migration was applied to local D1.

The new cases use actual SQLite tables to test persistent job identity, atomic duplicate-processing protection, replays, checkpoints, stale leases and frozen output. They also cover the six counterexamples, request preservation, missing action coverage, API-test specifications, failed semantic checks and preparation independent of launch-policy research. They do not merely assert that a question was stored.

Real server checks confirm:

- Gmail, Slack and GitHub are computed and saved through the server-owned path. GET returns exactly the plan returned at creation, including its metadata basis.
- Replaying a completed Linear processing operation returns its saved outcome and unchanged attempt history.
- Unknown-provider intake retains the Linear candidate instead of losing it when the reviewed-provider field is null.
- Built homepage, processing routes and canonical plan endpoints return HTTP 200.

## Live results and honest limits

These are individual observations, not a latency benchmark. Development retries, raw-format experiments and runtime interruptions are recorded separately from stable built-preview observations; failed calls are not evidence of a successful guide.

| Observation | Result |
| --- | --- |
| Exact name-only Linear request during flow validation | The final built-preview replay returned provider identity in about 1.9 seconds with zero model calls. One 5.2-second model call then returned the action and actor questions together; that stage took about 13.3 seconds including documentation work. The whole sequence, excluding user answering time, took about 15.4 seconds. The initial full-plan responses were no longer needed to expose those prerequisites. |
| Read-only Asana continuation during development | Reached a provisional guide with an actual task-read step, rather than only consent/token checks. It still took about 157 seconds across model work and a bounded follow-up. This is not a claim that latency is solved. |
| Fully specified read-only Linear, stable built preview | About 66 seconds, no clarification loop. Returned useful preparation and explicitly unresolved issue-read mapping/API specification. No viewer query was represented as a successful issue-read test. Saved guide: `lg-e720c3b6-e786-41ed-a34e-abfed606d483`. |
| Public API, stable built preview | About 37 seconds. Included a concrete `GET https://jsonplaceholder.typicode.com/posts/1` test and documented no-OAuth access, with no invented provider registration. Saved guide: `lg-02353565-3b56-4c8d-8039-0943ab8818fc`. |
| Held-out GitLab deployment choice and continuation | The requirements pass asked GitLab.com versus customer-hosted deployment. After selection, the built preview produced a partial guide in about 100 seconds, with unresolved project/MR mappings and blocked API tests. This exposes the retrieval/semantic limit rather than supporting a universal reliability claim. Saved guide: `lg-abc6b366-d98f-4d92-87ec-1c15f0be8cea`. |

The stable Linear and GitLab partial results matter: the product now exposes unsupported action specifications, but the reader still does not reliably establish every requested endpoint across unfamiliar documentation. Preparation can be useful while the central API test remains blocked. Improving that evidence coverage and reducing final-planning latency remain substantive work; they are not fixed by a passing test suite or by more confident prose.

Some development model requests were truncated or interrupted, including requests whose observed wall time exceeded active-time deadlines while the development runtime was being restarted/reloaded. Those attempts must not be hidden in a performance average or treated as successful trials. The final preview uses the built Worker, without development hot reload during guide generation. Retry history and cumulative counters record available completed attempt telemetry; an interrupted in-flight call can have unreported usage.

Browser automation was disabled in Work settings for this revision. No fresh visual-browser, mobile interaction or developer-comprehension verification is claimed. No provider app was registered, no real OAuth token was exchanged, and no customer action was executed. Those limitations remain fair criticisms of validation breadth, rather than features that a local generation patch can certify.
