# Gmail launch plan

Saved version: lp-9581c271-1821-4427-b855-7d87305da209
Generated: 2026-11-03T05:20:40.441Z
Basis: Reviewed rules
Provider rules were checked against documentation. The product has not created an app, exchanged tokens or obtained approval.

Send email · Customer accounts · Testing · Custom app

## Your request

Send email

Actions: Send email

Who will use the integration?: Customers / public release

What are you preparing for?: Development and testing

Must the provider show your own app name during consent?: Yes

## Recommended path

Your requirements justify developer-owned credentials. Follow the scoped plan below and resolve conditional dependencies before launch.

Google OAuth web application

## Next action

Create a Google Cloud project and OAuth client
Owner: Developer
Enable the Gmail API, configure the OAuth audience and branding, and create the appropriate web client. Keep client secrets out of frontend code.
Done when: The test app exists, its identity and callback configuration are recorded, and its credentials are stored server-side.
https://docs.composio.dev/toolkits/gmail

## Time and effort

Hands-on work: 45–90 minutes
Planning estimate, not a timed setup result. Assumes an existing provider account, a working app/backend and Composio access. Covers configuration and a first test connection; excludes building the feature, review preparation, security remediation and external waiting.

Provider wait: This plan checks a personal, internal or testing exception first. No verification wait is assigned until eligibility is confirmed. Reassess before expanding access.
[Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

Customer and administrator dependencies: Customer administrator turnaround is not known. Check the target organization’s policy and actual permissions during the first connection test.

## Permissions

- **https://www.googleapis.com/auth/gmail.send** — Send email without mailbox reading.
  Applies when: This request
  [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes)

## Before the first test

- [ ] **Create a Google Cloud project and OAuth client** (Developer)
  Enable the Gmail API, configure the OAuth audience and branding, and create the appropriate web client. Keep client secrets out of frontend code.

Done when: The test app exists, its identity and callback configuration are recorded, and its credentials are stored server-side.

Prepare: App name; App owner; Test account / workspace; Provider redirect URI

Destination: https://docs.composio.dev/toolkits/gmail

[Gmail toolkit authentication](https://docs.composio.dev/toolkits/gmail)

- [ ] **Configure the permissions listed above** (Developer)
  Add only the selected provider scopes in the appropriate consent or bot/user scope configuration. Reauthorize after scope changes.

Done when: The configured grant matches the permission list and contains no unnecessary access.

Prepare: https://www.googleapis.com/auth/gmail.send

Destination: https://developers.google.com/workspace/gmail/api/auth/scopes

[Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes)

- [ ] **Copy the exact provider redirect URI from Composio** (Developer)
  Begin a custom Auth Config for the correct toolkit and OAuth2 method. Copy its displayed redirect URI into the provider settings; this differs from your product’s Connect Link return URL.

Done when: The exact redirect URI displayed by the Auth Config is saved in the provider app.

Destination: https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app

[Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app) · [Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- [ ] **Finish the custom Auth Config** (Developer)
  Store provider credentials only in Composio/server-side secret configuration. Record the auth config ID; never paste credentials into this advisor.

Done when: A usable auth config ID is recorded and its credentials are stored securely.

Prepare: Toolkit; Authentication method; Auth config ID

Destination: https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app

[Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app)

- [ ] **Create a session scoped to the selected toolkit** (Developer)
  Use a stable application user ID. Select your auth config when custom. Expose only required tools; session restrictions do not reduce the external provider’s grant.

Done when: A session exists for the stable test user ID and the intended toolkit/auth config.

Destination: https://docs.composio.dev/docs/configuring-sessions

[Configuring sessions](https://docs.composio.dev/docs/configuring-sessions)

- [ ] **Check the target organization’s installation policy** (Developer + admin)
  Test a representative account. If installation is restricted, ask its administrator to allow the app and requested access. No administrator turnaround is assumed.

Done when: The described configuration is saved and ready for the next step.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- [ ] **Authorize a representative account** (Developer)
  Use the session’s Connect Link. Check completion and account identity in Composio; a successful callback alone is insufficient.

Done when: The representative connected account reports successful authorization and the correct identity.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- [ ] **Test: Send email** (Developer)
  Run this backend JavaScript with the authorized session created below. Replace the test inputs first. This sends a real test email when you run it. Use only your own test recipient. With a send-only grant, a mailbox read should be denied; inspect the grant first.

Request: POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send

```javascript
const raw = Buffer.from("From: your-connected-test-account@example.com\r\nTo: your-test-inbox@example.com\r\nSubject: Integration test\r\n\r\nTest message only.").toString("base64url");
const response = await session.proxyExecute({
  "toolkit": "gmail",
  "method": "POST",
  "endpoint": "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
  "body": {
    "raw": raw
  }
});
if (response.resultType !== "completed") throw new Error(response.message);
console.log(response.status, response.data);
```

Done when: HTTP 200 with the sent message id; confirm receipt in your test inbox. Record the actual response; this example has not been executed.

Prepare: Use the connected test account as From and a recipient you control as To; generate raw with the supplied MIME line

Destination: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send

[Test: Send email API reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send) · [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute)

## Before customer launch

- [ ] **Check a testing or internal-use exception** (Developer)
  Personal use, qualifying internal Workspace use and development/testing can qualify for verification exceptions. Check eligibility and test-user limits. Reassess before external production.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

[Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

- [ ] **Review launch evidence and unresolved questions** (Developer)
  Record actual results, customer-admin decisions and provider review outcomes. These personal checkmarks do not verify provider approval or execution success.

Done when: Actual test results and outstanding launch gates are recorded.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- **Check a testing or internal-use exception**: Personal use, qualifying internal Workspace use and development/testing can qualify for verification exceptions. Check eligibility and test-user limits. Reassess before external production.
  Applies to steps: gate-GOOGLE-EXCEPTION
  [Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

## Blockers and follow-up

## Integration route

A custom configuration is recommended by your app ownership, permission or provider-model requirements. Managed OAuth availability does not remove those requirements.

```javascript
const session = await composio.sessions.create({
  userId: "your_stable_user_id",
  toolkits: ["gmail"],
  authConfigs: { gmail: "ac_your_config_id" },
});
// Complete this session’s Connect Link and test selected tools.
// Provider permissions and session tool limits are separate controls.
```

## Prepared materials

### Permissions rationale
https://www.googleapis.com/auth/gmail.send: Send email without mailbox reading.

### Registration worksheet
Provider app: Google OAuth web application
Callback: copy the exact provider redirect URI from the auth configuration.
Keep client secrets in your backend or secret manager.
Toolkit: gmail
Permissions: https://www.googleapis.com/auth/gmail.send
Record the verified auth config ID.

### First connection test
Check the target organization’s installation policy: Test a representative account. If installation is restricted, ask its administrator to allow the app and requested access. No administrator turnaround is assumed.
Done when: The described configuration is saved and ready for the next step.
Authorize a representative account: Use the session’s Connect Link. Check completion and account identity in Composio; a successful callback alone is insufficient.
Done when: The representative connected account reports successful authorization and the correct identity.
Test: Send email: Run this backend JavaScript with the authorized session created below. Replace the test inputs first. This sends a real test email when you run it. Use only your own test recipient. With a send-only grant, a mailbox read should be denied; inspect the grant first.
Done when: HTTP 200 with the sent message id; confirm receipt in your test inbox. Record the actual response; this example has not been executed.

## Sources

- [Toolkit metadata API and managed auth methods](https://docs.composio.dev/reference/api-reference/toolkits/getToolkitsBySlug) — checked 2026-10-30

- [Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) — checked 2026-10-30

- [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app) — checked 2026-10-30

- [Configuring sessions](https://docs.composio.dev/docs/configuring-sessions) — checked 2026-10-30

- [Authentication and connected accounts](https://docs.composio.dev/docs/authentication) — checked 2026-10-30

- [Gmail toolkit authentication](https://docs.composio.dev/toolkits/gmail) — checked 2026-10-30

- [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes) — checked 2026-10-30

- [Restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) — checked 2026-10-30

- [Test: Send email API reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send) — checked 2026-11-02

- [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute) — checked 2026-11-02
