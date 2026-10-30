# OAuth Launch Advisor: the journey and why it works this way

Updated 30 October 2026 · Current local implementation

**The journey is: describe a feature or choose an app → confirm the few requirements that matter → get a setup plan.** This revision removes the separate actions/context screens, competing demo sections and extra sidebar groups.

## 1. Start with the developer’s problem

“I want an assistant that reads customers’ Gmail messages and drafts replies. Do I need to register an app? What access does it need? What might delay launch?”

The developer knows the feature. The product should translate that into a setup decision, expected work and a next action, without requiring the developer to learn OAuth terminology first.

An OAuth app identifies the developer’s application to the provider. Composio’s managed app can avoid a new registration when it fits. Each customer still authorizes their own connection; managed availability alone does not establish permission fit.

## 2. The homepage, in reading order

| Element | User need / reason for its position | What happens |
| --- | --- | --- |
| **“Go from integration idea to launch plan”** | Establish the outcome before requesting input. | Explains that the product helps choose setup and identify work/delays. |
| **“What are you building?”** | Start with the feature the developer already understands. | **Understand my use case** suggests a provider/actions, then opens confirmation. |
| **Example prompts inside the input** | Help someone understand how to describe a feature without creating another journey. | Fill only the description. They do not silently choose production, branding or data-processing answers. |
| **“Or choose your provider”** | Support someone who prefers direct selection. This is an alternative to typing, not another required step. | Gmail, Slack and GitHub open the same confirmation screen. Their order is an example sequence, not a ranking. |
| **“Working with another app?”** | Explain the route when one of the three supported assessments does not fit. | Open the directory or start documentation research. The limitation is stated before clicking. |

The full directory no longer repeats below the provider choices. The separate “Try a complete scenario” section is gone: examples belong beside the input they help explain.

The visual reference is Composio’s documentation: restrained headings, readable text, persistent navigation and section links for long plans. This adapts public docs; it does not claim to reproduce the authenticated platform. Instructions and explanations are approximately 16px with stronger contrast. Smaller text is reserved for secondary labels. Slack, GitHub and Notion use bundled provider marks instead of placeholder characters.

## 3. One confirmation screen

The developer sees **“One quick check before your plan.”** Actions and relevant setup questions now live together. There is no separate Continue-to-context step.

### The description has a clear contract

The original request is read-only. **Change request** opens an editor; **Review new suggestions** reruns interpretation and previews proposed actions/context changes. **Apply revised request** applies them. Cancel preserves the current assessment.

For the same provider, existing launch answers are retained unless new interpretation supplies a replacement for a supported input. Switching providers resets context that may no longer apply. Changing a description cannot silently leave the old actions pretending to represent the new request.

### Confirm what the feature does

Gmail offers reading, metadata, drafts, sending and modification. Slack separates reading public/private channels and posting. GitHub separates identity, code, PR reads, reviews and PR creation. These options exist because different behavior needs different access.

The description parser currently uses labeled keyword suggestions without configured AI. Anthropic/OpenAI support is optional and server-side. AI suggests inputs; fixed, source-backed rules determine the plan. A model key does not replace the confirmation step.

### Ask only what changes the setup

| Choice | Why it matters / when it appears |
| --- | --- |
| Audience and testing versus production | Gmail and Slack use these to select relevant review, exception and distribution guidance. |
| Own app name during provider consent | Determines whether a managed app is a candidate. Omitted when another requirement already requires a developer-owned app. |
| Gmail production data processing | Restricted data passing through servers or remote AI can affect security-assessment obligations. Not required just to plan a development test. |
| Internal Google Workspace use | Required for a developer-owned, organization-only production app before evaluating an internal-use exception. |
| Slack actor | “My app / bot” versus “the person who connected” explains the practical choice without requiring token terminology. |
| GitHub repository boundary | Determines public versus installation-granted access. Background operation is asked only when it could still change the app model. Selected-repository work does not also ask redundant background/branding questions. |

**Critical questions require a definite answer.** Create launch plan stays disabled until they are answered. The developer needs to know these requirements; the product does not add branching plans or guess on their behalf. Old incomplete shared assessments also return to confirmation.

**Later checks are different.** Customer-admin restrictions and managed permission fit can be investigated during setup. They become explicit tasks instead of blocking intake. Additional scopes, quota and custom-instance requirements remain under an optional disclosure for developers who already know they need them.

## 4. The plan answers “which path, how long, what next?”

| Reading order | Reason |
| --- | --- |
| Recommendation, app model and next action | Give the decision and a place to start immediately. |
| Time and effort | Reveal the work and outside waiting before the developer starts execution. |
| Why this recommendation? | Explain which answers caused the decision; expandable for readers who want the detail. |
| Managed suitability | Explain whether registration can be avoided. The general comparison table is collapsed initially. |
| Permissions | Connect each requested grant to the feature. Agent tool limits are explained separately from provider permissions. |
| Launch dependencies and checklist | Identify gates, then turn the path into concrete tasks with owners. |
| Open checks and sources | Keep unresolved work and supporting evidence inspectable. Important source links also appear beside claims. |

