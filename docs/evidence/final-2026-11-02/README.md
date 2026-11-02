# Selected evidence - 2 November 2026

This directory is tracked with the source. Inputs are public test scenarios. It excludes API keys, account tokens, model reasoning and raw documentation bodies. No provider request or OAuth flow was executed.

- [Gmail read/draft and send-only](gmail.json): real local create/read HTTP round trips. Two resource-request examples for read/draft; one for send-only. Example JavaScript was evaluated against a recording stub in the automated tests, not a provider.
- [Send-only Markdown](gmail-send.md): exported code, timing, conditions and status from that saved plan.
- [Fresh Notion](notion.json): real local HTTP generation, two cited and reviewed read mappings, 79.3 seconds of job processing. [zero-model refresh](notion-refresh.json) and [shell check](notion-shell.json) ran its saved examples in zsh with curl replaced by an argument recorder.
- [Fresh Dropbox](dropbox.json): 87.9 seconds; folder listing mapped/reviewed, pagination unresolved. This is a useful but incomplete guide, not a complete pass.
- [OpenProject holdout](openproject.json): selected before the runs, no catalog match; validation rejected unsupported OAuth setup. The failure is retained.
- [Recovery attempts](recovery.json): supplied source before/after, preserved version and outcome. Includes failed attempts rather than erasing them after a fix.
- [Checks](checks.json): software-check results and exact verification boundaries.
- [Gmail before the follow-up](before-gmail.png): screenshot from the preceding desktop review, **not** the revised feature summary/progress UI. Browser use was disabled for the follow-up; no current screenshot is claimed.

Local build/test logs and larger research records remain ignored. These selected files are sufficient to inspect the reported behaviors without publishing every intermediate log.
