# Shared launch plans and live research

The advisor is one product: describe an integration, confirm consequential choices, and get a launch plan. Reviewed rules cover Gmail, Slack and GitHub. Unfamiliar providers use public-source research. Both produce the `LaunchPlan` contract and render through the same application shell and `LaunchPlanView`.

## Try locally

1. Open `/` and enter a provider name or website plus the intended actions. Providers do not need to appear in the directory.
2. Reviewed providers open their relevant confirmation questions. An unfamiliar provider collects audience and an optional direct documentation URL, then researches the request. Name-only search can fail; supplying an official URL avoids ambiguous discovery.
3. Confirm only developer choices that change app model, permissions or distribution. Inferred provider identity is confirmed separately, without dropping deferred questions.
4. Read the next action, preparation fields, owner and completion criterion. The same result sections separate hands-on work, provider wait, permissions, representative testing, launch requirements, blockers, drafts and sources.
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

Restart the preview after changes. Intake and research resolve the same selected key/model. Anthropic uses adaptive thinking at medium effort in both paths. Thinking text is never persisted; research telemetry records settings and token counts. The old `LIVE_GUIDE_ANTHROPIC_*` pair remains a compatibility alias only when the shared Anthropic pair is absent. `AI_PROVIDER=none` overrides it. Partial shared pairs never borrow the other half from legacy settings.

The OpenAI adapter currently supports reviewed-provider intake only. Selecting it never silently switches research to Anthropic: research returns partial evidence with an explicit adapter limitation. The current evaluated end-to-end configuration is Haiku 5.5.

The optional Firecrawl key enables rendered search/scrape. Without it, the public HTML/Markdown reader runs directly; JS-only, login-gated and blocked documentation can remain unreadable. Credentialed Firecrawl retrieval has controlled-response coverage but has not been exercised live here.

## Research and validation

- Initially reads up to eight content pages, with a 38-second reading deadline; indexes and short link pages aid discovery without consuming content slots. Missing registration, permissions, identity or distribution facts may trigger one targeted follow-up, up to three new pages and 18 seconds.
- Ranks scope/capability pages, distribution requirements and API references for the requested actions. Sibling provider domains and explicitly linked external documentation can be followed. External links are provenance, not proof of official ownership.
- Saves bounded text snapshots, URLs, dates, useful links and fingerprints. The model sees compact numbered passages, with short exact scope entries preserved. Full saved snapshots remain server-side.
- Interpretation and one repair share a 75-second deadline per research round. Total request bound is 220 seconds. Thinking and final output share the 16,000-token output limit. A follow-up is bounded; unresolved facts remain explicit.
- Checks schema, exact passage correspondence, exact selected permission identifiers, documented destinations and published duration consistency. These checks do not establish semantic applicability or provider acceptance.
- Preserves signed thinking blocks only in an in-memory repair turn. Failure returns partial findings, no invented permission selection or setup sequence. A local OAuth limitation is never mechanically applied to the provider's entire product family.
- Separates provider review, marketplace listing and customer-admin approval; groups unresolved work by test, launch or follow-up consequence. Confirmed answers carry their full prompt and answer into refinements.
- Uses HTTPS/DNS screening, redirect validation, bounded bodies, same-origin input and anonymous research limits (12 per connection/hour). This is not resolver pinning or a security audit.

No app creation, authorization, token exchange, tool execution or provider approval has been performed by the planner. See [validation](VALIDATION.md) and the dated evaluations for actual runs and failures.

## Database

The normal migration journal adds `live_guides`, `live_guide_limits`, then `launch_plans`. Build first, then apply migrations once per fresh local database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_orange_wallop.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_groovy_mister_fear.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_romantic_lockheed.sql
```

Local and hosted stores are separate. This revision is for the combined local preview; it has not been published to the hosted site.