### Timing is guidance, not a launch date

| Setup path | Hands-on planning range |
| --- | --- |
| Candidate managed connection | 30–90 minutes |
| Custom Gmail | 45–90 minutes |
| Custom Slack / GitHub App | 1–3 hours |
| Simple GitHub OAuth App | 30–60 minutes |

These are **author estimates, not measured setup results**. They cover configuration and a first test connection, assuming account access, a working app/backend and Composio access. They exclude feature development, review preparation, remediation and external waiting. They need calibration through timed setup attempts.

Provider review is separate. Google’s published baseline is about 10 business days for sensitive-scope verification or six weeks for restricted-scope verification. Applicable independent security assessment timing remains unverified. Slack publishes separate preliminary and functional Marketplace review estimates; a customer pilot does not automatically inherit those waits. The product applies figures only to the matching path and links the source. Customer-admin turnaround stays a separate check. Review stages are not added into a promised total.

### Change or share the plan

**Edit requirements** returns to the same confirmation screen. For example, switching Gmail read/draft to send-only recalculates permissions and review guidance. Personal checklist state is separate for changed requirements.

**Copy** transfers the plan into a task/message. **Markdown** keeps a dated snapshot, including timing assumptions and sources. **Share** carries readable answers and recalculates under current rules. **Print** supports offline reading. Checkmarks stay in this browser; they do not prove provider approval.

## 5. Unfamiliar apps: what works today

The directory searches real Composio toolkit names. The three supported apps offer **Create plan**; other entries offer **Research docs**. No match still lets the developer submit a name or website.

Research searches for public documentation, reads up to four pages, and saves excerpts, links and questions to check. Ordinary code performs this work. It does **not** reliably interpret every provider policy or select a complete setup for the feature.

Adding an Anthropic key currently improves description interpretation only. Deeper unfamiliar-app analysis needs its own integration. The research dialog explains the current limitation before collecting inputs. The 1,694 catalog names are not 1,694 validated guides; the original 100-guide target remains incomplete.

## 6. Navigation follows the main task

The sidebar contains only **Launch advisor**, **Provider directory** and **How it works**. These mean start, find an app and get optional help.

Guided assessments duplicated homepage/directory entrances. “Your workspace” suggested a shared account system that does not exist. “Project notes” mixed developer reference guides with submission evidence. Those groups are removed.

Useful destinations survive as secondary footer resources: reference guides, browser-saved guide bookmarks, validation, decision log and source. Saved guides still bookmark reference/research guides; advisor drafts resume separately. They are not presented as a unified workspace.

## 7. Decision log for this revision

| Decision | Developer objective | Tradeoff |
| --- | --- | --- |
| One confirmation screen; only path-changing questions required | Reach a correct plan with less navigation and fewer irrelevant choices. | Developers must settle critical requirements before proceeding. |
| Read-only request plus explicit reinterpretation/review | Keep the visible request and selected actions consistent. | Revising the request requires an explicit apply action. |
| Separate setup estimates, provider review and admin checks | Give useful timing guidance without false certainty. | Setup ranges are unmeasured; not every external dependency has an estimate. |
| Examples within intake; directory in one place | Reduce competing starting points. | Browsing the full catalog takes a navigation action. |
| Three main links; evidence in secondary resources | Keep the developer journey distinct from submission review. | Reference/evidence material is less prominent. |
| Readable text and recognizable marks | Make instructions easier to follow and providers easier to recognize. | Larger text uses more space; responsive layouts need checking. |

These replace earlier choices that copied the brief’s sections too literally and retained too much of the original guide-library shell. The fuller history is in [DECISIONS.md](DECISIONS.md), especially D21–D23. The history explains the accumulation; it does not defend every old placement.

How it is built: `components/advisor.tsx` handles the journey; `lib/advisor/requirements.ts` defines required/relevant choices; `rules-engine.ts` selects the plan; `timing.ts` supplies scoped estimates; `export.ts` carries the result into Markdown. `app/page.tsx` contains navigation. Unfamiliar-app research remains separate in `lib/research.ts`.

## 8. Evaluate it through tasks

1. Describe a Gmail read/draft feature. Confirm suggestions and understand why each required answer matters.
2. Leave one critical choice unanswered: no firm plan should be generated. Leave customer policy unchecked: it should become a task.
3. Create the plan and explain back the app model, setup estimate, applicable review wait and next action.
4. Change the request to Gmail send-only through the review/apply controls. Confirm that actions, permissions and timing guidance change together.
5. Try selected-repository GitHub work: irrelevant branding/background questions should disappear. Try Slack pilot versus commercial production: review guidance should differ.
6. Research an unfamiliar app: understand that the output is documentation to review, not an approved setup plan.
7. Share/export: another developer should understand the inputs, result and limits without a verbal walkthrough.

Judge whether developers can choose, explain and act. Automated and browser checks establish behavior and rule consistency—not measured usability, completed provider setup or approval. See [VALIDATION.md](VALIDATION.md) for evidence and [DESIGN.md](../DESIGN.md) for the Composio reference.
