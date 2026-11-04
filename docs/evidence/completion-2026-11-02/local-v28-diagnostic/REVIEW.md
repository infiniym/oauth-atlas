# Local v28 targeted diagnosis

The two fresh jobs used the same normal inputs as the earlier round and ran on `93d00e77c32b2fa227243a152549ee5d532430de`, prompt `live-guide.28`. This diagnostic is outside the full matrix. Both cases failed, with their original outcomes retained.

| Case | Elapsed | Outcome |
| --- | ---: | --- |
| [GitLab](gitlab-r1.json) | 127.0 s | The linked reference now grounds `per_page`, and the examples expose headers and the body. The access review first generalized a warning about missing pagination headers to the next link. The correction still lacked the operation's sourced stopping condition. The reference explicitly lists the omitted totals and last-page link and separately describes keyset termination. |
| [Forgejo](forgejo-r1.json) | 72.1 s | Official name-only discovery and paginated visible-repository requests succeeded. The guide retained an unverified instance restriction as a test blocker. It combined consent with token exchange, leaving the separate consent URL and callback instructions incomplete. The documented grant is unscoped, so the guide correctly places read-only enforcement in the client. |

The next build retains the parameter checks and exposes the complete pagination exception to the reviewer. Its setup review distinguishes possible custom instance settings from documented requirements for a representative account. It requires distinct consent and token exchange and the actual response property for each resource request. A simulated D1 write failure also exposed a rejected save promise that prevented recording a terminal state. The new regression verifies a durable interruption on the same job, with its lease released.
