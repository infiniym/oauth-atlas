# OAuth Launch Advisor — Decision log

Updated 2026-10-30.

Help developers choose an authentication architecture for their use case, follow a source-backed launch plan and inspect the decisions behind the product.

The log preserves the original guide-library decisions and records the move to a guided advisor. D14 corrects the earlier marketing-directory reference; D16–D20 explain the assessment, rules, catalog, sharing and evaluation. Documentation checks and automated cases are not completed OAuth setup, provider approval or a user study.

## Product objectives

- **O1: Reduce launch uncertainty.** Reveal effort, waiting time and approval risk before a developer commits to an integration.
- **O2: Keep the developer moving.** Turn a requirement or blocker into a concrete next action with an owner.
- **O3: Make trust inspectable.** Separate sourced rules, observations, estimates and unknowns; keep human decisions explicit.
- **O4: Make knowledge reusable.** Support app lookup, unfamiliar-app research and guides that work without a verbal explanation.
- **O5: Fit the Composio mental model.** Use recognizable product language and interaction patterns while preserving the guide's purpose.

## Requirement coverage

| ID | Requirement | State | Approach and reason | Decisions |
| --- | --- | --- | --- | --- |
| R1 | Understand provider OAuth apps, integrations and user connections | Demonstrated | Introduce the provider app → auth config → connected account flow, then explain managed versus custom auth before app registration. It prevents a developer from treating one client registration as an approval or connection for all users. | D01, D02, D14 |
| R2 | Look up OAuth apps; design for a library of 100 | Partial | The original four-guide library remains, plus three contextual assessments, a searchable 1,694-name catalog snapshot and live research drafts. The intended 100 reviewed OAuth guides are not complete. The take-home permits a focused slice. Four contrasting approval paths are more useful evidence than 100 shallow entries. | D03, D13 |
| R3 | Explain difficulty, active work and approval waiting time | Demonstrated | Show scenario-specific launch gates, separately labeled effort estimates and provider waits, plus testing versus production requirements. Calendar delay, engineering effort and customer-admin policy are different dependencies; a single score or date hides them. | D04, D05, D06 |
| R4 | Explain nuances, next steps and blocker recovery | Demonstrated | Use an ordered checklist, completion criteria, a next-move panel and symptom → remedy blockers. A developer needs to know how to make progress, including when the next action belongs to someone else. | D06, D07 |
| R5 | Use agents practically and show the human handoff | Demonstrated | Research agents checked sources and reachable setup flows. Each guide distinguishes agent preparation from account ownership, consent, credentials and submission. Research can be automated; an approval, legal attestation or customer access grant cannot be assumed from it. | D08, D09 |
| R6 | Generate a shareable guide live for an unfamiliar app | Partial | A live source reader discovers and fetches documentation, streams progress and saves a public draft. It is extractive and does not reliably interpret every provider policy. The slice works without model or research API credentials. That constraint limits guide completeness and must remain visible. | D10, D11, D12 |
| R7 | Check guidance against real sources or setup attempts | Demonstrated | Cite official sources beside curated steps; retain attempted actions, corrections and untested boundaries in the evidence notebook. A linked document, a form inspected and a successful OAuth round trip prove different things. | D08, D09 |
| R8 | Provide a working link, source repository and setup instructions | Demonstrated | Publish the app and repository; document local setup, tests, architecture, sample results and limitations in the README and validation notes. Reviewers can run and evaluate the submission without a guided explanation. | D11, D12 |
| R9 | Explain each decision, objective and requirement mapping | Demonstrated | This decision log is available in the app and as Markdown, using one structured source of truth. The reasoning should be reviewable alongside the experience, including the partial requirements. | D15 |
| R10 | Mirror Composio's UI/UX and OAuth descriptions | Demonstrated | Use Composio’s documentation UI as the primary reading reference: persistent provider navigation, a focused content column, section links, restrained headings and readable body text. Keep search, comparison and progress controls in the catalog. Developers need to read and perform setup work. A promotional website layout creates unnecessary navigation and reading friction. | D01, D14 |
| R11 | Turn integration intent into an editable contextual assessment | Demonstrated | Natural-language intake and provider selection converge on action and launch-context forms for Gmail, Slack and GitHub. Inputs and checklist state persist in the browser. Developers should not need to know which OAuth questions matter before starting. Editable interpretation prevents assumptions becoming invisible. | D16, D19 |
| R12 | Use optional AI for interpretation with a functional keyless fallback | Partial | A server-side structured-output parser selects only known capabilities. Missing credentials, refusal, timeout or invalid output falls back to labeled keyword suggestions. Mocked AI and fallback paths are tested; live AI is not tested or enabled in the public demo. AI can help interpret intent, but must not create provider facts. The product must remain usable without external credentials. | D17 |
| R13 | Recommend app models, permissions and launch dependencies from verified rules | Demonstrated | Typed provider capabilities and compositional rules distinguish Gmail sensitivity/data handling, Slack identity/distribution and GitHub App installation. Each rule has sources, an ID and a check date. Managed availability, permission fit and provider application model are independent decisions. A generic OAuth guide cannot safely collapse them. | D16, D17 |
| R14 | Discover at least 100 real integrations without overstating guide coverage | Demonstrated | A dated public Composio catalog snapshot supplies 1,694 names and documentation links. Three entries have assessments; catalog-only auth and managed status remain unverified. Optional server-side Composio metadata is checked for the selected assessment method. Names provide useful discovery without pretending that every listed integration has a validated setup guide. | D18 |
| R15 | Evaluate real scenarios and recalculate after changed answers | Demonstrated | Golden cases cover the three providers, conditional verification, pilot versus commercial distribution, selected-repository access and failure paths. Browser checks verify input edits, regenerated scopes/dependencies, exports and sharing. A plan must change with the developer’s actual requirements. Testing only that UI components render would miss incorrect advice. | D19, D20 |

