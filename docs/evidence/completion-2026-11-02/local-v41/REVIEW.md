# local-v41 first round

Source `087010a451830e62ef2bc3fedeccf262dc6cd643`, prompt `live-guide.41`. All seven [original attempts](round-1.json) remain unchanged. Recorder outcomes are provisional until the full source/request audit. No second round was run.

| Case | Elapsed | Recorder |
| --- | ---: | --- |
| [notion](notion-r1.json) | 168.9 s | Fail |
| [dropbox](dropbox-r1.json) | 101.1 s | Pass |
| [todoist](todoist-r1.json) | 42.9 s | Pass |
| [gitlab](gitlab-r1.json) | 48.9 s | Pass |
| [openproject](openproject-r1.json) | 67.5 s | Pass |
| [linear](linear-r1.json) | 74.4 s | Fail |
| [forgejo](forgejo-r1.json) | 84.0 s | Fail |

Notion's action correction described missing follow-ups but supplied no concrete pagination request. Linear's review rejected composition of documented GraphQL connection fields. Forgejo retained a faulty count-versus-page stopping condition and its correction did not complete. Dropbox, Todoist, GitLab and OpenProject passed the recorder. The following changes distinguish source-derived field projections from unsupported claims, preserve GraphQL parent/connection semantics, and correct local request-validation failures once within the existing action deadline. A separate compatible Sonnet diagnostic still failed, so the production model was not changed.

This is not a qualifying seven-case round and is not a final release pass.
