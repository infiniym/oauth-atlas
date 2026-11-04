# Local v32 first round

Source `e105a1d12fa7612ee7b8ecacf6b3a414ffcdc17a`, prompt `live-guide.32`. [All seven original attempts](round-1.json) are retained. The recorder counted six passes; Todoist failed in 55.8 s because a scope identifier survived compression without its adjacent definition.

Manual review disqualifies Notion (70.7 s): it claims page titles and content while supplying only a Markdown content request. OpenProject (88.5 s) omits the explicit empty filter needed for the unrestricted collection. Forgejo (58.7 s) gives an unsubstantiated short-page stopping rule. Dropbox (116.2 s) has the App Folder root and returned-cursor loop, GitLab (97.8 s) has issue titles and offset/Link pagination, and Linear (45.5 s) has issue titles and GraphQL cursor pagination. This is not a qualifying seven-case round.

The next build binds response claims to the operation, keeps complete grant definitions, and supplies complete operation context to interpretation and independent review. [Clean-checkout verification](../reproduction-v32/checks.json) passed 299 tests, typecheck, build and empty-database initialization; it is separate from these live outcomes.
