# GitHub launch plan

Saved version: lp-e48bae1a-356b-4e47-8bd2-2a2f7a571256
Generated: 2026-11-09T10:24:39.485Z
Basis: Reviewed rules
Provider rules were checked against documentation. The product has not created an app, exchanged tokens or obtained approval.

Read repository contents · Customer accounts · Testing · Custom app

## Your request

Read repository contents

Actions: Read repository contents

Which repositories should it access?: Repositories each customer selects

## Recommended path

Use your own GitHub App for the selected automation, configure it in Composio, and install it separately on customer repositories.

GitHub App

## Next action

Register your GitHub App
Owner: Developer
Choose ownership, callback configuration and installation visibility. Keep credentials in your server’s secret store.
Done when: The test app exists, its identity and callback configuration are recorded, and its credentials are stored server-side.
https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app

## Time and effort

Hands-on work: 1–3 hours
Planning estimate, not a timed setup result. Assumes an existing provider account, a working app/backend and Composio access. Covers configuration and a first test connection; excludes building the feature, review preparation, security remediation and external waiting.

Provider wait: The documented registration/install path does not identify a general provider review queue. This does not remove customer organization approval or any separate Marketplace requirements.
[Register a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)

Customer and administrator dependencies: Customer administrator turnaround is not known. Check the target organization’s policy and actual permissions during the first connection test.

## Permissions

- **Contents: read** — Inspect repository code.
  Applies when: This request
  [Repository contents API permissions](https://docs.github.com/en/rest/repos/contents)

## Before the first test

- [ ] **Register your GitHub App** (Developer)
  Choose ownership, callback configuration and installation visibility. Keep credentials in your server’s secret store.

Done when: The test app exists, its identity and callback configuration are recorded, and its credentials are stored server-side.

Prepare: App name; App owner; Test account / workspace; Provider redirect URI

Destination: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app

[Register a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)

- [ ] **Configure the permissions listed above** (Developer)
  Set repository permissions in GitHub App settings and subscribe only to required events. Permissions come from app settings and installation grants.

Done when: The configured grant matches the permission list and contains no unnecessary access.

Prepare: Contents: read

Destination: https://docs.composio.dev/toolkits/github

[GitHub toolkit authentication](https://docs.composio.dev/toolkits/github)

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

- [ ] **Provide the separate GitHub App installation link** (Developer + admin)
  Install the app on a representative account and selected test repositories, then complete the Composio connection. Record the installation link for later customer onboarding.

Done when: The app is installed on the intended test account and repositories; its installation URL is recorded.

Destination: https://docs.composio.dev/toolkits/github

[GitHub toolkit authentication](https://docs.composio.dev/toolkits/github) · [Install on selected repositories](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app)

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

- [ ] **Test: Read repository contents** (Developer)
  Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Read an excluded private test repository: expect 403/404 without content. Never use a public repository to prove installation isolation.

Request: GET https://api.github.com/repos/TEST_OWNER/TEST_REPO/contents

```javascript
const response = await session.proxyExecute({
  "toolkit": "github",
  "method": "GET",
  "endpoint": "https://api.github.com/repos/TEST_OWNER/TEST_REPO/contents"
});
if (response.resultType !== "completed") throw new Error(response.message);
console.log(response.status, response.data);
```

Done when: HTTP 200 with repository entries. Record the actual response; this example has not been executed.

Prepare: TEST_OWNER and TEST_REPO: an allowed test repository from the GitHub App installation

Destination: https://docs.github.com/en/rest/repos/contents

[Test: Read repository contents API reference](https://docs.github.com/en/rest/repos/contents) · [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute)

## Before customer launch

- [ ] **Bring your own GitHub App, then install it** (Developer)
  Composio documents custom GitHub App client ID/secret support. Supply the installation link separately; users must install the app and grant repository access before connecting. Auth-config scopes do not set GitHub App permissions.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://docs.composio.dev/toolkits/github

[GitHub toolkit authentication](https://docs.composio.dev/toolkits/github)

- [ ] **Installation and authorization are separate** (Developer + admin)
  Use a representative account to install on the intended repositories. Organization policy or owner approval can block access even after user authorization.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app

[Install on selected repositories](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app)

- [ ] **Review launch evidence and unresolved questions** (Developer)
  Record actual results, customer-admin decisions and provider review outcomes. These personal checkmarks do not verify provider approval or execution success.

Done when: Actual test results and outstanding launch gates are recorded.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- **Bring your own GitHub App, then install it**: Composio documents custom GitHub App client ID/secret support. Supply the installation link separately; users must install the app and grant repository access before connecting. Auth-config scopes do not set GitHub App permissions.
  Applies to steps: gate-GITHUB-COMPOSIO
  [GitHub toolkit authentication](https://docs.composio.dev/toolkits/github)

- **Installation and authorization are separate**: Use a representative account to install on the intended repositories. Organization policy or owner approval can block access even after user authorization.
  Applies to steps: gate-GITHUB-INSTALL
  [Install on selected repositories](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app)

## Blockers and follow-up

- **Outstanding follow-up: Confirm the selected Composio tools use the intended GitHub App grant and work for the required background execution. No installation-token or tool-execution test was performed.** (Developer) — Confirm the selected Composio tools use the intended GitHub App grant and work for the required background execution. No installation-token or tool-execution test was performed.

## Integration route

Managed OAuth2 availability does not supply your repository-scoped GitHub App. Use your own app and installation flow with Composio’s documented custom configuration.

```javascript
const session = await composio.sessions.create({
  userId: "your_stable_user_id",
  toolkits: ["github"],
  authConfigs: { github: "ac_your_config_id" },
});
// Complete this session’s Connect Link and test selected tools.
// Provider permissions and session tool limits are separate controls.
```

## Prepared materials

### Permissions rationale
Contents: read: Inspect repository code.

### Registration worksheet
Provider app: GitHub App
Callback: copy the exact provider redirect URI from the auth configuration.
Keep client secrets in your backend or secret manager.
Toolkit: github
Permissions: Contents: read
Record the verified auth config ID.

### First connection test
Authorize a representative account: Use the session’s Connect Link. Check completion and account identity in Composio; a successful callback alone is insufficient.
Done when: The representative connected account reports successful authorization and the correct identity.
Test: Read repository contents: Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Read an excluded private test repository: expect 403/404 without content. Never use a public repository to prove installation isolation.
Done when: HTTP 200 with repository entries. Record the actual response; this example has not been executed.

## Sources

- [Toolkit metadata API and managed auth methods](https://docs.composio.dev/reference/api-reference/toolkits/getToolkitsBySlug) — checked 2026-10-30

- [Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) — checked 2026-10-30

- [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app) — checked 2026-10-30

- [Configuring sessions](https://docs.composio.dev/docs/configuring-sessions) — checked 2026-10-30

- [Authentication and connected accounts](https://docs.composio.dev/docs/authentication) — checked 2026-10-30

- [GitHub toolkit authentication](https://docs.composio.dev/toolkits/github) — checked 2026-10-30

- [Choosing a GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app) — checked 2026-10-30

- [Repository contents API permissions](https://docs.github.com/en/rest/repos/contents) — checked 2026-10-30

- [Install on selected repositories](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) — checked 2026-10-30

- [Register a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) — checked 2026-10-30

- [Test: Read repository contents API reference](https://docs.github.com/en/rest/repos/contents) — checked 2026-11-02

- [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute) — checked 2026-11-02
