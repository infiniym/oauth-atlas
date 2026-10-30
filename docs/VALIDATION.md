# Validation notebook — 29 October 2026

## Provider investigation

Independent research agents used official provider pages and attempted accessible setup paths. Their original dossiers are in `research/`; normalized guide data retains source IDs. There are 28 official-source records across the four guides (some sources support multiple claims).

| Sample | Checked against | What changed or remained uncertain |
| --- | --- | --- |
| Gmail | Scope table, production-readiness/verification guides, FAQ, current client help, live Web application client form | `gmail.readonly` and `gmail.metadata` are restricted. Send-only is sensitive and changes the feature. Current console has an AI-agent client declaration. Review and assessment are separate dependencies; no sequential launch date is implied. |
| Slack | Distribution guide, Marketplace guidelines/review guide, Sept 2026 installation-threshold changelog | Current requirement is 10 active workspace installations through review. Public distribution enables pilots; commercial suitability and Marketplace requirements remain. MCP-only functionality can be a product blocker. |
| Notion | Public-connections guide, authorization, Marketplace listing | Marketplace listing is optional. The 5–10 business-day range is first response to listing submission, not required OAuth-launch wait. Installation scope is a creation-time decision. An older caption conflicts with newer prose; the ambiguity is retained. |
| GitHub | Registration, authorization, scopes, organization approval and app-model comparison | Current docs allow up to 10 callback URLs, recommend PKCE, and describe expiring tokens. A successful user login does not prove access to a restricted organization. No general review stage is inferred from the standard path, not guaranteed for every account. |

### Actual setup attempts

- **Google:** reached Clients → Create client → Web application and inspected Name, origins, redirects, AI-agent declaration and propagation note. Stopped before Create. No credentials created or copied.
- **Slack:** public app dashboard required sign-in before app creation.
- **Notion:** developer portal redirected to Notion login.
- **GitHub:** New OAuth App redirected to GitHub login; browser state and HTTP redirect were checked.

No token exchange, API action on user data, provider submission, completed approval, or security assessment was performed. Active-effort estimates are planning estimates, not timed setup results. Published waits are provider guidance, not measured outcomes.

## Live research checks

The live source-reader has no LLM/API credentials or hardcoded unfamiliar-app answers. A real network request executes discovery and source reading.

- **Linear by name:** public search resolved official docs; the browser showed real progress, a generated draft, live source excerpts and observed scope identifiers. Provider identity is explicitly inferred.
- **Linear by website:** local Cloudflare Worker fetched the homepage, provider `llms.txt`, OAuth documentation and customer third-party-app approval documentation; generated and persisted a draft, then fetched it by its share ID.
- **Todoist by website:** the agent found an official API source after oversized documentation responses were safely rejected. Failures and evidence gaps remained in the output.
- First Worker test caught unsupported `fetch` redirect mode in the DNS check. Changed it to manual handling and re-ran the complete API flow successfully.
- A second review caught overly strong “flow documented” wording from keyword matches. Live output now says OAuth-related material was found and keeps flow applicability unresolved. A negative-OAuth test prevents a provider denial from becoming a registration plan.
- Homepage context with no relevant OAuth/registration/approval signal is excluded from retrieved evidence highlights.

These checks establish a working research flow for samples, not universal provider coverage. Search challenges, JS rendering, provider domain moves, documentation ambiguity and bounded traversal can leave missing information.

## Application verification

- **13 automated tests:** public URL validation; private DNS; unsafe redirects; input normalization; name-discovery failure; bounded source traversal and citations; excerpt limits; missing/negative OAuth evidence; customer-admin versus provider review; curated citation coverage; case-specific production boundaries.
- **TypeScript check:** passed.
- **Production Worker build:** passed.
- **Browser:** library and guide rendering; live Linear generation; checklist survives reload; save/unsave; blockers and evidence tabs; public share dialog; Markdown download.
- **Export:** downloaded Gmail Markdown contains production preparation, scope choices and source links. Live findings and run log are included by the same export path.
- **Responsive:** inspected narrow and desktop breakpoints; narrow library rows retain setup effort and provider wait. Dialogs use native modal focus, controls have labels, and reduced motion is supported.

