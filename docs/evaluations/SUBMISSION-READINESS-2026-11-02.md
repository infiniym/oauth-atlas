# Submission candidate evaluation — 2 November 2026

Baseline: `2944443`. Candidate branch: `codex/submission-readiness`. This is a local implementation and evaluation; nothing was pushed, deployed, uploaded or submitted. The public repository and demo still represent the earlier release. The [submission package](../SUBMISSION.md) records the actual form and proposed contents.

## Assessment of the review

The criticisms are relevant and fair. The previous evidence showed concrete failures beyond Linear: a large official page was unreadable, moved documentation had no useful recovery, authorization was mistaken for a resource action, and a supported GitLab request retained an obsolete blocker. Passing fixture tests did not establish that a new developer could finish a guide. Shared components established a common layout, but did not establish keyboard behavior or narrow-width usability.

The original choices had reasonable purposes: bounded reading limits runtime and context, domain screening restricts arbitrary destinations, a separate access check limits unsupported permission claims, and conservative blockers keep uncertainty visible. The implementation coupled these safeguards to coarse text truncation, prose-based state and generic recovery. The changes retain the safeguards and make their states and recovery more precise. They do not disable thinking or accept unsupported output to manufacture a pass.

The candidate substantially improves these cases, but **unfamiliar-app reliability and hosted release alignment remain incomplete**. Individual successful runs are demonstrations, not a measured reliability rate.

## Changes and their developer impact

| Change | Developer experience | Implementation boundary |
| --- | --- | --- |
| Authorization versus resource actions | Consent remains a setup step without an invented second data request. | Typed action categories; versioned migration for old guides. Genuine administrator prerequisites survive duplicate-step removal. |
| Action-specific gaps | Supported requests clear their obsolete blockers while unrelated gaps remain. | Blockers identify `actionId` and missing `request` or `permission`; resolution uses those facts. Legacy prose is used only to migrate old records. |
| Consistent candidate permissions | Unreviewed access is marked Draft in the permission panel, setup instructions and prepared rationale. | An incomplete independent check cannot certify access. |
| Relevant source selection | Resource requests and least-privilege facts survive large navigation and multi-product docs. | Finite 8 MB response reading; bounded 48,000-character excerpts; OAuth, capability and action-reference context retained; no provider-specific answer branch. |
| Moved or oversized sources | Recovery explains the actual failure and retains the request. | Cross-domain destination requires confirmation and fresh URL/DNS screening. Oversized sources ask for a smaller official reference instead of a blind retry. |
| Focused repair | The selected action can gain a documented request without revisiting intake. | Refreshes the relevant reference, retains old source versions and performs a separate access review. Failed repairs retain the earlier guide. |
| Bounded generation | A saved guide with gaps is distinguished from a documented requested test. | 90-second outer job-stage budget; sanitized validation reasons retained; adaptive thinking remains medium on the shared model configuration. No exactly-once billing guarantee. |
| Checklist and narrow layout | Keyboard focus stays on the toggled checkbox; long text no longer expands the page. | Stable step rendering and constrained URL/code wrapping. |

## Validation

| Check | Result | What it establishes |
| --- | --- | --- |
| Automated suite | **199 passed, 0 failed** | Regression coverage, including generated fixtures. These are not 199 real provider integrations. |
| TypeScript and production build | Passed | Current source compiles and builds. |
| Independent dependencies | Literal `npm ci` succeeded in a temporary source snapshot; no shared `node_modules` | Fresh dependency installation, followed by tests, typecheck and build. No credentials copied. |
| Empty database | All four README migrations passed | Keyless preview saved a Gmail plan and read back identical computed output through HTTP 200. |
| Limited credential scan | No matches in tracked source, reachable history blobs or production output | Known token patterns and literal configured keys only; not a security audit. Values were not printed. |
| Browser | Actual Chrome checks completed locally | Intake, shared result layout, reload, edit retention, checklist focus, developer report, sharing/export and narrow layout; detail below. |
| Actual OAuth execution | **Not performed** | No account connected, token exchanged, resource request executed or approval obtained. |

Evidence is local and ignored under `outputs/submission-2026-11-02/`, with `final-tests.log`, `final-typecheck.log`, `final-build.log`, `npm-ci.log`, `clean-tests.log`, `clean-typecheck.log`, `clean-build.log`, `clean-migrations.log`, `clean-acceptance.json` and `credential-scan.json`. An incomplete incremental source copy caused a final harness module-resolution failure; the complete snapshot was reconstructed and all checks passed (`clean-harness-note.txt`). These are local QA artifacts, not runtime dependencies or public deployment evidence.

## Real model and documentation checks

Cases were selected before the final runs, including an OpenProject holdout with no catalog match. The configured Anthropic Haiku model used adaptive thinking at medium effort. Earlier failures and intermediate outputs remain recorded; direct production-function diagnostics are distinguished from HTTP jobs.

