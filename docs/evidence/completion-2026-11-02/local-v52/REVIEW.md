# v52 complete round — failed

6 November 2026. Source `791ba0d45df6f6c6f9b4c2eb67fe4e6d17ef1c93`, prompt `live-guide.52`. All seven original records are retained. This round does not qualify for the two-round gate.

| Case | Time | Recorder | Finding |
| --- | ---: | --- | --- |
| Notion | 95.972 s | Fail | Repeated authorization URL placeholder, then a property continuation without its own initial request. No usable guide. |
| Dropbox | 72.022 s | Fail | Token host lacked source evidence; empty-root parameter evidence was not recovered. The empty-value probe dropped search results and read unrelated pages. |
| Todoist | 87.732 s | Fail | Review rejected token-response instructions despite a documented access_token response in the retained combined source. No usable guide. The stub also failed to account for curl's default form content type. |
| GitLab | 65.189 s | Fail | Recorder rejected the token exchange's implicit form content type. Requires manual request/source audit; this initial recorded failure remains unchanged. |
| OpenProject | 116.327 s | Pass | Automatic setup correction; OAuth api_v3, filters=[], subject extraction and continuation retained. Detailed source audit is still required before any release claim. |
| Linear | 50.578 s | Fail | Local pagination parser mistook GraphQL operation variable declarations for the connection field; rejected an initial/continuation pair. |
| Forgejo | 69.897 s | Fail | Recorder did not recognize the typed response path on an extra continuation step as expected output. Requires manual audit; recorded failure remains unchanged. |

v53 corrects the shared parser/stub behavior, keeps both requests for every generated pagination pair, supplies exact setup source context before large schemas, and passes endpoint diagnostics into targeted research. These fixes are not retroactive guide passes. They require fresh validation.
