# Local v27 first round

Source `f27aebb5346a0293d8ab4a9de1648d26a7ed9cd2`, prompt `live-guide.27`. The recorder submitted the frozen inputs to the anonymous local HTTP flow and used a new idempotency key for each job. Request examples were inspected with dummy values. OAuth, provider requests and approval were unexecuted.

| Case | Elapsed | Review |
| --- | ---: | --- |
| [Notion](notion-r1.json) | 53.8 s | Recorder pass. Registration, Read content, page selection, page retrieval and Markdown retrieval are documented. The page step conflates page-object metadata and Markdown. Its title guidance omits the data-source schema distinction. Count this as a response-handoff gap. |
| [Dropbox](dropbox-r1.json) | 87.1 s | App Folder app, individual consent, `files.metadata.read`, documented empty root path, names from `entries`, and the most recent cursor until `has_more=false`. The request log check preserves the metadata-only boundary. |
| [Todoist](todoist-r1.json) | 60.8 s | Recorder pass. The access review and active-task cursor loop completed. The instructions omit the `results[].content` field needed to read each title. Count this as a response-handoff gap. |
| [GitLab](gitlab-r1.json) | 123.1 s | Failed. The Issues operation linked the REST pagination reference, which declared `per_page`. The validator rejected the linked parameter and the fallback still lacked a complete documented continuation. The resulting partial guide could not be shared as a usable plan. |
| [OpenProject](openproject-r1.json) | 136.9 s | Automatic recovery completed within the 180-second budget. The guide cites per-instance confidential registration, the `api_v3` scope, the existing project permission, HAL `subject` fields and page-number continuation with an explicit collection count. |
| [Linear](linear-r1.json) | 42.4 s | User OAuth with `read`, GraphQL issue `nodes.title`, and `pageInfo.endCursor` until `hasNextPage=false`. The resource requests keep the grant and query read-only. The plan repeats the continuation in a separate lifecycle step. |
| [Forgejo](forgejo-r1.json) | 196.4 s | Failed. Name-only discovery found the official OAuth guide, API usage and published Swagger. The second stage stopped updating during planning. It reopened as interrupted with eight saved sources after its lease expired. [Readback](forgejo-timeout-readback.json) |

The [recorder counted five passes](round-1.json). After the response-handoff checks, three of the seven cases qualified. The run did not reach a consecutive second round.

The v28 validator recognizes shared parameter tables only when the paginated operation links the same-provider reference. The retrieved GitLab reference proves `per_page` in both documented modes, `page` for offset and the next-link mechanism. The focused regression rejects a field named only in prose, fields from the other mode and an unlinked reference.
