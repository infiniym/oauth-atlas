# Local v29 first round

The original seven frozen scenarios ran on `837d8e9ba1c61ae4bc6da920048a348c1a0415a3`, prompt `live-guide.29`. Each began with a fresh anonymous HTTP job. All outcomes and request stubs remain in [the round record](round-1.json). The recorder counted four passes and three failures. The response and continuation audit found additional gaps in two of those passes.

| Case | Elapsed | Outcome |
| --- | ---: | --- |
| [Notion](notion-r1.json) | 100.2 s | Automatic recovery produced shared-page and Markdown requests, including truncation handling. The page-object step still combines metadata and Markdown and omits the schema-dependent title-property selection. This is a source/handoff failure. |
| [Dropbox](dropbox-r1.json) | 159.3 s | Automatic recovery established App Folder root and the latest-cursor loop. The guide reads `entries[].name` and stops on `has_more=false`. Its claim that `limit` is undocumented exceeds the evidence needed to omit an optional parameter. |
| [Todoist](todoist-r1.json) | 83.9 s | Failed. The continuation was generated as a lifecycle step and excluded from concrete pagination validation. Two prose corrections could not repair its classification. |
| [GitLab](gitlab-r1.json) | 155.7 s | Failed. Source compression kept a milestone's `title` and removed the enclosing issue's `title`. The reviewer correctly refused the supplied response claim. The automatic correction lacked the required response evidence and returned an empty request. |
| [OpenProject](openproject-r1.json) | 68.5 s | Recorder pass, disqualified on audit. Both next-page instructions were lifecycle steps and escaped request checks. The first-page detail also used an unsupported `MissingPermission` expectation. |
| [Linear](linear-r1.json) | 46.2 s | User OAuth, `read`, GraphQL issue titles and returned-cursor variables were documented. Both requests were action steps, and continuation stops on `hasNextPage=false`. |
| [Forgejo](forgejo-r1.json) | 104.4 s | Failed. The access review's reason exceeded the display limit even after two corrections. The saved request also described repository search as a top-level array, although its response wraps repositories in `data`. |

The next build gives continuations a separate resource-action contract and checks both initial and continuation requests. Source compression retains mechanically derived response paths from official JSON examples and OpenAPI schemas. These preserve the containing object and exact operation. Review explanations have an 800-character display budget, while source matching and semantic validation remain required. A job with unresolved internal research no longer reaches ready or publishes a common usable plan.
