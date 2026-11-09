# Slack launch plan

Saved version: lp-6bec93fe-12ce-42fc-8b4d-a28921ed79c5
Generated: 2026-11-09T19:34:57.827Z
Basis: Reviewed rules
Provider rules were checked against documentation. The product has not created an app, exchanged tokens or obtained approval.

Read public channel messages, Post messages · Customer accounts · Testing · Managed app candidate

## Your request

Read public channel messages, Post messages

Actions: Read public channel messages, Post messages

Who will use the integration?: A limited customer pilot

What are you preparing for?: Development and testing

Must the provider show your own app name during consent?: No

Who should appear to act in Slack?: The person who connected their Slack account

## Recommended path

Start with the managed app to avoid unnecessary provider registration. Scope, identity and organization-policy checks remain required.

Slack app with user authorization

## Next action

Check the managed grant before proceeding
Owner: Developer
Inspect the chosen toolkit, its OAuth2 method and scopes. Compare the actual grant with every selected capability. Switch to custom credentials if a required permission is unavailable.
Done when: The actual managed grant and token identity cover every selected action, or you have switched to a custom configuration.
https://docs.composio.dev/toolkits/managed-auth

## Time and effort

Hands-on work: 30–90 minutes
Planning estimate, not a timed setup result. Assumes an existing provider account, a working app/backend and Composio access. Covers configuration and a first test connection; excludes building the feature, review preparation, security remediation and external waiting.

