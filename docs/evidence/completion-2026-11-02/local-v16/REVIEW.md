# Candidate v16: retained recorder results and source review

Source `d1737ca71a60f611c12d7610f5611be53de1a3c9`, local production preview, 3 November 2026.

The HTTP recorder classified all seven round-one guides as passing readiness, request parsing, pagination syntax, share persistence and speed. Round two produced one Notion pass; six cases hit the hourly quota before generation. This is **not** two successful rounds.

The subsequent manual source review found gaps beyond the recorder's syntax checks. Forgejo's unbracketed uppercase instance host was not normalized or accompanied by instance URL input provenance. Dropbox included `Boundary check: none in this step` in its continuation; a nonexistent-path check in the initial step tests absence rather than the App Folder permission boundary. OpenProject claimed that its sources did not document a total count, although a total appears in the saved response example; its suggested empty-page end condition was not cited. These observations disqualify this candidate from a source-correctness release pass despite its original recorder classifications. The GitLab cursor/Link instructions also require checking the exact operation's pagination mode rather than assuming that any globally documented cursor is applicable.

The next candidate strengthens the generic process: ground actual curl URLs/methods/data as well as endpoint metadata; include complete request instructions and inputs in independent review; repair multiple affected requests for one action without dropping continuation or unrelated steps; include general API pagination concepts in source selection; use bounded citation slots for instruction repair; reject an empty boundary check; normalize all generic instance-host placeholder forms.

No original JSON record was rewritten to turn a failure into a pass. No provider request was executed. These records remain diagnostic and historical, not final release evidence.
