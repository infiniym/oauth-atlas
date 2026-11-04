# Local v34 first round

Source `4bed6e04d58abd49bc2398890ae08a843a4b2fcd`, prompt `live-guide.34`. [All seven original anonymous attempts](round-1.json) produced saved guides and passed the request recorder. Manual review still disqualifies the round. No second round was started.

| Case | Elapsed | Audit |
| --- | ---: | --- |
| [Notion](notion-r1.json) | 73.7 s | Separate page and Markdown calls now exist, but title extraction says the title property's `rich_text` content and omits its actual value-array/text path and dynamic-property discriminator. Incomplete handoff. |
| [Dropbox](dropbox-r1.json) | 98.4 s | App Folder root uses empty path; metadata grant, names and latest-cursor loop to `has_more=false` are present. Automatic field corrections are recorded. |
| [Todoist](todoist-r1.json) | 49.4 s | Active-task endpoint, `data:read`, `results[].content` and returned-cursor loop to null are present. |
| [GitLab](gitlab-r1.json) | 65.5 s | Read grant, instance input and issue titles are present. Continuation prose mixes absence of a next Link with an additional empty-array condition; this needs correction before acceptance. |
| [OpenProject](openproject-r1.json) | 90.6 s | Correct OAuth registration, instance input, `api_v3`, subject mapping and offset continuation. Missing `filters=[]` still silently applies a default subset. Disqualified. |
| [Linear](linear-r1.json) | 45.9 s | Read grant, issue-title query and GraphQL cursor loop to `hasNextPage=false` are present. |
| [Forgejo](forgejo-r1.json) | 113.9 s | Genuine unscoped OAuth, per-instance registration, visible/private repository search, `data[].name` and Link continuation are present. Broad token rights are disclosed. Automatic corrections are recorded. |

The following correction checks operation-specific unfiltered query requirements against the concrete request. It also requires independent review to record separate setup, grant, request, response, pagination and boundary verdicts. A supported permission mapping cannot override a failed response-extraction check. The raw recorder's seven passes remain visible and are not presented as seven usable-guide passes.