Demonstrated means the behavior exists in the focused slice; it does not mean provider approval or a measured user outcome. Partial requirements remain unfinished.

## D01 — Model three separate things: provider app, auth config and connected account

**Phase:** Initial decision; terminology clarified in an earlier revision

**Objectives:** O1 · Reduce launch uncertainty; O5 · Fit the Composio mental model

**Assignment requirements:** R1, R10

**Decision.** Make the relationship visible in the library and explain it in the guide's Composio handoff.

**Why this approach.** The developer registers an app with a provider. Composio's auth config tells a toolkit which method, permissions and app configuration to use. A user's authorization then creates their connected account. Confusing these objects leads to false readiness claims and callback mistakes.

**How it is implemented.** The connection diagram uses Composio's entity names. The handoff distinguishes the provider redirect URI from the return callback after a Connect Link. This UI explains configuration; it does not create it.

**Alternative considered.** A generic OAuth tutorial or the earlier 'your integration' label would be shorter but leaves the configuration boundary ambiguous.

**Tradeoff / remaining gap.** Composio-specific guidance is an optional layer; provider guides still apply when a developer uses another runtime.

**Evidence and constraints.** Composio authentication and managed/custom-auth documentation establish these objects and their relationship.

**Acceptance criterion.** A reader should be able to explain which object is shared configuration and which represents one user's grant. This is an acceptance criterion, not a measured usability result.

