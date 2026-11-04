# Architecture and configuration

## Deterministic rules versus AI

**Deterministic:** typed capability mappings, app-model selection, managed/custom suitability, permission classification, conditional dependencies, explanation IDs, checklist and export. Rules include source IDs and check dates. Tool restrictions are kept separate from provider grants. Managed OAuth availability never proves the necessary scope/token fit.

**Optional AI:** the server-side Anthropic Messages or OpenAI Responses structured-output adapter interprets the use-case description into known capabilities and unresolved questions. It cannot supply new scopes or approval rules. Model output is schema-validated and always editable. No key, invalid output, refusal, rate limit or timeout preserves the structured workflow with labeled local keyword suggestions.

**Live research:** `/live-guide` performs public discovery and reads up to eight content pages plus one targeted follow-up of up to three pages. The shared Anthropic configuration enables structured interpretation with checked source excerpts, exact permission identifiers, documented destinations, action coverage and step dependencies. A small requirements pass batches questions before detailed generation. Saved process URLs reconnect instead of silently submitting new work. A separate semantic check remains fallible and never claims execution success. Without it, evidence-only findings remain explicit about unresolved timing, permissions and approvals. The older four-page `/api/research` reader remains available for compatibility.

## Optional configuration

Local and historical hosted evaluations record real Haiku calls. Publication is deferred by the user as of 3 November 2026; the existing public host is an earlier candidate. See the current local evaluation for the selected source and outcomes. Authenticated Composio metadata and credentialed Firecrawl retrieval remain unverified. No API key is required for reviewed rules or basic source collection.

| Server-side binding | Behavior |
| --- | --- |
| `AI_PROVIDER` | Select `anthropic`, `openai`, or `none` (local suggestions only). If omitted, exactly one complete key/model pair is selected; two complete pairs require an explicit selection. |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | Enable intake and live research using the same Anthropic model. Supply an exact model ID with adaptive thinking and structured-output support. No model is silently selected. |
| `OPENAI_API_KEY` + `OPENAI_MODEL` | Optional alternative for intent interpretation. Choose a model in your account supporting Responses structured outputs; no model is silently selected. `store: false`; input is the developer's description and a constrained capability map. |
| `COMPOSIO_API_KEY` | Read `/api/v3.1/toolkits/{slug}` metadata for the selected assessment/Slackbot variant. Checks exact `composio_managed_auth_schemes`; does not infer granted scope coverage. |

For Anthropic, the server-side configuration is:

```dotenv
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_in_the_ignored_local_file
ANTHROPIC_MODEL=claude-haiku-5-5
```

The adapter calls Anthropic directly with a fixed capability schema via `output_config.format` and API version `2026-10-21`. It accepts complete message responses only, then checks the known provider/capability mapping locally. Intake has a 25-second deadline and 4,096-token bound, with adaptive thinking at medium effort. Live research has separate task budgets using the same model: see [the bounded workflow](LIVE-GUIDE.md). Refusal, truncation, unsupported output, timeout or an API error returns local suggestions. It never silently sends the description to another vendor. See [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) and [Messages API version migration](https://platform.claude.com/docs/en/api/migration-2026-10-21).

For Vite/Cloudflare development, copy [.dev.vars.example](../.dev.vars.example) to an ignored `.dev.vars` and provide server-side values using Cloudflare's local bindings facility. Configure equivalent Worker runtime secrets for hosting. Never put these values in client bundles or `NEXT_PUBLIC_` variables. Missing/failed metadata retains the dated docs snapshot instead of declaring managed OAuth unavailable. Restart the local server after changing bindings. Optional AI has an anonymous limit of 20 requests per connection/hour; live research has a limit of 40 fresh operations per connection/hour. Duplicate operations reuse their job and do not consume another generation.

## Architecture

React + TypeScript on the existing Vinext/Vite stack, built for the Cloudflare Worker runtime with a D1 store. The current release runs locally; Sites publication is paused and a future Vercel deployment has not been prepared. No framework replacement or new account system.

| Module | Responsibility |
| --- | --- |
| `components/advisor.tsx` | Discovery, assessment, recommendation, checklist, edit/share/export |
| `lib/advisor/types.ts`, `providers.ts` | Typed requirements, capabilities, official sources and dated metadata |
| `lib/advisor/requirements.ts`, `timing.ts` | Required setup choices, question relevance and scoped timing guidance |
| `lib/advisor/rules-engine.ts` | Compositional provider decisions with stable explanation IDs |
| `lib/advisor/assessment.ts` | Strict input validation, local intent suggestions, versioned share codec and progress keys |
| `lib/ai/config.ts` | Shared server-side model selection, explicit disablement and key/model pairing |
| `lib/plan/` | Common result contract, adapters, immutable snapshots and Markdown |
| `components/app-frame.tsx`, `components/launch-plan.tsx` | Shared shell and result experience |
| `lib/live-guide/` | Bounded research, evidence interpretation, refinements and saved source versions |
| `lib/advisor/intent-parser.ts` | Anthropic Messages/OpenAI Responses interpretation and local fallback |
| `lib/advisor/metadata.ts` | Current Composio metadata adapter and conservative snapshot fallback |
| `app/api/advisor/` | Bounded interpretation and metadata endpoints; secrets stay server-side |
| `lib/advisor/export.ts` | Input context, rule results, sources and unchecked checklist as Markdown |
| `data/catalog.json` | Dated names/links snapshot; `scripts/sync-catalog.mjs` refreshes it from public docs |
| `lib/research.ts`, `app/api/research/` | Existing live source-reading flow and streamed progress |
| `data/guides.json`, `research/` | Original normalized reference guides and agent dossiers |

Refresh catalog metadata with `node scripts/sync-catalog.mjs`. It refuses incomplete extraction rather than replacing a valid snapshot. This is a maintainer command, not automated monitoring.
