# Manual source audit

The declared inputs were fixed before new investigation. This audit reads the saved guide instructions and the retrieved official snapshots from their stored runs. The citation-match receipts record source URLs, content hashes and exact passage checks. Matching a quotation establishes its presence in the snapshot. The observations below assess the actual instructions and their applicability.

All three required live cases remain incomplete. No partial guide or successful HTTP response is counted as a usable-guide pass. Source implementation is `6114d53ec2e575e578705d29be149d16ab6bd60e`, prompt `live-guide.65`, model `claude-sonnet-5-5`.

## Notion

Registration and the Read content capability have relevant support in the saved authorization overview, OAuth integration article and capability reference. The saved consent example uses the documented authorization endpoint and its client, redirect, owner and response-type parameters. The server token exchange uses the documented token endpoint, HTTP Basic client authentication and JSON body. The parser correction now recognizes GET parameters supplied with curl `-G`. [Saved guide](local-core-final-repaired/notion.json) · [Citation matches](notion-citation-matches.json)

The guide retains a distribution research gap and explicitly says the sources do not establish review or administrator applicability for customer workspaces. Its launch checklist asks the developer to establish that policy. This leaves an essential decision unfinished. The independent review also fails its maximum-three-citation contract for the customer-admin item. Its current failure is preserved. [Authorization](https://developers.notion.com/guides/authorization/overview) · [OAuth integrations](https://developers.notion.com/guides/connections-and-tokens/oauth-integrations/overview)

Two additional instructions need review. Consent is assigned to a customer admin even though the cited article describes authorization by each person. Token storage is described per workspace while the article establishes a token tied to the authorizing user. The guide needs a precise user-and-workspace binding and an accurate consent owner. This is a manual finding from the instructions and source context. No OAuth execution was performed. [OAuth integrations](https://developers.notion.com/guides/connections-and-tokens/oauth-integrations/overview)

The workload field counts three developer-owned setup tasks and separately lists launch preparation. That is an explicitly labeled workload estimate. Consent and an agent-owned callback preparation step appear elsewhere in the checklist. No approval duration is asserted. The overall result fails the usable-guide and evidence-quality gates.

## Dropbox

The saved OAuth guide supports registering one developer-owned app, selecting App Folder access and authorizing customer users. The operation references name files.metadata.read. The guide carries the correct App Folder boundary and excludes file downloads, mutations and team administration. [Saved guide](local-core-final/dropbox.json) · [Citation matches](dropbox-citation-matches.json) · [OAuth guide](https://docs.dropboxapi.com/dropbox-api/docs/oauth)

The token step acknowledges that the supplied excerpts do not establish the complete token request, yet displays a complete-looking curl. Its cited material establishes the token route and use of the client secret, but does not sufficiently ground every displayed authentication and request-field choice. It also leaves the online/offline decision conditional. This is an incomplete authorization handoff. Its agent ownership needs clarification because executing an exchange is human/backend work in this product.

The launch step asks the developer to find production-access policy and any provider review threshold. The captured sources only mention review in passing. The internal review preserves both authorization and launch gaps. The manual audit agrees that the guide is incomplete. Consent is labeled customer admin without the cited user-authorization passages establishing an admin requirement. No applicable published review time is asserted. Resource pagination remains supplementary.

## Calendly

Name-only discovery identifies developer.calendly.com and asks for identity confirmation. The selected openapi.yaml address returns a 112-character navigation page offering Calendly API and Calendly OAuth. It supplies no registration or authorization instructions. The saved result correctly retains unknown OAuth, permission and distribution facts. It supplies no setup steps or invented grants. [Saved result](local-core-final/calendly.json) · [Captured source metadata](calendly-citation-matches.json)

The source acquisition process stops before reading the linked OAuth documentation. That fails the ordinary name-only generation requirement. It does not establish that Calendly lacks OAuth. No usable guide, sharing pass or export pass is claimed.

## Recovery and limits

Notion's saved review was resumed through the ordinary job API. The repaired attempt reuses the accepted research and instructions, performs one review call, and still fails. The earlier fresh failures, including the method-parser and dependency problems, remain in the evidence. The two targeted correction cycles reached the adopted plan's stopping rule. Further core repair awaits the candidate's decision to extend that limit.

The exact remaining work is to prioritize registration and distribution sources, follow documentation indexes to substantive OAuth content, retain correct human ownership and user/token identity, and complete review validation with all necessary source support. Accepting unsupported launch claims would not satisfy these findings.
