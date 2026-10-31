# OAuth Launch Advisor: current product journey

Updated 31 October 2026. This describes the combined local implementation, not the older hosted deployment.

## One starting point

The developer enters a provider name or website and describes what their integration should read or change. The provider does not need to be in the directory. Gmail, Slack and GitHub shortcuts use reviewed rules; other apps use fresh research. These are evidence strategies beneath one product, not different result experiences.

The directory supplies discoverability and provenance. Its primary action is **Create plan** for every provider. Catalog presence does not certify an OAuth method, managed grant or tool coverage. Earlier scenarios are **Reference notes**, with their scenario and evidence dates preserved; they are not a fresh assessment of the user's feature.

## Confirm consequential choices

Reviewed providers use a constrained capability map and relevant setup questions. Description interpretation is a suggestion, never a permission or policy decision. The developer reviews it before producing a firm result. Changing a request previews new suggestions before applying them.

Research collects audience and optionally a direct documentation URL, reads public evidence, then asks at most three intent questions at a time. Questions must change app model, permissions or distribution. Provider policy gaps become research tasks/blockers rather than questions asking the developer to know the policy. Inferred provider identity is confirmed without discarding other pending questions.

The same shared Anthropic configuration powers intake and evidence interpretation, with adaptive thinking at medium effort. Keys and reasoning text stay server-side. The keyless reviewed workflow remains available. Unsupported configuration or failed interpretation preserves source findings rather than inventing a complete plan.

## One plan layout

| Section | Decision it supports |
| --- | --- |
| Recommended path and provenance | What should I build, and is this based on reviewed rules, current research or reference notes? |
| Next action | What can I do now, who owns it, which fields should I prepare, where are the instructions, and what counts as done? |
| Time and effort | How much hands-on setup is estimated, what depends on provider waiting, and what depends on a customer administrator? |
| Permissions and action coverage | Which grants support the requested behavior, and where is coverage unresolved? Tool restrictions do not narrow provider grants. |
| First working test | How do I prepare the app and test a representative account independently of customer rollout? |
| Before customer launch | Which production gates apply, under what conditions? Optional listing, provider review and administrator approval are different. |
| Blockers and follow-up | What prevents testing, what prevents launch, and what can be checked while working? |
| Prepared materials | Permission rationale, registration worksheet, first-test procedure and provider clarification drafts, ready to copy. |
| Sources and request | What supports the plan, when was it read, what was confirmed, and what has actually been tested? |

All three known providers, live results and reference scenarios render through `LaunchPlanView` in `AppFrame`. Evidence badges explain their different basis without introducing a different visual system.

## Sharing and editing

**Share** saves the dated plan and inputs. A reviewed plan receives an `lp-…` snapshot ID; research uses its `lg-…` record. Both open under `/plan/…`. Existing live-guide URLs remain compatible. A link is public to anyone receiving it; the input asks for public details and excludes credentials.

**Edit requirements** creates another plan/version. It does not mutate a previously shared result. Markdown carries the same request, recommendation, test/launch stages, owners, completion criteria, blockers, preparation drafts and sources. Checkmarks remain on the current device and are not evidence that setup or approval happened.

Legacy encoded assessment URLs still open; newly shared results use database snapshots rather than recalculating on every visit.

## What generic research can and cannot establish

The reader prioritizes registration, permissions/capabilities, actor identity and distribution. Action-related API references are candidates when generic scope pages leave a gap. One targeted follow-up can append new sources and reinterpret them. Redirect aliases do not count as new evidence.

The model selects numbered source passages. Local validation checks exact quotations, selected permission identifiers, known destinations and published-duration consistency. This is evidence correspondence, not semantic proof. Missing facts, access failures and unresolved policy applicability remain visible. A limitation for one provider product does not establish a blanket OAuth denial for every product.

Real checks cover a small varied set: Linear app actors, Notion read-only content, Asana task reads/creation and a public API with no OAuth requirement. They have exposed failures, redundant questions, context loss and unresolved review details. They do not establish reliable results for every possible app. No provider app registration or token exchange has been completed.

## Developer evaluation

1. Describe Gmail read/draft, confirm the relevant inputs, and explain the next action and actual scope boundary.
2. Leave a consequential input unanswered: no firm reviewed plan should result. Leave organization policy unknown: get a concrete follow-up task.
3. Change Gmail to send-only. The permission set and review guidance should change together, with separate personal progress.
4. Compare a Slack customer pilot with broad commercial distribution, and GitHub public reads with selected-repository automation.
5. Create a plan for a provider outside the directory. Compare its layout with the reviewed results, inspect exact evidence, and distinguish test preparation from launch conditions.
6. Try unreadable/ambiguous documentation or a public API. The product should expose the limitation without fabricating OAuth steps.
7. Share and reopen a dated plan. Another developer should understand its inputs, next action and unresolved gates without a verbal walkthrough.

Automated/API checks establish behavior and source correspondence. Developer comprehension, time-to-first-working-connection and actual provider acceptance still need observed user tasks and real grants. See [validation](VALIDATION.md) and [the current evaluation](evaluations/UNIFIED-2026-10-31.md).
