# v54 diagnostics — Notion disqualified

6 November 2026. Source `b44e42d33d2dab2d534ad09d34356163248aa0d9`, prompt `live-guide.54`. The original recorder envelopes are unchanged. These targeted diagnostics are not a complete acceptance round.

Dropbox completed in 77,608 ms after automatic retrieval of the root-path semantics. Manual review confirms App Folder access, files.metadata.read, path="", names at $.entries[].name, initial and real continuation calls using the latest cursor, and has_more=false termination. Registration, consent, token exchange and JSON headers are present. Some prose repeats internal transport labels; that requires cleanup before the final usability audit.

Notion's recorder reported a pass in 61,325 ms, but manual review disqualifies it. The title read still omits property-item pagination; the Markdown subtree follow-up is now concrete, but unsupported formats are not reported beside the request. The actual title path selects every segment, but the guide also needs the full-value endpoint when the page response omits mentions.

A separate controlled review replay reproduced a process defect: its first response rejected the title/format handoff, then an unrelated missing explanation on another notice caused a full review retry that returned supported. This replay is diagnostic, not a fresh guide, and does not establish the exact first model response of the original run. The original engine does record that same response-format retry class. v55 retains completed negative decisions across such retries and requires source-declared pagination of a requested value in the generated request contract. A valid pair for some other field cannot satisfy it.
