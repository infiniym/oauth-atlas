# Product decisions

## The developer's actual decision

“Can my customer authorize this?” is not the same as “Can I launch this product?” A provider OAuth registration defines an identity and allowed callback configuration. The integration uses that client configuration to perform OAuth, while each customer connection carries that customer's grant. Provider verification, marketplace distribution, security assessment, and customer-admin policy can create separate gates.

The library starts with a managed-OAuth shortcut rather than assuming everyone needs a custom app. It then states a concrete scenario per guide; advice for a public, server-based Gmail-reading agent should not be mistaken for advice for an internal Workspace tool or send-only feature.

## What we optimized for

1. **Make a launch decision before following a tutorial.** The table exposes risk, effort and provider wait. The guide leads with scenario, verdict and next move.
2. **Make useful progress when blocked.** Each blocker includes an action and, where applicable, a human owner. Each step has an ownership cue and acceptance criterion.
3. **Make certainty inspectable.** Source links sit beside steps. A source checked, a console field inspected, and an OAuth round trip tested are different evidence levels. Author estimates are labeled.
4. **Make the output portable.** Public deep links retain the generated snapshot; Markdown exports include sources, attempts and uncertainties. Local progress is deliberately separate from shared content.

## Why these four

| App | Decision the guide reveals |
| --- | --- |
| GitHub | Easy registration can still fail at a customer's organization boundary; GitHub Apps may fit a repo agent better. |
| Notion | Direct public OAuth distribution is distinct from optional Marketplace discovery; installation scope must be chosen early. |
| Slack | A public install link is not the same as a commercial distribution path. Product suitability and pilot recruitment precede a potentially long review. |
| Gmail | Read-only does not imply easy approval. Restricted data and server processing change the verification and assessment path. |

## Agent boundaries

Research agents investigated official sources independently and attempted reachable setup paths. Humans retain identity, credential creation/storage, agreements, user consent, attestation, and submission. Provider approval and customer-admin access remain external decisions.

The live runtime has no paid model or research credentials. Its agent is a bounded state machine: resolve → discover → read → classify → identify gaps → publish draft. This trades rich interpretation for a dependable no-key slice. It is explicitly described as extractive; unknown fields remain unknown. A future LLM stage should propose claims with source spans and schema validation, then pass through contradiction and applicability checks before review. It should not turn “not found” into “not required.”

## From four to 100

Keep the same structured guide contract and add a reviewed publication workflow, not 96 generic pages. Track provider, audience, scopes, app type, timestamps, source claim IDs, attempts, and ownership. Separate generated drafts from reviewed guides. Prioritize high-demand OAuth toolkits and high-risk review paths; begin each new guide by checking managed-auth availability per OAuth method rather than hardcoding a provider-wide flag.

Store content revisions and an audit trail. Recheck official policy and scope pages on a schedule; flag changed sources for human review and visibly mark stale guides. Use acceptance checks on citation coverage and scope applicability. Measure time to a correct next action, useful draft rate on unfamiliar providers, verified field coverage, and corrections after setup attempts. Raw guide count alone is a weak success metric.

## Deliberately outside this slice

Credential vaults, actually registering apps on behalf of users, email to providers, paid assessments, completed review, and a full agent integration backend. The product should guide or prepare those tasks without representing them as completed.