The share dialog exposes the URL for manual copying as well as clipboard copy, since clipboard availability varies by browser. Shared guides omit the developer's local checkmarks.

## Limits of this validation

Unit network tests use controlled fixtures; live sample checks are separate. Browser behavior has been checked in the Codex in-app browser, not a full browser/device matrix. No end-to-end OAuth integration is implied. DNS screening is not resolver pinning, and this demo has not undergone a security audit. Public research storage has no self-service moderation/deletion workflow yet.

## Hosted verification

The deployed public homepage returned HTTP 200 without authentication. A production `POST /api/research` for Linear streamed actual source fetches, read four official pages, and saved a draft to hosted D1. A separate `GET /api/guides/:id` returned HTTP 200 and the matching guide ID.

[Open the resulting guide](https://oauth-atlas.mossystar19.chatgpt.site/?guide=draft-f9ad563b-6fd1-4644-9fdf-22237134d1f9). Its source notebook includes the provider index, OAuth setup, and customer third-party-app approvals. Effort and approval wait remain unverified. The public GitHub repository contains the same published source commit.

## Decision-log and Composio design revision

This revision adds 15 decisions mapped to five product objectives and 10 assignment/follow-up requirements. The requirement map explicitly marks the 100-guide library and rich unfamiliar-provider interpretation as partial. Two additional tests verify complete cross-reference coverage and parity between the source log and downloadable Markdown.

The design reference is Composio's current homepage and OAuth guide directory, inspected through browser screenshots and DOM-computed styles on 29 October 2026. The earlier mint/serif dashboard was replaced across the catalog, saved state, guide, evidence, blockers, product notes, dialogs, loading/error states and decision log. Source captures and measurement boundaries are documented in `DESIGN.md`.

Browser checks in this revision covered:

- Requirement links opening the relevant decision and displaying its tradeoff; category/search filters; downloadable Markdown matching `docs/DECISIONS.md`; direct decision-page URLs and expanded hash targets after reload.
- The Composio handoff, blocker/evidence tabs, share URL, and downloaded Gmail guide containing the new handoff and retained scope/preparation details.
- Invalid public-source input producing an actionable error, followed by recovery to a successful live Linear draft with unknown timing retained.
- Narrow-layout navigation, guide rendering and a requirement table that scrolls inside its container. At a 390px viewport, the guide and decision pages each had a 390px document width; the table scrolled internally.

The new visual language and decision log do not expand the prototype's provider-approval capabilities. This remains an independent OAuth Atlas submission.

## Documentation workspace correction — 30 October 2026

The earlier homepage/OAuth-directory design reference above is superseded. The Composio quickstart documentation is the primary reading reference. The implementation uses a fixed top bar, grouped sidebar, 28px reading headings, 16px/28px primary text, continuous reference-guide sections and a desktop contents outline. Requirement disclosures replace the wide prose matrix. D14 records why the original reference was a workflow mismatch.

Browser checks confirmed guide reading styles, command search, reference-guide section anchors, decision filters/direct hash expansion, preserved local checkmarks, share dialogs and downloaded Markdown. The Gmail export retains scope choices, production preparation, the Composio handoff and sources. The docs changes do not establish measured usability gains.

## Advisor MVP — 30 October 2026

### Source checks and corrections

- Gmail scope classification was rechecked against the official scope table. Read, metadata and compose remain restricted; send-only is sensitive. Verification exceptions and server-data assessment are separate conditional rules. “My team” and “device-only” are answers to investigate, not automatic proof of an exception.
- Slack's distribution guide distinguishes a single workspace, an unlisted early-customer pilot and commercial Marketplace distribution. Workspace administration remains a separate installation gate. History access depends on token role, membership and the current app-category limits.
- GitHub's app-model and API documentation support installation-based repository access and fine-grained Contents/Pull requests permissions. The **current Composio GitHub FAQ** documents bringing a GitHub App's client ID/secret, separate repository installation, and a developer-supplied installation link. The advisor therefore does not claim GitHub Apps are unsupported, or assume managed OAuth supplies the requested installation model.
- The Slack and Slackbot toolkit descriptions differ in token emphasis. The advisor exposes that choice and requires checking the actual bot/user grants for selected tools, rather than claiming a bot connection grants only bot access.
- Composio's current reference uses **`/api/v3.1/toolkits/{slug}`**. The optional adapter reads the exact managed schemes. Auth-method presence and managed availability remain distinct from tested scope suitability.
- A direct public toolkit-index read supplied **1,694 names and documentation links**. Catalog-only entries intentionally carry no inferred OAuth or managed-auth facts. The snapshot and refresh script retain provenance; incomplete future extraction does not overwrite the snapshot.

### Automated evaluation

**46 tests pass** across the advisor, original research flow, curated sources and decision-log integrity. The advisor adds 33 cases, including 16 provider scenarios plus false positives, changed-answer behavior, conditional assessment/exception handling, metadata failure and multiple methods, strict Unicode share decoding, AI success/invalid output/failure/missing key, and catalog provenance.

AI and metadata tests use controlled responses. They verify the adapters' requests, schema checks and fallbacks; they are not successful live credentialed calls. The demo has no configured OpenAI or Composio API keys.

### Browser journeys

- **Gmail:** description → labeled local suggestions → editable read/draft capabilities → external production/custom branding/server-handling answers → restricted scope and conditional verification/assessment guidance. Changing actions to send-only removed read/compose and the restricted-data dependencies, produced `gmail.send`/sensitive verification, and started a new checklist state.
- **Slack:** selected read/post, customer pilot, bot identity, custom branding and restricted workspace. The plan showed `channels:history`/`chat:write`, unlisted distribution and administrator/history dependencies without making Marketplace approval a prerequisite for the pilot.
- **GitHub:** searched the directory, selected the deep assessment, chose code/PR reads plus PR reviews, background execution and selected repositories. The plan recommended a GitHub App, Contents read/Pull requests write, custom Composio setup and a separate installation link.
- A checklist step survived reload. Shared assessment inputs reconstructed the read/draft plan with a current-rules notice. A downloaded Gmail launch-plan Markdown file includes input context, the recommendation, conditional dependencies, unchecked checklist and official sources. Personal checkmarks are absent from the share codec/export.

### Remaining verification limits

No live credentialed intent/metadata call, representative provider token exchange, GitHub installation, Slack installation, Gmail assessment, or provider approval was completed. Configuration sketches use the current session API shape but have not been executed against a Composio account. Printing has a print stylesheet; system printer/PDF behavior and a full browser/device matrix have not been certified. Golden cases demonstrate the implemented decision rules, not measured developer comprehension or task-completion performance.

Narrow-screen checks confirmed the assessment/result/directory/decision pages have no document overflow at the observed 354px CSS viewport. The mobile navigation drawer and result section disclosure work. A section-anchor bug caused by nested history updates was corrected; permission links and reload land approximately 88px below the fixed-header origin without resetting assessment state. Catalog-only Linear launched a successful live source-reading draft through the new directory. Desktop layouts were also checked at the observed 1163px CSS viewport.


## Anthropic intent adapter — 30 October 2026

Added direct server-side Anthropic Messages support alongside the existing OpenAI adapter, using the official [structured-output contract](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) and [API version migration](https://platform.claude.com/docs/en/api/migration-2026-10-21). The adapter uses `output_config.format`, `Authorization: Bearer`, an explicit `anthropic-version: 2026-10-21`, and no deprecated sampling or beta options. An exact model ID must be configured by the deployer; no default model or price is assumed.

**63 automated tests pass**, including 17 new provider-adapter cases. They verify Anthropic-only and explicit selection, existing OpenAI compatibility, ambiguity/disablement/incomplete configuration, endpoint and header shape, complete structured responses, refusal and token truncation, invalid or cross-provider capabilities, empty/malformed output, network failures and error redaction. A selected provider never fails over to a different vendor. These are controlled-response checks, not a live paid API invocation.

Credentials remain server-side. No live Anthropic key or model has been configured or tested. The core rules and keyless fallback remain available. The public hosting connector currently reports the existing Site as not found and returns no accessible Sites; this follow-up must not be described as deployed until access is restored and publication succeeds.

The follow-up production Worker build and TypeScript check passed. A local POST to `/api/advisor/interpret` returned HTTP 200 with labeled local suggestions and the expected Gmail read/draft actions without configured credentials. Live Anthropic remains unverified.

## Shorter journey and timing guidance — 30 October 2026

Replaced the action/context wizard with one confirmation screen. The request is read-only until an explicit reinterpretation preview is applied. A shared question model requires answers that change the setup, omits irrelevant fields, and blocks firm recommendations for incomplete legacy/shared inputs. Customer-policy uncertainty becomes a checklist task. The sidebar now has three main destinations; saved/reference guides and submission evidence remain in the footer. Examples fill descriptions only. Provider SVGs replace placeholder glyphs, and important instructions/explanations use approximately 16px text.

**78 automated tests pass.** Fifteen added cases cover required-answer gates, GitHub question relevance, organization-policy follow-up, testing versus production data handling, Workspace confirmation, request revisions/reset, and timing/source applicability. Existing scenarios were supplied with their now-required data-flow/repository answers; incomplete cases are tested separately rather than treated as firm recommendations.

TypeScript and the production Worker build passed. Google’s verification FAQ, Slack’s Marketplace review process and GitHub’s app registration documentation were rechecked. Hands-on ranges are explicitly unmeasured author estimates for configuration and a first test connection, with assumptions and exclusions. They are not timed setup results. Provider stages are not summed into a launch date; customer-admin and independent security-assessment timing remain separate uncertainties.

Browser checks in the in-app browser:

- Gmail read/draft: a missing production data-processing choice kept Create launch plan disabled. Completing it produced the custom plan, 45–90 minute planning range and sourced restricted-scope review guidance.
- Change request: rerunning a send-only description previewed the suggestion while existing read/draft choices remained intact. Applying it removed read/draft, preserved confirmed launch context, omitted the now-irrelevant data-processing question and changed review guidance to sensitive-scope timing.
- The downloaded Markdown retained setup assumptions, sensitive timing and send permission, with no old read permission. Opening the shared assessment reproduced the revised plan and current-rules notice.
- GitHub code/review actions required only repository access. Selected repositories enabled the plan without audience, branding or background questions and produced the GitHub App recommendation.
- Slack bot read/post: a pilot showed unlisted-distribution guidance; changing to customer-facing production showed the separately sourced Marketplace review stages.
- At a 375px viewport, the result, confirmation and directory had a 375px document width. Confirmation questions became one column and measured hint/timing text was 16px. Mobile navigation exposed the three agreed destinations. Desktop layout was checked at 1400px.
- Searching Linear exposed Research docs. Its dialog explained that it reads up to four pages and does not select a complete setup before offering the collection action. No new live research run was needed for this wording change; existing research behavior remains covered by prior live samples and automated checks.

Current screenshots are in `docs/screenshots/preview.jpg` and `confirmation.jpg`. The plain-language journey and rationale are in `docs/PRODUCT-WALKTHROUGH.md`; D21–D23 extend the historical log to 23 decisions. These checks do not establish improved developer comprehension, calibrated effort estimates, successful OAuth connections or provider approval.

Publication remains blocked: the existing Site’s get/read-credential operations returned “Sites project not found.” The selected project identity and public audience were preserved; no replacement Site was created. Local preview and repository changes must not be described as a refreshed public deployment.
