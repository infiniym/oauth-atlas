# Local v37 first round

Source `c74adeea608e8124455ae631e57cb6c098303728`, prompt `live-guide.37`. [All seven original attempts](round-1.json) are retained. The recorder counted five passes and two failures. Manual audit disqualifies Notion, so this is not a qualifying round. No second round was started.

| Case | Elapsed | Audit |
| --- | ---: | --- |
| [Notion](notion-r1.json) | 106.6 s | Shared-page title and block-content requests with cursor continuation are present. The title extraction reads element zero only and the block instructions stop at direct children, omitting nested content. Disqualified. |
| [Dropbox](dropbox-r1.json) | 92.1 s | Automatic retrieval resolved the App Folder empty-path fact. Metadata scope, entry names, initial and latest-cursor continuation to `has_more=false` are present. |
| [Todoist](todoist-r1.json) | 63.8 s | Active-task endpoint, read-only grant, content/title mapping and returned-cursor loop to null are present. |
| [GitLab](gitlab-r1.json) | 67.0 s | Issue title extraction, read grant, user instance input, initial request and documented Link continuation are present. |
| [OpenProject](openproject-r1.json) | 140.0 s | Failed. The metadata endpoint retained the instance placeholder instead of a relative route. Repeated rejection led to incomplete response/paging research. A read-side compatibility path also published a partial common plan based on accepted engine status; that is not a pass. |
| [Linear](linear-r1.json) | 85.6 s | Read grant, issue-title GraphQL request and cursor continuation are present. The earlier error-sample attribution defect is corrected. |
| [Forgejo](forgejo-r1.json) | 144.0 s | Failed. Registration, consent and exchange mixed confidential and public PKCE alternatives. Setup correction selected only two of three affected prerequisites and did not finish. |

The next code checks complete segmented-text and nested-content handoff, normalizes instance metadata while retaining concrete URL validation, and requires actual usable-guide readiness before lazily creating a common plan. Already frozen rows remain immutable. Setup correction retains up to four affected prerequisites. Collection protocol evidence and full action context remain available during planning and correction. No required provider or action was removed.
