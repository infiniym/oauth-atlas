# Shared launch plans and live research

The advisor is one product: describe an integration, confirm consequential choices, and get a launch plan. Reviewed rules cover Gmail, Slack and GitHub. Unfamiliar providers use public-source research. Both produce the `LaunchPlan` contract and render through the same application shell and `LaunchPlanView`.

## Try locally

1. Open `/` and enter a provider name or website plus the intended actions. Providers do not need to appear in the directory.
2. Reviewed providers open their relevant confirmation questions. An unfamiliar provider collects audience and an optional direct documentation URL, then researches the request. Name-only search can fail; supplying an official URL avoids ambiguous discovery.
3. Name-only provider identity is confirmed before documentation collection or a model call. Then a small requirements pass asks one batch of consequential choices. Existing pending questions are served without inference; answered requests proceed to a guide rather than another question loop.
4. Read the next available action, preparation fields, owner and completion criterion. Blockers are attached to steps; authorization alone cannot count as the requested API test. The same result sections separate hands-on work, provider wait, permissions, representative testing, launch requirements, blockers, drafts and sources.
5. Share or download the dated plan. `/plan/lp-…` saves reviewed output and inputs; `/plan/lg-…` reads an immutable research record. Older `/live-guide?id=…` links still work. Editing creates a new version; checkmarks remain local.

Reference notes are earlier scenarios, clearly labeled rather than represented as an assessment of the current request. Catalog membership alone does not prove OAuth availability, Composio compatibility or action coverage.

## One model configuration

Use ignored `.dev.vars` locally and equivalent server secrets when hosting:

```dotenv
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-5-5
LIVE_GUIDE_FIRECRAWL_KEY=
```

Restart the preview after changes. Intake and research resolve the same selected key/model. Anthropic uses adaptive thinking at medium effort for intake, requirements and independent access review, and low effort for provider facts and bounded test-instruction completion. Request assembly and display/setup-field corrections disable extra reasoning; the complete result still requires independent review. Targeted action repair uses medium effort. Thinking text is never persisted; telemetry records settings and token counts, using `mixed` when stages differ. The old `LIVE_GUIDE_ANTHROPIC_*` pair remains a compatibility alias only when the shared Anthropic pair is absent. `AI_PROVIDER=none` overrides it. Partial shared pairs never borrow the other half from legacy settings.

The OpenAI adapter currently supports reviewed-provider intake only. Selecting it never silently switches research to Anthropic: research returns partial evidence with an explicit adapter limitation. The current evaluated end-to-end configuration is Haiku 5.5.

The optional Firecrawl key enables rendered search/scrape. Without it, the public HTML/Markdown reader runs directly; JS-only, login-gated and blocked documentation can remain unreadable. Credentialed Firecrawl retrieval has controlled-response coverage but has not been exercised live here.

## Research and validation

- Initially reads up to eight content pages, with a 38-second reading deadline; indexes and short link pages aid discovery without consuming content slots. Material missing setup or API-test facts may trigger one targeted follow-up, up to three retained pages and 18 seconds. A precise empty-parameter gap can check up to six linked examples in parallel batches and retain the matching source text. Missing launch-only policy does not automatically trigger another full planning pass.
- Ranks scope/capability pages, distribution requirements and API references for the requested actions. Sibling provider domains and explicitly linked external documentation can be followed. External links are provenance, not proof of official ownership.
- Reads at most 8 MB per documentation response and selects up to 48,000 characters around relevant authorization, permission and resource-request sections. Saves bounded snapshots, URLs, dates, useful links and fingerprints. The model sees compact numbered passages, with short exact scope entries preserved. Saved snapshots remain server-side. Cross-domain redirects require confirmation of the documentation destination, which is screened again before reading.
- Each processing job has a 180-second hard budget across reading and model calls. Acceptance measures the complete user journey: 90 seconds for a normal guide, 180 seconds for one using bounded automatic recovery. Within it, the structured requirements pass has a 4,096-token output bound. Two smaller named contracts generate provider facts (7,000 tokens) and request steps (9,000 tokens), sharing a 75-second planning deadline and one correction. Accepted facts are saved before request generation, so a failed request stage can resume without repeating completed fact generation. The complete result still passes local schema, citation, route and access checks. A separate action/permission review has a 35-second bound. The outer job budget takes precedence. One 45-second initial fact call may use one concise retry within the same planning deadline. These bounds are not wall-time guarantees during machine sleep or runtime suspension.
- Checks schema, exact passage correspondence, selected permission identifiers, documented destinations, dependency references/cycles and published duration consistency. An independent semantic review checks action-to-permission support and omitted requested actions. Documented mapping and untested execution are separate labels; incomplete mapping reviews downgrade access rather than certifying it. These checks do not establish semantic applicability or provider acceptance.
- A review identifying missing fields in a named setup step can trigger one bounded correction of those prerequisite instructions and another independent review. Resource requests, grants, other steps and earlier versions remain intact. An unsupported request constant drives source retrieval; formatting correction repeats only fields still over their limit. Neither correction substitutes a successful provider response.
- Preserves signed thinking blocks only in an in-memory repair turn. Failure returns partial findings, no invented permission selection or setup sequence. A local OAuth limitation is never mechanically applied to the provider's entire product family.
- Separates provider review, marketplace listing and customer-admin approval; groups unresolved work by test, launch or follow-up consequence. Confirmed answers carry their full prompt and answer into refinements.
- Separates authorization actions from resource actions. Missing-evidence blockers identify an action and missing request or permission fact; legacy snapshots receive a versioned migration. Removing a duplicate authorization resource test preserves administrator prerequisites and redirects their dependencies to authorization.
- Uses HTTPS/DNS screening, redirect validation, bounded bodies, same-origin input and anonymous research limits (40 fresh operations per connection/hour). This is not resolver pinning or a security audit.

No app creation, authorization, token exchange, tool execution or provider approval has been performed by the planner. See [validation](VALIDATION.md) and the dated evaluations for actual runs and failures.

## Database

The normal migration journal adds `live_guides`, `live_guide_limits`, then `launch_plans`. Build first, then apply migrations once per fresh local database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_orange_wallop.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_groovy_mister_fear.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_romantic_lockheed.sql
```

The `guide_jobs` table in `drizzle/0003_simple_vulcan.sql` stores process state, retained evidence, progress events, attempt metrics and leases. Apply it with the same local D1 command above. Reloading `/live-guide?job=…` reconnects to the saved process. Duplicate submissions reuse a fingerprinted operation and atomic processing lease. Interrupted work is not retried automatically; an explicit retry reuses available checkpoints.

HTTP processing can continue briefly after disconnect using the runtime execution context. It is not an unlimited background worker: Cloudflare documents a finite post-disconnect lifetime for [`waitUntil`](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil). A suspended or terminated process may require retry; ambiguous external calls can already have incurred tokens. Exactly-once external billing is not claimed.

Reviewed plans are now computed and stored by the server using the selected metadata before display. Share and Markdown use that same result. Completed research also freezes the common plan at generation; old records receive a snapshot on their first canonical read.

Local and hosted stores are separate. The user deferred publication on 3 November 2026. The existing Sites host remains an earlier candidate; it is not evidence of the selected local release. See [current local results](evaluations/LOCAL-2026-11-03.md). Historical hosted results and old saved links are retained.
