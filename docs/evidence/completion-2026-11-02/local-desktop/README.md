# Desktop walkthrough evidence

These are task walkthroughs in a desktop browser. Plan checkmarks report local progress. The API examples were inspected without connecting or executing a provider account.

| Journey | Evidence |
| --- | --- |
| Gmail | The read-and-draft plan shows `gmail.readonly` plus `gmail.compose`; changing to send-only produces `gmail.send` and a separate saved plan. [v20 edits](v20-gmail-edit.json) and [send-only result](v20-gmail-send.jpg). |
| Slack | The connected-person pilot uses the Slack toolkit. Changing to app identity and public launch changes the toolkit and shows separate provider review stages. Reload preserves the edited answers. [v23 edits](v23-slack-edit.json), [pilot](v23-slack-pilot.jpg) and [public launch](v23-slack-public.jpg). |
| GitHub | A GitHub App with Contents read, separate selected-repository installation, and an excluded private repository check. [v24 record](v24-github-selected.json) and [result](v24-github-selected.jpg). |
| Live workflow | Earlier Notion work captured progress and reload, advanced the next action with keyboard focus preserved, shared the same saved ID and downloaded Markdown. [Progress](live-progress-reload.jpg), [result](v16-notion-result.jpg) and [download comparison](v16-live-export.json). |

The copy control displayed its confirmation. The browser automation clipboard could not expose the bytes. The copy and download controls call the same formatter, and the real downloaded file matched the canonical plan export byte for byte. Each record identifies its source build where available. See [the current evaluation](../../../evaluations/LOCAL-2026-11-03.md) for release gates.
