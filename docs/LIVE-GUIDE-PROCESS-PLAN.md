# Live Guide: why the loop happened and the proposed process

**Date:** 31 October 2026
**Status:** Implemented locally on 1 November 2026 after review; validation and remaining limits are recorded in [the follow-up evaluation](evaluations/REVIEW-FIXES-2026-11-01.md). The proposal below preserves the original rationale.
**Scope:** The unfamiliar-provider journey, including Linear and apps outside the directory. Keep the shared result experience with Gmail, Slack and GitHub.

## Implementation note — 1 November

Provider discovery now precedes substantive research. Saved pending questions return without a network call. A small requirements response batches consequential choices; final planning follows automatically when no answer is needed. Answered requests do not return to another clarification loop. The final plan has a separate, fallible permission/action review and blocked API-test specifications when exact operations are absent.

The original nullable full-plan output schema exceeded Haiku's grammar limit in real API tests. The implementation therefore uses a small structured requirements response, followed by a locally validated JSON plan, rather than generating a serialized full plan inside a large structured envelope. Thinking remains adaptive at medium effort. This adds a small requirements call to fully specified requests; it avoids discarded full-plan generation and has been recorded as a tradeoff rather than hidden as a one-call implementation.

D1 process records, atomic leases, request fingerprints and checkpoints support reconnects and explicit stage retries. They do not guarantee uninterrupted execution through machine sleep or Worker shutdown, nor exactly-once external billing after an ambiguous interruption. A stale process becomes interrupted and requires an explicit retry. Shared output is frozen separately from process progress.

## 1. What went wrong

The product spent substantial time preparing a result, then presented another prerequisite as though the user had returned to the beginning. Answering that prerequisite invoked the planner again. The repeated **Create launch plan** button and **Research in progress** wording made a continuation look like a restart.

This was a workflow design error. Changing button labels alone would hide the symptom without fixing the repeated computation.

### Evidence from your actual Linear attempt

Request: **“bot that understands tickets”**. Provider: **linear**.

| Saved interaction | What the system did | What you received | Model time | Input tokens | Output tokens |
| --- | --- | --- | ---: | ---: | ---: |
| Initial request | Retrieved eight documents and ran the full planner | “Is linear.app the provider you meant?” | 48.3 seconds | 21,150 | 10,856 |
| After confirming the provider | Reused the documents but ran the full planner again | “Should the bot act as the app itself or as an authorizing user?” | 43.7 seconds | 21,248 | 9,967 |
| **Total before a guide** | **Two full planning calls** | **Two successive confirmation screens** | **92.0 seconds** | **42,398** | **20,823** |

These are recorded model times, not complete end-to-end timings: discovery, document reads and interaction time are additional. Output tokens include the model's thinking; thinking tokens must not be added to that total again.

The first saved record already contained the actor question in `pendingQuestions`. After you confirmed the provider, the application could have shown that saved question immediately. Instead, it called the model before consulting the saved question.

Records inspected:

- Initial: `lg-75d3a80b-d1ba-47d3-ab59-69dc15d01314`.
- After provider confirmation: `lg-8fdada2f-94f3-479d-90d3-1b25ed0ae537`.

**Yes, we wasted model time and tokens.** The second request reused source snapshots; it did not repeat the original eight-page crawl. Calling everything “research” obscured that distinction. This workflow researches and plans; it does not execute an OAuth connection test.

## 2. Why I made the original decisions

There were reasonable objectives behind three safeguards:

| Original objective | Why it matters | Where the implementation failed |
| --- | --- | --- |
| Confirm a provider inferred from a name | A name can identify different companies or products. Researching the wrong provider produces the wrong guide. | Confirmation happened after document collection and expensive interpretation. |
| Clarify choices that change the OAuth path | For example, app identity versus user identity can change authorization and administrator requirements. | The same full-result generator was used to discover questions and to generate the final plan. It could spend heavily on content that was then withheld. |
| Save evidence and carry answers forward | A continuation should retain the research and remember the user's decisions. | Source reuse worked, but there was no explicit process state deciding whether a new inference was necessary. Saved questions were consulted too late. |

I implemented these safeguards inside one generator instead of designing the interaction and its cost boundaries first. That made reuse of the existing parser and result format convenient, but it was the wrong boundary for the product.

There is no technical requirement to generate a full plan before confirming identity, or to regenerate a plan just to reveal a question already stored. Those are implementation mistakes, not necessary costs of using Haiku or enabling thinking.

The earlier tests established that questions and evidence survived a continuation. They did not establish that a continuation avoided unnecessary calls, that questions were shown in a sensible order, or that a user reached a guide within a bounded number of interactions. The successful individual provider runs did not substitute for testing the actual multi-turn journey.

## 3. The experience we should aim for

**One continuing process: identify the provider, settle consequential choices, build the guide.**

The developer should understand what is happening, why a question is necessary, what work has already been retained, and what the next click will do. Answering a question must not look like submitting the original request again.

The principles are:

- Resolve an uncertain provider before expensive research or model planning.
- Ask only unanswered choices that change the path, gathered into one question batch where possible.
- Do not generate and discard a full guide just to ask a question.
- Reuse research, answers and existing results across continuations.
- Show a guide after the normal clarification batch. Remaining uncertainty belongs in that guide, attached to the affected decision.
- Preserve thinking. Reduce unnecessary work and output, rather than turning reasoning off.

## 4. Proposed user journey

### A. Describe the integration

Collect the provider name or website, intended actions and audience when relevant. Preserve everything the developer already entered. Do not ask the same question under different terminology later.

For this Linear example, “understands tickets” does not establish whether the agent only reads, also changes issues, or posts comments. The question check should clarify the intended behavior without adding unrequested capabilities.

### B. Resolve the provider cheaply

If the developer supplied a documentation URL, use that selected provider. If a reviewed provider profile establishes the official identity, display it with a **Change** control.

For an unfamiliar name, first discover the candidate provider. When identity remains ambiguous, ask immediately, before crawling the documentation or calling the planner. Show the provider name and domain so the developer can make an informed choice.

For the first implementation, keep explicit early confirmation for an unfamiliar inferred identity. Removing it for high-confidence search results is a later optimization, requiring a tested confidence policy; a matching domain name alone is not proof of official identity.

Button: **Continue with Linear**. This confirms the provider; it does not claim a guide has been generated.

If identity and a necessary intent question are already known, they may share one confirmation card. Do not invent provider-specific questions merely to combine screens.

### C. Read the relevant evidence once

After identity is settled, collect the source material needed for registration, requested actions and permissions, identity, and distribution. Save snapshots and their provenance.

The interface should say **Reading Linear documentation**, then **Checking your setup requirements**. It should preserve the same request and progress context, with no return to the intake form.

### D. Check for consequential choices before writing the guide

Use a decision-first model task: either return a compact batch of necessary questions or proceed to a plan when the requirements are sufficiently clear. A question response must not include a fully drafted guide that the server subsequently discards.

Examples of useful questions:

- Should this agent only read issues, or also make changes?
- When performing actions, should it act as the app or as the person who connected?

Do not ask the developer whether a provider requires review or administrator approval. Those are facts the research should establish, or identify as unresolved.

Show the question card in the current workspace, with **Continue to my guide** and a brief explanation such as “Your documentation is saved; these choices determine the setup path.” Show all material questions from this pass together, normally no more than three.

A fully specified request should skip the question card. Do not add a mandatory extra model call to every request solely to create the appearance of separate stages.

### E. Build and show the guide

Once the questions are answered, use the saved sources and confirmed choices to generate the guide. Do not repeat provider discovery or the initial crawl.

Allow one targeted evidence follow-up if a missing source fact materially affects the recommendation. That investigation should name the missing fact, avoid already-read URLs, and have a bounded budget. It is different from restarting the whole run.

The normal result is the shared launch-plan view: next action, permissions, representative test, conditional launch requirements, blockers, materials and sources.

A newly discovered ambiguity must not send the user back through another identical “Create launch plan” cycle. Return a partial guide with the affected decision unresolved and dependent actions withheld. An explicit inline update can resolve that issue later using existing evidence. Do not hide uncertainty or guess merely to label the guide complete.

## 5. Process states and permitted work

The backend should own explicit states. The UI should render those states, rather than infer the journey from the presence of questions.

| State | Permitted work | Exit condition |
| --- | --- | --- |
| Resolving provider | Lightweight discovery; no full crawl or planner | Provider selected, or identity confirmation needed |
| Awaiting provider confirmation | Read/write saved selection only | User confirms or corrects the provider |
| Collecting evidence | Bounded source collection and snapshot storage | Sufficient evidence or a clearly reported access limitation |
| Checking requirements | Decision-first interpretation; no speculative full guide for unresolved intent | One batch of material questions, or plan generation |
| Awaiting answers | Serve saved questions; no model work while waiting | All current questions answered |
| Building guide | Interpret saved evidence and confirmed choices; bounded targeted follow-up if necessary | Complete or partial guide saved |
| Guide ready | Display/share/download; no regeneration on reload | Explicit edit, update or refresh |

A request to continue should carry the run identity and new answers. It should advance the existing process, not be treated as a fresh generation request. Source snapshots and immutable shared plan versions remain separate from mutable process progress.

Repeated clicks, a refreshed page, a reconnecting progress stream, or resubmission of the same answers must attach to the existing operation or return its saved outcome. They must not create duplicate paid jobs.

## 6. Model and latency approach

### Recommended design

Keep one shared Haiku configuration with thinking enabled. Distinguish a clarification response from a guide response in the response contract and process state.

- Fully specified request: ideally one substantive planning call.
- Ambiguous request: one compact question-producing call, then one substantive planning call after the answers.
- Provider confirmation: zero model calls.
- Showing saved questions, reloading a guide, or repeating a completed continuation: zero new model calls.
- Targeted evidence follow-up and validation repair: bounded exceptions, recorded separately from ordinary planning.

