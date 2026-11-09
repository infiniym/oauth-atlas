# Focused repair source audit

The candidate authorized extending core repair. The three declared inputs remain unchanged. This audit checks the actual saved v66 instructions and their official source snapshots. It does not substitute a diagnostic call, quotation match or draft for a successful guide.

Fresh runs used implementation `268ad7f6b8916418b584ebe23e8fb5caae1c6d5b`, prompt `live-guide.66` and model `claude-sonnet-5-5`. The subsequent generic repair is `b67430b9ed94ce5b5c152d5d4a566d203348b041`, prompt `live-guide.67`. All three live acceptance cases are still incomplete.

## Notion

The ordinary input URL leads to eight substantive snapshots, including the public-integration and Marketplace articles. The registration instructions select Any workspace and Read content. The public-integration article supports that model for arbitrary customer workspaces and establishes a separate token for each authorizing user. The consent step now belongs to the connected user. Token storage explicitly binds each grant to its authorizing user and workspace. These address the earlier ownership and token-identity findings. [Saved guide](core-v66/notion.json) · [Quotation receipts](core-v66/notion-citation-matches.json)

The authorization overview supports the displayed GET consent URL, `owner=user`, client ID, redirect, response type and state, followed by a server-side POST token exchange using Basic client authentication and JSON. The capability reference supports Read content without insert/update grants and shared-page/child access. The callbacks and boundary checks are instructions only; OAuth was not executed. [Authorization](https://developers.notion.com/guides/authorization/overview.md) · [Capabilities](https://developers.notion.com/reference/capabilities.md)

The listing article explicitly distinguishes direct OAuth use from optional Marketplace listing. The guide now includes that distinction and limits the published 5–10 business-day response to listing submission. However, its unknowns still question unlisted use despite the explicit source, and its missing-evidence launch blocker treats an unpublished customer-admin policy as an unresolved global prerequisite. Those instructions need the final review and correction. The actual review rejected a non-citable or unknown passage ID. The guide therefore fails readiness. [Public integrations](https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview.md) · [Marketplace listing](https://developers.notion.com/guides/connections-and-tokens/public-integrations/marketplace-listing.md)

Workload is labeled as eight setup/consent tasks and one separate launch task, with assumptions rather than invented hours. The agent can draft callback code; the developer implements it. This is a partial improvement, not an evidence-quality pass.

## Dropbox

The unchanged ordinary developer URL timed out twice during the v66 run. No new guide or source facts were saved. The earlier v65 authorization and production-access failures remain unresolved acceptance evidence. The new source-reader recovery is tested with a transient starting-page failure, a same-provider documentation result and an off-provider result that must be rejected. A real repaired Dropbox journey still awaits available model quota. [Fresh failure](core-v66/dropbox.json) · [Earlier incomplete guide](local-core-final/dropbox.json)

## Calendly

Name-only discovery reached the official developer documentation and asked for identity confirmation. Unlike the earlier index-only failure, v66 read app creation, scope, authorization, token and refresh references. The guide chooses a Sandbox OAuth app, one redirect URI, `event_types:read`, S256 PKCE, ordinary user consent and a server-side Basic-auth token exchange with the documented verifier and client-ID fields. Production preparation uses a separate HTTPS app as recommended. [Saved guide](core-v66/calendly.json) · [Quotation receipts](core-v66/calendly-citation-matches.json) · [App creation](https://developer.calendly.com/docs/authentication/creating-an-oauth-app)

The native token reference describes form encoding, matching the guide's curl. The saved OpenAPI projection also contains a JSON request-body declaration; that inconsistency must not be hidden by treating quotation presence as proof. The scope reference supports the permission label and read-only intent. The final guide still needs a full check of the connected-person boundary and applicable production requirements. [Token reference](https://developer.calendly.com/api-docs/calendly-o-auth/o-auth/post-oauth-refresh-token.md) · [Scopes](https://developer.calendly.com/docs/authentication/scopes.md)

The guide retains a distribution research gap and asks whether production access needs provider review. Its review did not complete. Follow-up research included a community discussion; an end-user forum post cannot establish provider approval policy. No claim from that discussion is accepted as approval evidence here. Workload is seven setup/consent tasks plus one launch task. No provider waiting time is invented. This is not a usable-guide pass.

## Service and recovery evidence

Two separate diagnostic review calls returned HTTP 400 with the account's specified API usage limit reached until December 1, 2026 at 00:00 UTC. They are diagnostics, not selected successful reruns. [Notion diagnostic](core-v66/notion-service-diagnostic.json) · [Calendly diagnostic](core-v66/calendly-service-diagnostic.json)

The v67 normal-job retry of Notion records a specific `usage-limit` failure after one rejected service request. It preserves the exact input, partial guide and all eight source hashes, and the incomplete guide still has no frozen usable plan. The retry takes 0.599 seconds. A fixture verifies that restoring service access resumes only the unfinished review. Real successful review and the three final generation cases remain pending. [Retry](core-v67-cap-recovery/notion.json) · [Recovery checks](core-v67-cap-recovery/checks.json)

The v67 review schema constrains citations to actual supplied citable passage IDs, and local validation still rejects unknown IDs. No source, approval or successful output is hardcoded. The model remains frozen. No hiring application has been uploaded or submitted.
