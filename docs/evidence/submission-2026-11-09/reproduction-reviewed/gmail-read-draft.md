# Gmail launch plan

Saved version: lp-a59cfcd5-0d56-472a-9ebf-9c1a2a4d1344
Generated: 2026-11-09T10:43:43.781Z
Basis: Reviewed rules
Provider rules were checked against documentation. The product has not created an app, exchanged tokens or obtained approval.

Read email content, Create and manage drafts · Customer accounts · Testing · Managed app candidate

## Your request

Read email content, Create and manage drafts

Actions: Read email content, Create and manage drafts

Who will use the integration?: A limited customer pilot

What are you preparing for?: Development and testing

Must the provider show your own app name during consent?: No

## Recommended path

Start with the managed app to avoid unnecessary provider registration. Scope, identity and organization-policy checks remain required.

Google OAuth web application

## Next action

Check the managed grant before proceeding
Owner: Developer
Inspect the chosen toolkit, its OAuth2 method and scopes. Compare the actual grant with every selected capability. Switch to custom credentials if a required permission is unavailable.
Done when: The actual managed grant and token identity cover every selected action, or you have switched to a custom configuration.
https://docs.composio.dev/toolkits/managed-auth

## Time and effort

Hands-on work: 30–90 minutes
Planning estimate, not a timed setup result. Assumes an existing provider account, a working app/backend and Composio access. Covers configuration and a first test connection; excludes building the feature, review preparation, security remediation and external waiting.

Provider wait: No new developer-owned Google registration is included in this managed candidate path. Confirm the actual permissions and permitted use before assuming you can proceed without additional work.
[Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) · [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app)

Customer and administrator dependencies: Customer administrator turnaround is not known. Check the target organization’s policy and actual permissions during the first connection test.

## Permissions

- **https://www.googleapis.com/auth/gmail.readonly** — Read mailbox content.
  Applies when: This request
  [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes)

- **https://www.googleapis.com/auth/gmail.compose** — Manage drafts and send email; grants sending even if the product only drafts.
  Applies when: This request
  [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes)

## Before the first test

- [ ] **Check the managed grant before proceeding** (Developer)
  Inspect the chosen toolkit, its OAuth2 method and scopes. Compare the actual grant with every selected capability. Switch to custom credentials if a required permission is unavailable.

Done when: The actual managed grant and token identity cover every selected action, or you have switched to a custom configuration.

Destination: https://docs.composio.dev/toolkits/managed-auth

[Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) · [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app)

- [ ] **Use the verified managed Auth Config** (Developer)
  Use managed auth only after the scope and identity checks pass. If they do not pass, create a custom Auth Config instead.

Done when: A usable auth config ID is recorded and its credentials are stored securely.

Prepare: Toolkit; Authentication method; Auth config ID

Destination: https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app

[Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app)

- [ ] **Create a session scoped to the selected toolkit** (Developer)
  Use a stable application user ID. Select your auth config when custom. Expose only required tools; session restrictions do not reduce the external provider’s grant.

Done when: A session exists for the stable test user ID and the intended toolkit/auth config.

Destination: https://docs.composio.dev/docs/configuring-sessions