The model should decide whether clarification is needed before spending its output budget drafting the guide. Merely adding “ask questions first” to the current large-result prompt is insufficient: the contract and backend transitions must support a question-only outcome.

During implementation, verify that the chosen structured-output contract works with the configured API. If a combined decision/plan response proves unreliable, use a small clarification task for genuinely ambiguous inputs. Measure that fallback against the combined approach; do not silently impose an extra call on all requests.

### What we should not do

- Turn thinking off to mask repeated work.
- Replace every question with a guess.
- Hard-code a Linear-only shortcut while leaving the generic flow unchanged.
- Cache one personalized guide across different developers or requirements.
- Promise a fixed time or cost saving before measuring the new journey.

### Provisional performance targets

These are targets for validation, not current guarantees:

| Milestone | Target |
| --- | --- |
| Reveal a saved pending question after identity confirmation | Immediate local/server continuation; zero model or retrieval calls |
| Name-only identity lookup | Usually within 5 seconds; show a recoverable search limitation if it is slow or ambiguous |
| Compact question response | Aim for 10 seconds or less under normal provider/API conditions |
| Final guide from saved sources | Aim for 30–60 seconds; evaluate slower cases separately |
| Ordinary clarification journey | One intent-question batch, with no repeated full-plan generation before the answers |

Log actual durations per stage and cumulative token use per run, including failed calls, repairs and follow-ups. Explain a slow stage accurately in the UI; do not present model interpretation as an OAuth test or repeated crawl.

## 7. Failure and recovery behavior

| Situation | Expected behavior |
| --- | --- |
| Wrong provider | Correct the provider before substantive research. Invalidate only work tied to the old provider. |
| Answer already available | Use it. Do not ask again under a new question ID. |
| Pending question already saved | Display it without another inference. |
| Blocked or unreadable docs | Preserve readable evidence and state the source limitation. Do not loop through unchanged retries. |
| Missing provider policy | One targeted lookup; otherwise a localized unresolved item in the guide. |
| Model failure | Preserve process progress and evidence. Retry the failed stage explicitly, not the whole journey. |
| Browser refresh or disconnected stream | Reopen the saved state and attach to ongoing work. Do not launch a duplicate job. |
| Changed requirement | Preserve unaffected evidence, recompute affected decisions, and save a new result version. |
| Additional critical ambiguity after the normal batch | Show a partial guide with that decision blocked; offer an explicit inline update rather than returning to intake. |

## 8. Validation required before calling this fixed

### Reproduce your exact journey

Use **Linear / “bot that understands tickets”** with name-only discovery.

1. Provider confirmation appears before substantive research and model planning.
2. Confirming identity does not perform a full planning call merely to display a cached question.
3. Necessary action/actor questions appear together, with clear continuation wording.
4. Answering them reuses source snapshots and reaches a complete or explicitly partial guide.
5. Repeating the same answers or refreshing does not create new paid work.

### Broader cases

Cover a fully specified Linear request, Notion read-only content, Asana read/create, a provider outside the catalog, ambiguous provider names, and unavailable documentation. Keep Gmail/Slack/GitHub flows and the common result renderer intact.

Automated checks must assert forbidden work as well as correct output: model-call count, retrieval-call count, stage transitions, answer reuse, duplicate-job prevention and replay after interruption. A test that only confirms a question survived storage is insufficient.

Run a real multi-turn API trace with timings and cumulative tokens, then exercise the UI through that complete journey. Browser automation is currently disabled in Work settings, so visual/interaction verification remains an explicit pending check until available. Do not substitute single-request API success or a production build for the end-to-end interaction check.

For developer experience, the developer should be able to explain: “what it is doing, why it needs this answer, what is already saved, and whether my next click continues or restarts.” That is the acceptance criterion for the progress and question screens.

## 9. Proposed implementation order after review

1. **Correct continuation first:** reveal existing pending questions without a model call; preserve answers; give continuation actions distinct wording.
2. **Move identity resolution forward:** separate lightweight discovery from substantive retrieval and planning.
3. **Add explicit process states and resumability:** distinguish a question checkpoint from a finished guide; prevent duplicate work on repeated submissions and reconnects.
4. **Separate question selection from full guide output:** use the decision-first contract, bounded clarification and a final-result state that cannot loop back silently.
5. **Measure and verify:** exact Linear reproduction, broader provider cases, per-stage timings/tokens and a full UI walkthrough.

This is one coherent workflow change. It should be reviewed as a product/process correction, not declared complete after a button rename or one successful Linear response.

## 10. Review decision

The recommended direction is to keep the useful safeguards, put them before the work they govern, and make continuation state explicit. The cost of thinking is justified when it produces a useful decision or guide; repeating a large inference to reveal an already-known question is not.

This document is the deliverable for the planning step. The implementation and measured validation are linked above; the remaining evaluation requirements are still explicit.
