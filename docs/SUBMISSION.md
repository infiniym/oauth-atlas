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

`oauth-launch-advisor-overview.pdf`, one page. The reviewer-facing copy is in [the product overview](SUBMISSION-OVERVIEW.md).

Follow the developer's journey: why they get stuck, why the product begins with their feature, how they move from a request to a first test, and the considerations behind that flow. Keep a short statement of current limits. Put installation details and test evidence in the repository. This preparation checklist and release checks are internal; they do not belong in the attachment.

Do not upload source archives or secrets by default. The assignment asks for a working experience and source repository, plus a short README. A PDF can carry those links within the form's single-file requirement. A short walkthrough video may support the demo later; it is not required by the observed form.

## Optional notes — draft

> OAuth Launch Advisor helps developers turn an integration idea into a setup plan and first test. Demo: https://oauth-launch-advisor.gharkagpt1.chatgpt.site/ · Code: https://github.com/infiniym/oauth-atlas . The attached overview explains the problem, developer journey and product choices.

Use that text only after both URLs serve the selected tested release. Use the current hosted release and matching source listed in the hosted evaluation. The local PDF remains a review draft until the hosted checks are complete.

## Hosting

The replacement Site was created in the current account on 2 November 2026. It uses the tested source, server-side model secrets and a fresh D1 database. The earlier host remains untouched in the other account, with its existing saved guides. No Oracle Cloud infrastructure is required. See [hosted checks](evaluations/HOSTED-2026-11-02.md) for the deployment and verification result.

## Before a later submission

- Select the release commit after the evaluation passes; update the public repository and hosted demo to that same release only when authorized.
- Verify the actual hosted live flow from a new session with server-only secrets and enough quota for the reviewer. Local success does not establish hosted success.
- Replace stale screenshots and record the public release/commit in the README and overview.
- Test both public links without depending on an owner-only session. Keep the few varied examples and holdout outcome honest.
- Fill the candidate email, verify the attachment type/size and re-read the notes. Upload and Submit are separate user-controlled actions.