Provider wait: Unlisted distribution can support an early-customer pilot without completing Marketplace listing first. Customer workspace policy can still prevent installation; no administrator turnaround is established.
[App lifecycle and distribution](https://docs.slack.dev/app-management/distribution/)

Customer and administrator dependencies: Customer administrator turnaround is not known. Check the target organization’s policy and actual permissions during the first connection test.

## Permissions

- **channels:history** — Read public-channel history accessible to the selected token.
  Applies when: This request
  [Public channel history scope](https://docs.slack.dev/reference/scopes/channels.history/)

- **chat:write** — Post messages with the selected app/token identity.
  Applies when: This request
  [Post message scope](https://docs.slack.dev/reference/scopes/chat.write/)

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

- [ ] **Test: Read public channel messages** (Developer)
  Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Repeat a read using a private test channel this identity cannot access; it must return ok=false without message data.

Request: GET https://slack.com/api/conversations.history?channel=TEST_CHANNEL_ID&limit=1

```javascript
const response = await session.proxyExecute({
  "toolkit": "slack",
  "method": "GET",
  "endpoint": "https://slack.com/api/conversations.history?channel=TEST_CHANNEL_ID&limit=1"
});
if (response.resultType !== "completed") throw new Error(response.message);
console.log(response.status, response.data);
```

Done when: HTTP 200 with ok=true and the test channel messages. Record the actual response; this example has not been executed.

Prepare: TEST_CHANNEL_ID: copy the ID from a test channel; add the selected bot/person to that channel

Destination: https://docs.slack.dev/reference/methods/conversations.history/

[Test: Read public channel messages API reference](https://docs.slack.dev/reference/methods/conversations.history/) · [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute)

- [ ] **Test: Post messages** (Developer)
  Run this backend JavaScript with the authorized session created below. Replace the test inputs first. This posts a real message when run. Use your test channel; inspect the scope and identity before testing an inaccessible channel.

Request: POST https://slack.com/api/chat.postMessage

```javascript
const response = await session.proxyExecute({
  "toolkit": "slack",
  "method": "POST",
  "endpoint": "https://slack.com/api/chat.postMessage",
  "body": {
    "channel": "TEST_CHANNEL_ID",
    "text": "Integration test - test channel only."
  }
});
if (response.resultType !== "completed") throw new Error(response.message);
console.log(response.status, response.data);
```

Done when: HTTP 200 with ok=true, channel and ts; the test message appears in that channel. Record the actual response; this example has not been executed.

Prepare: TEST_CHANNEL_ID: copy the ID from a disposable test channel and invite the selected identity

Destination: https://docs.slack.dev/reference/methods/chat.postMessage/

[Test: Post messages API reference](https://docs.slack.dev/reference/methods/chat.postMessage/) · [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute)

## Before customer launch

- [ ] **Check managed app installation policy** (Developer + admin)
  Each customer workspace must permit the actual managed app and requested access. Managed credentials do not guarantee installation under customer policy or Marketplace eligibility.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://docs.composio.dev/toolkits/slack

[App lifecycle and distribution](https://docs.slack.dev/app-management/distribution/) · [Slack toolkit authentication](https://docs.composio.dev/toolkits/slack)

- [ ] **Validate history access and rate limits** (Developer)
  Token type, channel membership, plan and distribution status affect history access. Check the current conversations.history limits for your app category before designing a polling summarizer.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://docs.slack.dev/reference/methods/conversations.history/

[Conversations history rate limits](https://docs.slack.dev/reference/methods/conversations.history/)

- [ ] **Workspace permission is a separate gate** (Developer + admin)
  A workspace may require administrator approval or allow only Marketplace apps. Ask its administrator about the specific app; enabling distribution alone does not grant installation rights.

Done when: The applicable approval or policy decision is recorded, with any outstanding owner and requirement.

Destination: https://docs.slack.dev/app-management/distribution/

[App lifecycle and distribution](https://docs.slack.dev/app-management/distribution/)

- [ ] **Review launch evidence and unresolved questions** (Developer)
  Record actual results, customer-admin decisions and provider review outcomes. These personal checkmarks do not verify provider approval or execution success.

Done when: Actual test results and outstanding launch gates are recorded.

Destination: https://docs.composio.dev/docs/authentication

[Authentication and connected accounts](https://docs.composio.dev/docs/authentication)

- **Check managed app installation policy**: Each customer workspace must permit the actual managed app and requested access. Managed credentials do not guarantee installation under customer policy or Marketplace eligibility.
  Applies to steps: gate-SLACK-MANAGED-INSTALL
  [App lifecycle and distribution](https://docs.slack.dev/app-management/distribution/) · [Slack toolkit authentication](https://docs.composio.dev/toolkits/slack)

- **Validate history access and rate limits**: Token type, channel membership, plan and distribution status affect history access. Check the current conversations.history limits for your app category before designing a polling summarizer.
  Applies to steps: gate-SLACK-HISTORY-LIMITS
  [Conversations history rate limits](https://docs.slack.dev/reference/methods/conversations.history/)

- **Workspace permission is a separate gate**: A workspace may require administrator approval or allow only Marketplace apps. Ask its administrator about the specific app; enabling distribution alone does not grant installation rights.
  Applies to steps: gate-SLACK-ADMIN
  [App lifecycle and distribution](https://docs.slack.dev/app-management/distribution/)

## Blockers and follow-up

## Integration route

Evaluate managed OAuth first. It is available in the documentation, but scope and token-role fit still need to be verified.

```javascript
const session = await composio.sessions.create({
  userId: "your_stable_user_id",
  toolkits: ["slack"],
});
// Complete this session’s Connect Link and test selected tools.
// Provider permissions and session tool limits are separate controls.
```

## Prepared materials

### Permissions rationale
channels:history: Read public-channel history accessible to the selected token.
chat:write: Post messages with the selected app/token identity.

### Auth configuration worksheet
Provider registration: use the managed app only after verifying its actual scope and identity fit.
Toolkit: slack
Permissions: channels:history, chat:write
Record the verified auth config ID.

### First connection test
Authorize a representative account: Use the session’s Connect Link. Check completion and account identity in Composio; a successful callback alone is insufficient.
Done when: The representative connected account reports successful authorization and the correct identity.
Test: Read public channel messages: Run this backend JavaScript with the authorized session created below. Replace the test inputs first. Repeat a read using a private test channel this identity cannot access; it must return ok=false without message data.
Done when: HTTP 200 with ok=true and the test channel messages. Record the actual response; this example has not been executed.
Test: Post messages: Run this backend JavaScript with the authorized session created below. Replace the test inputs first. This posts a real message when run. Use your test channel; inspect the scope and identity before testing an inaccessible channel.
Done when: HTTP 200 with ok=true, channel and ts; the test message appears in that channel. Record the actual response; this example has not been executed.

## Sources

- [Toolkit metadata API and managed auth methods](https://docs.composio.dev/reference/api-reference/toolkits/getToolkitsBySlug) — checked 2026-10-30

- [Managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) — checked 2026-10-30

- [Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app) — checked 2026-10-30

- [Configuring sessions](https://docs.composio.dev/docs/configuring-sessions) — checked 2026-10-30

- [Authentication and connected accounts](https://docs.composio.dev/docs/authentication) — checked 2026-10-30

- [Slackbot authentication and token roles](https://docs.composio.dev/toolkits/slackbot) — checked 2026-10-30

- [Slack toolkit authentication](https://docs.composio.dev/toolkits/slack) — checked 2026-10-30

- [App lifecycle and distribution](https://docs.slack.dev/app-management/distribution/) — checked 2026-10-30

- [Public channel history scope](https://docs.slack.dev/reference/scopes/channels.history/) — checked 2026-10-30

- [Post message scope](https://docs.slack.dev/reference/scopes/chat.write/) — checked 2026-10-30

- [Conversations history rate limits](https://docs.slack.dev/reference/methods/conversations.history/) — checked 2026-10-30

- [Test: Read public channel messages API reference](https://docs.slack.dev/reference/methods/conversations.history/) — checked 2026-11-02

- [Test: Post messages API reference](https://docs.slack.dev/reference/methods/chat.postMessage/) — checked 2026-11-02

- [Run provider requests through an authorized Composio session](https://docs.composio.dev/docs/extending-sessions/proxy-execute) — checked 2026-11-02
