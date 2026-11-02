# Submission package — preparation only

Verified in the actual Chrome form on **2 November 2026**. No values were entered, no file was uploaded and nothing was submitted. The user asked to determine the package, not submit it.

## Actual form

[Assignment submission | APM role](https://docs.google.com/forms/d/e/1FAIpQLSfNjhzQN8n_7BpCc1vsLtFyBfe_iCiCHAG4ZT0GFmP_Zh4vfw/viewform?pli=1)

| Field | Requirement | What to prepare |
| --- | --- | --- |
| Candidate Email id (used to submit application) | Required | The exact email used for the original application; leave this for the candidate. Do not infer it from the signed-in Google account. |
| Upload your submissions here | Required; **one supported file, maximum 100 MB** | A short PDF overview containing both public links, the tested release, three starting journeys, decisions, validation and limitations. The file-type allowlist was not exposed by the upload dialog; verify acceptance when uploading later. |
| Notes to the hiring team (incase any) | Optional | Short orientation plus the demo and repository links, repeated so they are visible without opening the attachment. |

The form says the Google account's name, email and photo will be recorded on upload/submission. It asks candidates to use their original application email and says to expect a response within five working days. That is a response expectation, not a guaranteed decision date.

## Recommended single attachment

`oauth-launch-advisor-overview.pdf`, two pages:

1. Problem and chosen scope; clickable demo and repository links; the release identifier; how to try Gmail, Slack/GitHub and a verified unfamiliar-app scenario.
2. Why the product works this way; evidence from successful and failed runs; clear boundaries between source support, developer reports and executed setup; setup directions through the README.

Do not upload source archives or secrets by default. The assignment asks for a working experience and source repository, plus a short README. A PDF can carry those links within the form's single-file requirement. A short walkthrough video may support the demo later; it is not required by the observed form.

## Optional notes — draft

> OAuth Launch Advisor helps developers choose an OAuth setup and work toward a first representative API test. Working experience: https://oauth-atlas.mossystar19.chatgpt.site/ . Source and setup instructions: https://github.com/infiniym/oauth-atlas . Start with Gmail read-versus-send, then try the live-research example documented in the attached overview. The README distinguishes documented guidance, developer-reported checks and setup that has not been executed. The scope is a few varied providers plus live generation, not 100 finished guides.

Use that text only after both URLs serve the selected tested release. The existing public links currently represent an earlier release. The local PDF is a **review draft**, not evidence that release alignment has happened.

## Before a later submission

- Select the release commit after the evaluation passes; update the public repository and hosted demo to that same release only when authorized.
- Verify the actual hosted live flow from a new session with server-only secrets and enough quota for the reviewer. Local success does not establish hosted success.
- Replace stale screenshots and record the public release/commit in the README and overview.
- Test both public links without depending on an owner-only session. Keep the few varied examples and holdout outcome honest.
- Fill the candidate email, verify the attachment type/size and re-read the notes. Upload and Submit are separate user-controlled actions.