- [Authentication concepts](https://docs.composio.dev/docs/authentication)
- [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app)

## D02 — Ask whether custom OAuth is needed before showing registration work

**Phase:** Initial decision

**Objectives:** O1 · Reduce launch uncertainty; O2 · Keep the developer moving

**Assignment requirements:** R1

**Decision.** Put managed versus custom auth at the beginning of the journey.

**Why this approach.** Avoidable setup is the fastest setup. A developer may be able to test using a Composio-managed app, then choose their own app for identity, scopes, quota or unsupported managed methods.

**How it is implemented.** A prominent managed-auth entry point links to the official directory. The custom-app guides state their scope rather than claiming every developer needs provider registration.

**Alternative considered.** Start every developer at 'Create an OAuth app'. That can send someone through a long approval path before establishing whether it is necessary.

**Tradeoff / remaining gap.** The prototype links to the live managed-auth directory instead of pretending to know every current provider/method availability flag.

**Evidence and constraints.** The assignment explicitly points to managed OAuth as the starting point. Composio documents custom credentials as a separate choice.

**Acceptance criterion.** Managed-auth availability must be checked per OAuth method before treating registration as required.

- [Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth)

## D03 — Choose four apps by the launch risks they expose

**Phase:** Initial decision

**Objectives:** O1 · Reduce launch uncertainty; O4 · Make knowledge reusable

**Assignment requirements:** R2, R3

**Decision.** Use GitHub, Notion, Slack and Gmail as contrasting examples.

**Why this approach.** GitHub exposes customer organization gates, Notion separates optional listing from direct OAuth, Slack adds commercial eligibility and a long review, and Gmail adds restricted-data verification and assessment. This tests whether the experience handles different kinds of friction.

**How it is implemented.** Every sample uses the same guide structure but has a different scenario, launch gate, blocker set and evidence notebook.

**Alternative considered.** Pick four easy providers or generate 100 similar pages. Neither demonstrates judgment across approval paths.

**Tradeoff / remaining gap.** Breadth is limited to four reviewed guides. The assignment permits a focused working slice; the 100-guide library is still incomplete.

**Evidence and constraints.** Provider dossiers and source links in the Evidence log record the distinctions. They do not establish completed approvals.

**Acceptance criterion.** Each sample should add a materially different developer decision, rather than only changing logos.

- [GitHub example](https://oauth-atlas.mossystar19.chatgpt.site/?guide=github)
- [Notion example](https://oauth-atlas.mossystar19.chatgpt.site/?guide=notion)
- [Slack example](https://oauth-atlas.mossystar19.chatgpt.site/?guide=slack)
- [Gmail example](https://oauth-atlas.mossystar19.chatgpt.site/?guide=gmail)

## D04 — Describe the launch gate instead of inventing a universal difficulty score

**Phase:** Initial decision

**Objectives:** O1 · Reduce launch uncertainty; O3 · Make trust inspectable

**Assignment requirements:** R3

**Decision.** Use contextual labels such as customer-admin gates, Marketplace review and security assessment.

**Why this approach.** The same provider can be easy for one test account and hard for a public product. A single numerical score creates false precision and hides the reason for the difficulty.

**How it is implemented.** Comparison rows pair a scenario-specific launch label with effort and waiting time. Unknown live drafts are labeled 'Needs verification'.

**Alternative considered.** A provider-wide 'easy / medium / hard' score without the scenario would be simpler to scan but easy to misuse.

**Tradeoff / remaining gap.** Labels require reading a few words; they do not provide an automatic ranking for every possible feature.

**Evidence and constraints.** The curated data states the audience and use case. Difficulty changes when scopes, distribution or customer policy change.

**Acceptance criterion.** A reader can name the dependency creating friction; an unknown case never defaults to 'easy'.

- [Guide data](https://github.com/infiniym/oauth-atlas/blob/main/data/guides.json)

## D05 — Separate active setup effort from provider waiting time

**Phase:** Initial decision

**Objectives:** O1 · Reduce launch uncertainty; O3 · Make trust inspectable

**Assignment requirements:** R3

**Decision.** Present distinct fields with their basis and assumptions; avoid a promised launch date.

**Why this approach.** Forty-five minutes of configuration and several weeks of review can both be true. Assessor work, pilot recruitment, remediation and customer-admin approval may add dependencies that cannot be reduced to one countdown.

**How it is implemented.** Author estimates are labeled as planning estimates. Provider-published waits are separately described and linked. Gmail's display says review is approximately six weeks and assessment varies; it does not imply a verified sequence.

**Alternative considered.** One 'time to launch' value is convenient but would imply evidence we do not have.

**Tradeoff / remaining gap.** The product is more candid than predictive. Live drafts keep unverified effort and waits unknown.

**Evidence and constraints.** Published provider timing and author effort assumptions are retained separately in the guide data and dossiers.

**Acceptance criterion.** Every displayed estimate has a basis; a provider range is not described as an SLA or a measured setup result.

- [Validation notes](https://github.com/infiniym/oauth-atlas/blob/main/docs/VALIDATION.md)

## D06 — Scope each guide and distinguish testing from production

**Phase:** Initial decision

**Objectives:** O1 · Reduce launch uncertainty; O2 · Keep the developer moving

**Assignment requirements:** R3, R4

**Decision.** State the audience and feature before the launch plan, then show separate testing and production requirements.

**Why this approach.** A test installation does not establish public commercial eligibility. Gmail reading versus sending, Notion direct distribution versus listing, and Slack pilots versus commercial launch have different consequences.

**How it is implemented.** Each guide opens with its scenario and verdict. Feature/scope comparisons and production caveats explain when the guidance stops applying.

**Alternative considered.** One provider setup recipe would be shorter but could apply the wrong review path to a developer's product.

**Tradeoff / remaining gap.** The prototype does not implement a full scenario configurator; developers must compare their case with the stated assumptions.

**Evidence and constraints.** Provider sources distinguish scopes, audiences, distribution modes and customer controls.

**Acceptance criterion.** Testing instructions cannot be mistaken for confirmation that a public product is approved.

- [Gmail scenario and scopes](https://oauth-atlas.mossystar19.chatgpt.site/?guide=gmail)
- [Slack distribution example](https://oauth-atlas.mossystar19.chatgpt.site/?guide=slack)

## D07 — Turn guidance into next actions, completion criteria and blocker remedies

**Phase:** Initial decision

**Objectives:** O2 · Keep the developer moving; O4 · Make knowledge reusable

**Assignment requirements:** R4

**Decision.** Use an ordered launch plan, a next-move panel, checkmarks and symptom-specific recovery advice.

**Why this approach.** A document is useful only if the developer can act on it. Identifying the owner and completion condition reduces ambiguity when the next move belongs to the developer, customer admin, provider or assessor.

**How it is implemented.** Steps contain an owner and, where available, 'Done when'. Blockers map symptoms to remedies. Checkmarks persist locally and explicitly do not verify provider state.

**Alternative considered.** A long prose article can explain the topic but makes it harder to resume work or locate the remedy for a specific error.

**Tradeoff / remaining gap.** Progress is self-reported, local to the browser and not synchronized with provider dashboards.

**Evidence and constraints.** The guide schema supports steps, blockers, next action and owner fields. Browser checks verified checklist persistence.

**Acceptance criterion.** After reading a blocker, a developer should know one action and who can perform it. This has not been measured with user testing.

- [Guide schema](https://github.com/infiniym/oauth-atlas/blob/main/lib/guide.ts)

## D08 — Expose evidence levels and corrections instead of using a generic verified badge

**Phase:** Initial decision

**Objectives:** O3 · Make trust inspectable

**Assignment requirements:** R5, R7

**Decision.** Separate official rules, setup observations, author estimates and unresolved questions.

**Why this approach.** Reading a provider document does not prove that a token exchange works. An inspected form does not prove approval. The developer needs to see exactly what supports a claim.

**How it is implemented.** Sources sit beside curated steps; the Evidence tab records actual attempts and boundaries. Research corrections include Notion's optional Marketplace listing and Slack's current installation threshold.

**Alternative considered.** One 'verified' label would feel reassuring but overstate the validation performed.

**Tradeoff / remaining gap.** Evidence takes space and ongoing maintenance. Checked dates can become stale; the prototype has no automatic source-change review pipeline.

**Evidence and constraints.** Original agent dossiers, normalized source IDs and the validation notebook retain provenance. Citation checks run automatically.

**Acceptance criterion.** A reader can distinguish an observation from a recommendation, and find the supporting source without leaving the context of the step.

- [Original research dossiers](https://github.com/infiniym/oauth-atlas/tree/main/research)
- [Validation notes](https://github.com/infiniym/oauth-atlas/blob/main/docs/VALIDATION.md)

## D09 — Attempt reachable setup while keeping identity, consent and submission with humans

**Phase:** Initial decision

**Objectives:** O2 · Keep the developer moving; O3 · Make trust inspectable

**Assignment requirements:** R5, R7

**Decision.** Use agents for public research and accessible form inspection; stop at account, credential, agreement and approval boundaries.

**Why this approach.** The assignment asks for practical attempts, but does not require paid accounts or completed approval. A human must own the app identity, approve access and attest to policies. An agent cannot promise a provider decision.

**How it is implemented.** Agents reached the Slack, Notion and GitHub sign-in gates. Google's Web application client form was inspected without submission. Guides state what an agent can prepare and where a human takes over.

**Alternative considered.** Claiming app setup success after finding a dashboard would give a misleading demonstration. Creating production registrations without the owning developer would introduce unapproved state.

**Tradeoff / remaining gap.** No completed OAuth token exchange, user-data API action, review or assessment was tested. Those remain necessary acceptance checks for a real integration.

**Evidence and constraints.** Setup observations and untested actions are recorded per provider; no provider credentials were generated or stored in the submission.

**Acceptance criterion.** Every setup claim is limited to the actual observed action; proposed verification steps are not reported as executed.

- [Setup attempt boundaries](https://github.com/infiniym/oauth-atlas/blob/main/docs/VALIDATION.md)

## D10 — Ship a keyless source-reading agent and label its output as a draft

**Phase:** Constraint-driven initial decision

**Objectives:** O3 · Make trust inspectable; O4 · Make knowledge reusable

**Assignment requirements:** R6

**Decision.** Use a bounded discovery/read/classify workflow instead of pretending to have an LLM research service.

**Why this approach.** The available Firecrawl anonymous service rejected requests, and no model API credentials were configured. A deterministic source reader could still perform real live network investigation without asking reviewers to create accounts. This was a delivery constraint, not evidence that extractive rules are the best long-term agent architecture.

**How it is implemented.** The runtime resolves a name or accepts a website, follows provider docs, records actual fetch progress, extracts limited evidence and scopes, and saves an unreviewed draft. Failed discovery asks for an official docs URL.

**Alternative considered.** Require reviewer-supplied keys, stop at a mock, or return hardcoded unknown-app guides. Those would respectively add setup friction, fail the working-flow demonstration, or misrepresent live research.

**Tradeoff / remaining gap.** This only partially meets the rich live-guide objective. Keyword heuristics do not reliably interpret policies, resolve contradictions or produce provider-specific setup details. Unknown effort and review time remain unknown.

**Evidence and constraints.** Live sample runs for Linear and Todoist are recorded separately from fixture-based unit tests. Negative/missing OAuth evidence tests prevent unsupported readiness claims.

**Acceptance criterion.** A new input must cause actual source reads, and the output must preserve failures and gaps. A future model-backed agent still needs claim-to-source validation and human review before promotion.

- [Live research implementation](https://github.com/infiniym/oauth-atlas/blob/main/lib/research.ts)
- [Research tests](https://github.com/infiniym/oauth-atlas/blob/main/tests/research.test.ts)

## D11 — Make guides portable while keeping personal progress separate

**Phase:** Initial decision

**Objectives:** O4 · Make knowledge reusable; O3 · Make trust inspectable

**Assignment requirements:** R6, R8

**Decision.** Persist public generated snapshots, offer Markdown export and store saves/checkmarks only in the browser.

**Why this approach.** A reviewer or teammate should open the guide without relying on the author's session. Personal work-in-progress does not belong in the shared guide, and adding accounts would increase friction for this take-home.

**How it is implemented.** D1 stores generated guides by ID. Share dialogs expose a public URL with manual-copy fallback. Exports include sources and uncertainties. Inputs disclose that drafts are public.

**Alternative considered.** Browser-only drafts cannot be shared reliably; an authenticated team product adds permissions and account setup beyond the focused slice.

**Tradeoff / remaining gap.** Guides are public; users must submit public app information only. Checklists do not sync across devices. Moderation, deletion and retention controls remain unfinished.

**Evidence and constraints.** The deployed service generated a Linear draft and returned the same ID from a separate retrieval request. Browser checks covered sharing, export and local persistence.

**Acceptance criterion.** A share URL opens in a fresh session, and the shared guide does not include personal checkmarks.

- [Live-generated example](https://oauth-atlas.mossystar19.chatgpt.site/?guide=draft-f9ad563b-6fd1-4644-9fdf-22237134d1f9)

## D12 — Use a Worker, D1 and streamed progress for a small working slice

**Phase:** Initial decision

**Objectives:** O2 · Keep the developer moving; O4 · Make knowledge reusable

**Assignment requirements:** R6, R8

**Decision.** Build the UI with React/TypeScript and a server route that streams real progress, with D1 for guide snapshots.

**Why this approach.** A static mock cannot investigate unfamiliar apps or preserve shared results. A server boundary also keeps source fetching and rate limits out of the client, while streaming makes long source reads understandable.

**How it is implemented.** Vinext/Vite builds a Cloudflare Worker through Sites. NDJSON carries actual research events. Input, source size, public HTTPS/DNS, redirect, page-count, time and hourly-run bounds limit the preview workload.

**Alternative considered.** A static app would be simpler but fail live research/persistence. A general browser-agent platform would expand infrastructure and authenticated-action scope.

**Tradeoff / remaining gap.** Four-page and 58-second limits can miss material policy. DNS checks are not resolver pinning, and public preview limits are not a hardened abuse-control system.

**Evidence and constraints.** Automated tests, type checks, builds and deployed generation/retrieval checks are documented. These technical checks are not usability or OAuth approval validation.

**Acceptance criterion.** Progress corresponds to completed/attempted work; errors are actionable; unsuccessful research is never reported as a saved success.

- [Research route](https://github.com/infiniym/oauth-atlas/blob/main/app/api/research/route.ts)

## D13 — Treat expansion to 100 as an editorial and maintenance workflow

**Phase:** Initial scope decision; catalog discovery expanded in D18

**Objectives:** O3 · Make trust inspectable; O4 · Make knowledge reusable

**Assignment requirements:** R2

**Decision.** Create a reusable guide contract and citation checks before expanding the reviewed library.

**Why this approach.** The hard part is maintaining useful, scenario-specific evidence as provider rules change. Generating 96 more pages would not establish accuracy or readiness.

**How it is implemented.** The four guides share one schema with steps, dependencies, sources, attempts, corrections and uncertainties. Generated drafts remain separate from the reviewed catalog.

**Alternative considered.** Use provider count as the main success measure or silently promote every draft into the library.

**Tradeoff / remaining gap.** There is no completed 100-app library, review queue, automatic recrawl or revision-history UI. These are next work, not delivered capabilities.

**Evidence and constraints.** The assignment permits a focused slice. The current repository contains four curated guide records and a separate public-draft store.

**Acceptance criterion.** Before scaling, define source freshness, reviewer ownership and publication criteria. Proposed metrics are useful-next-action rate and verified claim coverage, not raw page count.

- [Guide schema](https://github.com/infiniym/oauth-atlas/blob/main/lib/guide.ts)

## D14 — Use Composio’s docs layout for reading and application controls for work

**Phase:** Revised after correcting the reference choice

**Objectives:** O5 · Fit the Composio mental model; O2 · Keep the developer moving

**Assignment requirements:** R1, R10

**Decision.** Use the Composio quickstart and documentation UI as the primary reference for guides, research notes and the decision log. Keep the library as a compact searchable catalog.

**Why this approach.** The earlier revision used Composio’s marketing OAuth directory because it matched the subject matter. That over-weighted brand resemblance and produced oversized headings, small metadata and too much promotional space. The actual task is sustained reading, finding requirements and resuming setup. The docs reference is a better fit for that workflow.

**How it is implemented.** A fixed top bar and grouped provider sidebar give persistent orientation. Guides use continuous anchored sections, an on-page contents outline, 28px page headings and 16px/28px reading text. The library opens directly to search and comparison rows. Global search works from every page. Requirement coverage uses readable disclosures instead of a wide prose table. The advisor adds restrained task forms and a recommendation workspace in this documentation shell.

**Alternative considered.** The earlier marketing-style treatment is superseded. Copying the docs wholesale into the app library would also be a poor fit: comparison, saved state and research progress still need application controls.

**Tradeoff / remaining gap.** This adapts documented reading patterns rather than recreating an authenticated Composio dashboard. Brand alignment is retained through restrained color and typography. Browser checks establish layout behavior and text sizes; user testing is still needed to establish improved task performance.

**Evidence and constraints.** The linked Composio quickstart was inspected in the browser: grouped left navigation, a focused article, right-hand contents, a 28px medium-weight heading, and 16px body text with 28px line spacing. The user identified the readability problem in the previous reference choice.

**Acceptance criterion.** App lookup is available without a promotional hero. A developer can move between providers and jump to a guide section without losing orientation. Guide and decision-body copy remain at a readable size on desktop and mobile. No measured usability result is implied.

- [Primary reference: Composio quickstart](https://docs.composio.dev/docs/quickstart)
- [Documentation auth concepts](https://docs.composio.dev/docs/authentication)
- [Previous marketing reference (superseded)](https://composio.dev/auth)
- [Design reference and implementation](https://github.com/infiniym/oauth-atlas/blob/main/DESIGN.md)

## D15 — Make the rationale and incomplete requirements visible in the product

**Phase:** Added in the decision-log revision

**Objectives:** O1 · Reduce launch uncertainty; O3 · Make trust inspectable; O4 · Make knowledge reusable

**Assignment requirements:** R9

**Decision.** Add a first-class decision log with objective IDs, requirement coverage, alternatives, constraints and tradeoffs.

**Why this approach.** The original implementation had product notes, but not an explicit explanation of how each requirement was addressed. The follow-up asks for the causal link between an action, its objective and the chosen approach.

**How it is implemented.** One structured file powers this page and downloadable Markdown. Each decision identifies its phase; the requirement map marks the 100-guide library and rich live generation as partial.

**Alternative considered.** Write a retrospective that lists features as successes without alternatives, evidence or limits. That would not help evaluate the underlying judgment.

**Tradeoff / remaining gap.** The rationale explains choices; it is not proof of user preference or measured product outcomes. The log should change when constraints or evidence change.

**Evidence and constraints.** The assignment, implemented artifacts, validation notes and this follow-up form the basis. No customer study or conversion result is claimed.

**Acceptance criterion.** A reviewer can trace a requirement to a decision, its implementation, a tradeoff and an honest completion state.

- [Decision log source](https://github.com/infiniym/oauth-atlas/blob/main/data/decisions.json)

## D16 — Make a use-case assessment the primary entry point

**Phase:** Added for the advisor MVP brief

**Objectives:** O1 · Reduce launch uncertainty; O2 · Keep the developer moving; O5 · Fit the Composio mental model

**Assignment requirements:** R11, R13

**Decision.** Lead with intent and contextual requirements, then generate the setup path. Keep static guides as research references.

**Why this approach.** The new brief asks what architecture fits a developer’s feature. A provider-only guide cannot distinguish a send-only Gmail tool from a mailbox reader, or a public GitHub profile reader from an installation-based reviewer.

**How it is implemented.** A description or selected provider leads to editable capabilities and a contextual launch form. Recommendation sections cover the model, managed fit, permissions, dependencies, next action and grouped checklist.

**Alternative considered.** Keep adding conditional paragraphs to a single provider article. That shifts the work of selecting the applicable path back to the developer.

**Tradeoff / remaining gap.** The map covers selected actions for three providers, not every endpoint or enterprise topology. Unknown inputs remain open questions and arbitrary special requirements are not interpreted by the rules.

**Evidence and constraints.** The supplied advisor brief and the existing reference-library limitations motivated this change. Official provider sources support the scoped mappings.

**Acceptance criterion.** Changing Gmail read/draft to send-only removes restricted scopes and the corresponding assessment dependency.

- [Assessment UI](https://github.com/infiniym/oauth-atlas/blob/main/components/advisor.tsx)
- [Capability map](https://github.com/infiniym/oauth-atlas/blob/main/lib/advisor/providers.ts)

## D17 — Let AI suggest inputs while deterministic rules own provider conclusions

**Phase:** Advisor architecture; revised for Anthropic support

**Objectives:** O1 · Reduce launch uncertainty; O3 · Make trust inspectable; O5 · Fit the Composio mental model

**Assignment requirements:** R12, R13

**Decision.** Keep capability interpretation, facts and recommendation logic separate. AI can suggest inputs but cannot generate scopes or approval rules.

**Why this approach.** The same verified requirements should produce the same decision, regardless of model availability or wording. Editable suggestions also make ambiguity visible.

**How it is implemented.** A typed assessment feeds compositional provider rules with source IDs. Optional server-side Anthropic Messages or OpenAI Responses structured output is schema-validated against the capability map. AI_PROVIDER selects the vendor; without it, exactly one complete key/model pair is required. Invalid configuration, failed calls, refusal and truncation return labeled local suggestions without trying another vendor. No model is silently selected. Composio metadata checks methods without treating availability as scope suitability.

**Alternative considered.** Generate the complete plan with an unconstrained LLM on every request. That makes scope invention and inconsistent approval advice harder to detect.

**Tradeoff / remaining gap.** Keyword fallback handles limited language and deliberately declines negated or multi-provider descriptions. Live Anthropic, OpenAI and authenticated Composio calls were not exercised without keys. Controlled responses verify provider selection, wire formats, complete-response checks, local validation and failure behavior.

**Evidence and constraints.** Google classifies compose/read as restricted and send as sensitive. Slack documents separate distribution/admin gates. Composio’s current GitHub FAQ confirms custom GitHub App support with a separate installation link. Anthropic’s current structured-output and version-migration documentation was checked on 30 October 2026; the adapter uses output_config.format and API version 2026-10-21.

**Acceptance criterion.** Golden cases reject invented capabilities, preserve unknown managed scope fit, and choose a GitHub App for repository-scoped background review.

- [Rule engine](https://github.com/infiniym/oauth-atlas/blob/main/lib/advisor/rules-engine.ts)
- [Intent parser](https://github.com/infiniym/oauth-atlas/blob/main/lib/advisor/intent-parser.ts)
- [GitHub toolkit FAQ](https://docs.composio.dev/toolkits/github)
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Anthropic Messages version migration](https://platform.claude.com/docs/en/api/migration-2026-10-21)

## D18 — Use real catalog breadth with explicit coverage levels

**Phase:** Added for the advisor MVP brief

**Objectives:** O3 · Make trust inspectable; O4 · Make knowledge reusable; O5 · Fit the Composio mental model

**Assignment requirements:** R2, R6, R14

**Decision.** Separate catalog names, deep assessments, reference guides and live research drafts.

**Why this approach.** The new brief asks for discoverability across many integrations, while the original assignment asks for a maintained guide library. A searchable name does not establish verified OAuth behavior.

**How it is implemented.** A public docs snapshot contains 1,694 real names and toolkit links. Three providers have rule-backed assessments; other methods and managed availability are unverified. Unknown providers can enter the existing live source reader. Optional Composio API metadata checks exact managed schemes for the selected deep provider.

**Alternative considered.** Create 100 generic OAuth cards or infer managed availability from presence in a toolkit index. Both make the directory look more complete than its evidence.

**Tradeoff / remaining gap.** Catalog-only entries include non-OAuth methods and are labeled accordingly. This satisfies discovery breadth, but the 100 reviewed OAuth-guide library remains partial. Catalog updates are manual and the parser may fail if source markup changes.

**Evidence and constraints.** The official toolkit catalog was read directly. Per-toolkit docs establish OAuth2 managed availability for Gmail, Slack, GitHub and the Slackbot variant; exact scope grants remain a separate check.

**Acceptance criterion.** Search resolves a real catalog provider, coverage is visible, and a catalog-only entry starts research rather than a fabricated assessment.

- [Catalog snapshot](https://github.com/infiniym/oauth-atlas/blob/main/data/catalog.json)
- [Refresh script](https://github.com/infiniym/oauth-atlas/blob/main/scripts/sync-catalog.mjs)
- [Managed method semantics](https://docs.composio.dev/toolkits/managed-auth)

## D19 — Share assessment inputs and export a dated plan snapshot

**Phase:** Added for the advisor MVP brief

**Objectives:** O2 · Keep the developer moving; O3 · Make trust inspectable; O4 · Make knowledge reusable

**Assignment requirements:** R11, R15

**Decision.** Store working inputs locally; encode validated inputs in share URLs; export the rendered plan as Markdown.

**Why this approach.** A reviewer should reproduce the recommendation without an account or a new database service. Input changes must also invalidate stale personal checklist progress.

**How it is implemented.** Strictly validated versioned input links regenerate with current rules. Markdown preserves the current output and evidence. Browser checklist keys depend on assessment inputs, engine version and recommendation route. The share dialog states that descriptions and answers are included.

**Alternative considered.** Silently publish every assessment into the existing public research database. That is unnecessary for the core workflow and would store user product details by default.

**Tradeoff / remaining gap.** Share URLs can be long and are readable by anyone receiving them. They recompute with current rules rather than freezing a historical conclusion; Markdown is the snapshot format. There is no multi-device private assessment account.

**Evidence and constraints.** Browser checks verify share round-trip, Unicode input validation, checklist reload and changed-answer reset. Personal progress is absent from the exported/shared input format.

**Acceptance criterion.** A changed capability produces new permissions, dependencies and checkmarks; a shared link reconstructs the assessment with an explicit current-rules notice.

- [Assessment codec and validation](https://github.com/infiniym/oauth-atlas/blob/main/lib/advisor/assessment.ts)
- [Markdown export](https://github.com/infiniym/oauth-atlas/blob/main/lib/advisor/export.ts)

## D20 — Evaluate recommendation correctness with golden scenarios

**Phase:** Added for the advisor MVP brief

**Objectives:** O1 · Reduce launch uncertainty; O3 · Make trust inspectable

**Assignment requirements:** R7, R15

**Decision.** Test provider decisions and false positives, then verify the full product journeys in the browser.

**Why this approach.** A polished interface can still recommend the wrong app model or introduce an unnecessary approval blocker. Decision cases expose those errors more directly than implementation-mirroring UI tests.

**How it is implemented.** Golden provider scenarios and edge cases exercise scope classification, internal exceptions, Slack pilot/commercial boundaries, GitHub installations, changed answers and AI/metadata failures. Browser checks cover intake through results, persistence, editing, directory, export and sharing.

**Alternative considered.** Treat generated prose, screenshots or a successful build as sufficient correctness evidence. None establishes that the recommendation applies to the input.

**Tradeoff / remaining gap.** Automated fixtures are not provider approvals or measured developer comprehension. Authenticated metadata/AI and real OAuth execution require separate live validation.

**Evidence and constraints.** The evaluation set follows the cases in the supplied MVP brief and uses source-linked rules. No user task-completion metric is claimed.

**Acceptance criterion.** All automated cases pass, the three browser journeys produce their expected decisions, and limitations are stated in the validation notes.

- [Golden cases](https://github.com/infiniym/oauth-atlas/blob/main/tests/advisor.test.ts)
- [Validation notebook](https://github.com/infiniym/oauth-atlas/blob/main/docs/VALIDATION.md)