| Case | Observed outcome | Evidence and limits |
| --- | --- | --- |
| Notion, shared page titles and content | A final full HTTP job completed in **62.3 seconds**, with two concrete cited read requests and `Read content` mappings accepted by the independent check. | `notion-http-final.log`, `notion-result.json`. One validation repair occurred; earlier failures remain recorded. Zero-call guide refresh left the previous snapshot unchanged (`final-notion-guide.json`). No resource call was executed. |
| Dropbox, App Folder metadata | A real targeted repair completed in **24.1 seconds**, documenting `POST https://api.dropboxapi.com/2/files/list_folder` with `files.metadata.read`, appropriate JSON and a completed independent access check. | `dropbox-repair-final.log`, `dropbox-repair.json`. Production-function call with real reader/model, then stored through a helper for UI QA; not a fresh full HTTP-generation success. Earlier full attempt reached the 90-second budget; another saved a request but left access review unresolved. |
| GitLab, project repair | Focused documentation repair completed in **17.5 seconds**, with a concrete projects request and reviewed `read_api` mapping. | `gitlab-repair.log`, `gitlab-documentation.json`. Separate zero-model replay clears the old project blocker while the merge-request gap remains (`gitlab-replay.json`). This is not fresh full GitLab generation. |
| Todoist, read tasks | Large documentation is now readable and a concrete tasks request and exact `data:read` quote were retained. **Independent access check remained incomplete**, so the requested test remains blocked. | `todoist-resource-context.log`, `todoist-resource-context.json`; latest direct run **59.1 seconds**. This is partial progress, not a usable-guide pass. |
| OpenProject holdout | **No usable guide**: the run ended after **58.7 seconds** with OAuth support unestablished by validation. | `holdout-openproject-revised.log` and associated JSON. Evidence retained; no successful generalization claim. |
| Dropbox moved URL | Actual HTTP job stopped with `source-moved`, supplied the destination and offered confirmation without a model call. | `moved-documentation.json`, screenshot `06-moved-source-recovery.png`. Destination continuation was not clicked in this browser check; safe confirmation behavior has automated coverage. |

At least two independent providers now have concrete source-supported resource requests through real generation/repair. That satisfies a narrow demonstration; it does not establish the review's stronger condition of two fresh, hosted, full-flow successes. That condition remains a release check.

## Browser findings and checks

Fresh screenshots are in the same evidence directory:

| Journey | Result / evidence |
| --- | --- |
| Reviewed Gmail intake and confirmation | Completed; `01-entry.png`, `02-confirmation.png`, `03-gmail-result.png`. Shared shell and result sections match live rendering at the same desktop viewport. Gmail read-versus-send decisions, Slack/GitHub variants and public-API behavior also have automated coverage; they were not all clicked end to end in this pass. |
| Reload during Notion research | Same saved job and full request retained; no new job intentionally submitted. `04-research-reload.png`. Runtime suspension may still require an explicit retry. |
| Final Notion result and edit | `07-notion-result.png`, `08-edit-requirements.png`. Edit retains all 188 request characters and customer audience; reload returns the saved guide without a new research action. This does not claim a newly submitted edited guide was generated. |
| Focus | Reproduced focus falling to the body after a checklist toggle, then verified Space leaves focus on the same checkbox after the rendering fix. |
| Record my check | Clearly marked QA-only unresolved report saved; zero model calls and `setupTested=false`. UI still says the product has not verified the result. No provider setting was checked. |
| Copy, download and share | Copy displayed Copied; a fresh tab showed the same saved version. Markdown file `dropbox-launch-plan.md` was downloaded (16,105 bytes, expected heading). The tool's download-event observer timed out, but the actual file was verified; this is not recorded as a product download failure. |
| Narrow layout | At 390 px viewport width the shared Dropbox page measured 390 px document width after wrapping fixes; long code remains internally scrollable. `05-live-mobile.png`. Viewport override was reset. This is desktop-browser emulation, not physical-device testing. |
| Failure recovery | Moved-source screen names the destination, preserves request state and avoids a generic retry button; `06-moved-source-recovery.png`. Oversized recovery has automated coverage, not an additional visual screenshot. |

Focused repair was tested with real production functions and model calls, rather than repeated through every browser button. Share testing used a new tab in the same Chrome profile, not a new anonymous browser profile. The temporary empty-database preview separately verified keyless HTTP behavior.

## Remaining release work

1. Diagnose why Todoist's independent review remains incomplete and get a useful holdout result or a clearer source-backed recovery. Do not remove the check or fabricate OAuth support.
2. Select a release commit and update the existing public repository and hosted demo together only when requested. Run fresh hosted full-flow checks and verify quota; local success does not establish Cloudflare post-disconnect execution or hosted model configuration.
3. Recheck both links without an owner-only session. Replace the draft release label in the overview with the verified release identifier, then verify the form's accepted file type. The observed form allows one supported file up to 100 MB; its type allowlist was not exposed by the blank upload frame.

The short README, linked architecture notes, proposed two-page overview and optional notes draft are prepared. **Preparing these materials is the current scope; no submission action is authorized.**
