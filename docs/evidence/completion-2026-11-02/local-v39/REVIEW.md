# local-v39 first round

Source `a9340a6025e0b874d6004977d5808febc47c878f`, prompt `live-guide.39`. All seven [original attempts](round-1.json) remain unchanged. Recorder outcomes are provisional until the full source/request audit. No second round was run.

| Case | Elapsed | Recorder |
| --- | ---: | --- |
| [notion](notion-r1.json) | 104.2 s | Fail |
| [dropbox](dropbox-r1.json) | 83.0 s | Fail |
| [todoist](todoist-r1.json) | 47.4 s | Pass |
| [gitlab](gitlab-r1.json) | 87.0 s | Fail |
| [openproject](openproject-r1.json) | 63.2 s | Pass |
| [linear](linear-r1.json) | 79.1 s | Pass |
| [forgejo](forgejo-r1.json) | 119.6 s | Pass |

Notion retained the correct metadata/body requests but the review rejected its title-path evidence. GitLab retained a lifecycle continuation whose metadata named a different collection, while a separate correct continuation existed. Dropbox's valid continuation stated the sourced Boolean end condition without the word response, exposing a recorder false negative; a duplicate continuation also needed consolidation. Todoist, OpenProject, Linear and Forgejo passed the recorder. The next code resolves linked object evidence for review, classifies literal next-link requests as resource continuations, normalizes only their declared parent metadata, merges cursor aliases, and recognizes a cited response condition without accepting unrelated request flags.

This is not a qualifying seven-case round and is not a final release pass.
