# Local v33 first round

Source `ca9ecd006411fcdc219bf943a6bac802ba58cba8`, prompt `live-guide.33`. [All seven original attempts](round-1.json) are retained. Recorder passes were Dropbox (114.8 s), GitLab (85.5 s), OpenProject (114.7 s) and Linear (45.8 s). Notion (94.1 s), Todoist (57.2 s) and Forgejo (134.2 s) failed. No second round was started.

Notion's dynamic title-property selection remained unresolved. Todoist's operation introduction saying the endpoint returns active tasks was omitted from the interpretation context, prompting an unnecessary active-filter gap. Forgejo's saved schema contained the private-repository parameter but its smaller model context omitted it, so review could not establish the visible-repository collection. The OpenProject recorder pass is also disqualified because the initial request still applies the documented default filter.

The next build retains complete schema operation contracts in both planning and review, preserves operation introductions and their adjacent conditions, and classifies missing request/response facts separately from permission facts. Missing fields no longer automatically trigger unrelated permission research. These are source-selection and review defects, not evidence that the providers lack OAuth.
