# Source and evidence audit - 2 November 2026

This audit separates the existing release, saved successes, new fresh jobs and unpublished experiments. No further deployment was made during the audit.

## Identity verified

Workspace: `/Users/pankajgupta/Documents/ChatGPT/composio/oauth-atlas`, branch `codex/submission-readiness`.

Canonical host: https://oauth-launch-advisor.gharkagpt1.chatgpt.site/

Site project: `appgprj_6ae839b761e481918abbcbe141303d16`. Native Sites version records confirm this history:

| Site version | Saved source commit | Meaning |
| --- | --- | --- |
| 2 | `38160c99693abd216676f26eaf8134835781e0b4` | Release present when the completion plan and this implementation task started; still GitHub main at this audit. |
| 3 | `1d401e3084c744d0c7b92263cd8d2220f627213e` | First candidate published during this implementation task. Its build endpoint incorrectly embedded the parent commit because building preceded committing. Native version identity identifies the actual candidate. |
| 4 | `fdf2399fe19b0aaabf352464ad0a5fbb27e25f7b` | Current deployed candidate. The anonymous `/api/release` response independently matches this commit. |

Current deployment: `appgdep_6ae84d0d90408191b8c1d95e2b7f5e58`.

The GitHub candidate branch `codex/completion-2026-11-02` and local HEAD both resolve to `fdf2399`. Uncommitted prompt `live-guide.11` and client-monitor experiments are newer local work; they are not deployed and must not be attributed to the hosted candidate. Current candidate is not submission-ready.

## Earlier successful checks are real

The original tracked evidence remains unchanged. Its Notion input exactly equals the Notion input frozen in the current cases file.

| Original check | Actual result |
| --- | --- |
| Fresh Notion, 73.5 seconds | Failed endpoint validation; no complete guide. |
| Notion recovery, 75.8 seconds | Adding the specific official reference produced both read mappings with completed independent review. The old version stayed unchanged. |
| Fresh Dropbox, 75.3 seconds | Folder listing was mapped and reviewed; continuation was unresolved. A ready job was therefore a partial guide. |
| Dropbox recovery, 34.6 seconds | New source was consumed and prior snapshot retained; continuation still unresolved, with field-length errors recorded. |

Anonymous readback during this audit still returns the recovered [Notion guide](https://oauth-launch-advisor.gharkagpt1.chatgpt.site/plan/lg-a66d41a6-cae4-4cb8-ac4e-0ad5674ea86c) and the original [Dropbox guide](https://oauth-launch-advisor.gharkagpt1.chatgpt.site/plan/lg-96ecc47a-9af2-4914-ba61-5af8bdedafc7), with the original `live-guide.9` dates and mapping states. A new failure does not erase those earlier successes. The recovered Notion example does not establish that the original fresh-generation job passed.

## New checks must not be described as old defects

Candidate 1 ran the seven declared fresh journeys. The harness recorded one usable task pass (Todoist) and six failures, including omitted boundary instructions and unresolved actions. These are new candidate results, not a rerun of the old release. Full records are retained in `../evidence/completion-2026-11-02/candidate-1/`.

Candidate 2 created Notion and Dropbox jobs before the client connection was interrupted. Readback of those same job IDs shows that the server also failed: Notion returned malformed model field types and failed recovery; Dropbox reached 180 seconds. The remaining five records are transport failures before a job was created, not five completed fresh generations. They remain in `candidate-2/`; successful later jobs must not overwrite them.

Some defects were introduced by this implementation work. In particular, the replacement compact prose contract permitted `fields` strings and oversized summaries where the previous contract expected arrays and bounded text. Treating every new Notion failure as a rediscovered baseline problem was incorrect. The next accepted candidate needs a fixed-version comparison and complete handoff checks, with no broad source or prompt rewrite justified only by a passing saved example or unit suite.

## Verification boundaries

No provider account was connected, no resource request or approval was executed, and no hiring application was uploaded or submitted. Public checks used no owner cookie or bypass token. Source correctness, current browser checks, recovery, the complete two-round hosted matrix and final package alignment remain required before a ready judgment.

## Controlled comparison

A detached, unchanged checkout of `38160c9` was run with the **original recorded inputs** and the same model configuration. Notion completed in 67.0 seconds with two read requests, `Read content` mappings reviewed, and the documentation-derived `Notion-Version: 2026-03-11`. Dropbox took 93.0 seconds, generated listing and continuation requests, but did not complete independent mapping review. This confirms working Notion behavior and the narrower unresolved Dropbox check; it does not support saying both old journeys were wholly broken.

The unpublished candidate using the original Notion input took 152.8 seconds and required automatic action repair. A second instrumented diagnostic took 138.4 seconds. Its exact planning messages showed that the reader had fetched the Markdown operation but the per-action top-two ranking supplied only page metadata and page-property references to both full planning calls. The targeted action repair finally received the omitted operation and succeeded. The fix retains retrieved operation references ahead of generic schemas, with the same bounded context and unchanged endpoint/citation validation. Required version constants also receive priority in a small version-page context. The baseline full generation contract has been restored; the experimental replacement is not the new baseline.

The Dropbox controlled comparison used its original OAuth-doc entry point. The frozen completion case deliberately uses the ordinary developer home and explicitly requires continuation through all entries; these are different inputs. Future matrix records preserve both input and deployed source identity, actual request-stub inspection, and the normal/recovery timing gate.

## Scope correction after the account audit

The current Sites connector was rechecked and returned `Sites project not found` for the canonical project. The user then explicitly deferred all Sites publishing, requested local completion, and proposed Vercel deployment later. Further deployment and GitHub pushes are on hold. The hosted `3a8059d` is a dated candidate, not the final local release. Desktop is the requested UI scope; mobile/narrow layout is no longer an acceptance gate.

Linear and Forgejo now serve as required regression cases because their failures informed fixes. Asana and ClickUp are declared in `cases.json` for subsequent blind validation, before their documentation is researched. They will not replace any failing original case.

## 3 November readback

The anonymous Sites release endpoint returned `3a8059ddaf14516efe5556c6c43e941999195a21` and prompt `live-guide.11`, matching the public candidate branch. GitHub main remained `38160c99693abd216676f26eaf8134835781e0b4`. The recorded Sites deployment is version 5, `appgdep_6ae8a54fbd448191a479b0221a2f5118`. The local preview has advanced beyond both public refs. The [local evaluation](LOCAL-2026-11-03.md) identifies the running build, acceptance outcomes, and remaining gates.