[Configuring sessions](https://docs.composio.dev/docs/configuring-sessions)

- [ ] **Authorize a representative account** (Developer)
  Use the session’s Connect Link. Check completion and account identity in Composio; a successful callback alone is insufficient.

Done when: The representative connected account reports successful authorization and the correct identity.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- [ ] **Test: Read email content** (Developer)
  Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Use only a seeded test mailbox. For read-only access, inspect that no write scope was granted; do not test a write.

Request: GET https://gmail.googleapis.com/gmail/v1/users/me/messages/TEST_MESSAGE_ID?format=full

```javascript
const response = await session.proxyExecute({
  "toolkit": "gmail",
  "method": "GET",
  "endpoint": "https://gmail.googleapis.com/gmail/v1/users/me/messages/TEST_MESSAGE_ID?format=full"
});
if (response.resultType !== "completed") throw new Error(response.message);
console.log(response.status, response.data);
```

Done when: HTTP 200 with the selected test message id and payload. Record the actual response; this example has not been executed.

Prepare: TEST_MESSAGE_ID: list test messages with GET https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1 and copy messages[0].id

Destination: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get

[Test: Read email content API reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get) · [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute)

- [ ] **Test: Create and manage drafts** (Developer)
  Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Do not send the draft. gmail.compose also grants sending: enforce draft-only behavior in your tool layer.

Request: POST https://gmail.googleapis.com/gmail/v1/users/me/drafts

```javascript
const raw = Buffer.from("From: your-connected-test-account@example.com\r\nTo: your-test-inbox@example.com\r\nSubject: Integration test\r\n\r\nTest message only.").toString("base64url");
const response = await session.proxyExecute({
  "toolkit": "gmail",
  "method": "POST",
  "endpoint": "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
  "body": {
    "message": {
      "raw": raw
    }
  }
});
if (response.resultType !== "completed") throw new Error(response.message);
console.log(response.status, response.data);
```

Done when: HTTP 200 with draft id and message id; the message remains a draft. Record the actual response; this example has not been executed.

Prepare: Use the connected test account as From and a mailbox you control as To; generate raw with the supplied MIME line

Destination: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create

[Test: Create and manage drafts API reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create) · [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute)

## Before customer launch

- [ ] **Server handling adds a security assessment check** (Developer)
  Restricted data stored or transmitted through servers triggers Google’s assessment requirements unless the application qualifies for an exception. Include external AI processing in the data-flow review; a test exception is not production approval.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

[Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

- [ ] **Review launch evidence and unresolved questions** (Developer)
  Record actual results, customer-admin decisions and provider review outcomes. These personal checkmarks do not verify provider approval or execution success.

Done when: Actual test results and outstanding launch gates are recorded.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- **Confirm the managed grant for your feature**: Composio owns the managed registration. Confirm the selected scope set, the permitted use case and data-handling obligations before production. No developer-owned registration is included in this candidate path.
  Applies to steps: managed-fit
  [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app) · [Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

- **Server handling adds a security assessment check**: Restricted data stored or transmitted through servers triggers Google’s assessment requirements unless the application qualifies for an exception. Include external AI processing in the data-flow review; a test exception is not production approval.
  Applies to steps: gate-GOOGLE-ASSESSMENT
  [Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

## Blockers and follow-up

## Integration route

Evaluate managed OAuth first. It is available in the documentation, but scope and token-role fit still need to be verified.

```javascript
const session = await composio.sessions.create({
  userId: "your_stable_user_id",
  toolkits: ["gmail"],
});
// Complete this session’s Connect Link and test selected tools.
// Provider permissions and session tool limits are separate controls.
```

## Prepared materials

### Permissions rationale
https://www.googleapis.com/auth/gmail.readonly: Read mailbox content.
https://www.googleapis.com/auth/gmail.compose: Manage drafts and send email; grants sending even if the product only drafts.

### Auth configuration worksheet
Provider registration: use the managed app only after verifying its actual scope and identity fit.
Toolkit: gmail
Permissions: https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.compose
Record the verified auth config ID.

### First connection test
Authorize a representative account: Use the session’s Connect Link. Check completion and account identity in Composio; a successful callback alone is insufficient.
Done when: The representative connected account reports successful authorization and the correct identity.
Test: Read email content: Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Use only a seeded test mailbox. For read-only access, inspect that no write scope was granted; do not test a write.
Done when: HTTP 200 with the selected test message id and payload. Record the actual response; this example has not been executed.
Test: Create and manage drafts: Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Do not send the draft. gmail.compose also grants sending: enforce draft-only behavior in your tool layer.
Done when: HTTP 200 with draft id and message id; the message remains a draft. Record the actual response; this example has not been executed.

## Sources

- [Toolkit metadata API and managed auth methods](https://docs.composio.dev/reference/api-reference/toolkits/getToolkitsBySlug) — checked 2026-10-30

- [Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) — checked 2026-10-30

- [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app) — checked 2026-10-30

- [Configuring sessions](https://docs.composio.dev/docs/configuring-sessions) — checked 2026-10-30

- [Authentication and connected accounts](https://docs.composio.dev/docs/authentication) — checked 2026-10-30

- [Gmail toolkit authentication](https://docs.composio.dev/toolkits/gmail) — checked 2026-10-30

- [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes) — checked 2026-10-30

- [Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) — checked 2026-10-30

- [Test: Read email content API reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get) — checked 2026-11-02

- [Test: Create and manage drafts API reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create) — checked 2026-11-02

- [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute) — checked 2026-11-02
