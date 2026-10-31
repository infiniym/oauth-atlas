# Live guide integration and testing

The live-guide branch is merged into Atlas. The supported-provider advisor and unfamiliar-provider research run in the same app and database. The live-guide modules and CSS remain separate from the advisor rules.

## Try the combined experience

1. Open `/` for the Gmail, Slack and GitHub advisor. Its existing confirmation flow, timing guidance and deterministic rules remain intact.
2. Choose **Research an app** on the homepage, or **Research docs** on a catalog-only provider. Both open `/live-guide`; directory selections prefill the app name.
3. For a dependable public-source example, enter Linear and `https://linear.app/developers/oauth-2-0-authentication`, with “Read issues and add comments for customer workspaces.”
4. Generate the guide, inspect its evidence and open questions, then share or download Markdown. Reloading the saved URL opens the dated version. Fresh research creates another version.

Public search services can reject automated name-only searches. In that case the form asks for the official website or a direct documentation URL. An inaccessible source is not evidence of absent OAuth support.

## Optional server configuration

The live-guide credentials are separate from the advisor's description parser. Configure these in the ignored `.dev.vars` file and restart the preview, or provide equivalent Worker runtime secrets:

```dotenv
LIVE_GUIDE_ANTHROPIC_KEY=
LIVE_GUIDE_ANTHROPIC_MODEL=
LIVE_GUIDE_FIRECRAWL_KEY=
```

The Anthropic key and an exact structured-output-capable model ID enable interpretation of the saved documents for the use case. Missing credentials, refusal, truncation, schema errors, fabricated citation excerpts or unmatched scope identifiers preserve **Evidence only** findings. No firm permission selection or approval path is substituted.

Firecrawl is an optional search and rendered-page extraction adapter. Without its key, the bounded public HTML/Markdown reader runs directly. Both adapters have controlled-response tests. No live credentialed request was verified in this integration because these credentials are not configured.

## Database setup

The tables `live_guides` and `live_guide_limits` use the normal Atlas migration journal. Existing guide storage remains separate. After building, apply the added local migration:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_groovy_mister_fear.sql
```

Apply the original migration first for a fresh database. Local and hosted databases are separate. This integration was prepared for local testing; the public hosted version has not been republished.

## What the implementation checks

- Reads at most six substantive pages; documentation indexes do not consume content-page slots. Retrieval has a 42-second deadline; model interpretation has a 28-second deadline; the complete request is capped at 80 seconds.
- Records source URLs, retrieval dates and fingerprints of the exact text snapshots used by the model. Full snapshots remain server-side; the public guide contains metadata and short cited excerpts.
- Checks structured output, excerpt matches, exact permission identifiers and quoted published waits. These checks establish citation correspondence, not semantic correctness or provider acceptance.
- Separates provider review, marketplace listing and customer-admin approval. Missing developer choices suppress firm setup steps until answered.
- Refines answers against saved evidence, producing a new immutable guide version. Changed use cases require fresh research.
- Preserves unresolved effort and waiting time. Any hands-on estimate is labeled and requires assumptions.
- Checks HTTPS URLs, DNS answers, redirects and response size. DNS screening is not resolver pinning or a security audit.
- Keeps guides public to anyone with the link, with an explicit input notice. Checkmarks remain on the device and are excluded from exports.
- Does not infer managed OAuth or action coverage from a catalog name. An unknown toolkit does not receive generic Composio setup instructions.

Automated checks cover the advisor and live-guide workflows, network and storage failures, cancellation, schema/citation rejection, critical questions, refinement, sharing, exports and URL safeguards. Live-source checks and browser observations are recorded separately in the validation notebook. No provider app registration, token exchange or approval is claimed.
