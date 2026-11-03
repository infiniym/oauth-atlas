# Candidate v19: four recorder passes, not a release pass

Source `3cc4c94991b283119abf9203a83c6872776bcfe6`, local production preview, 3 November 2026. The recorder classified Dropbox (133.1s), Todoist (106.8s), OpenProject (133.9s) and Linear (72.9s) as passes. Notion and GitLab failed transport shape; Forgejo failed after 182.8s including identity discovery. All original records are retained.

Manual source review disqualifies OpenProject from a source-correctness pass: `api_v3` was correctly documented as a permission finding, but the action mappings used empty permission lists. The broad-grant prompt had conflated a broad named default scope with an unscoped token. The next candidate requires named default/broad scopes to appear verbatim in the mappings; genuinely unscoped OAuth remains distinct.

The next candidate corrects malformed transport rows in isolation. It may insert/remove empty columns or reorder existing values, but a multiset check requires every nonempty string to survive byte-for-byte; facts, request code and citations cannot be rewritten by this correction. Length-field correction now uses its own small structured response schema. Strict semantic and source checks still follow both repairs.

A recovery audit also reproduced an unfinished-stage bug: failed planning output could be saved as a draft and reused as completed planning on retry. Checkpoints now mark accepted drafts, omit failed planning drafts, strip old runtime metadata, and retain research/answers. Regressions prove that failed planning is repeated while source reads are reused, and a resumed access review counts its own call without inheriting an old engine result.

This candidate did not meet the two-round, source-correctness or speed gates. A later successful run does not retroactively change these outcomes.
