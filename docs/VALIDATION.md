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
