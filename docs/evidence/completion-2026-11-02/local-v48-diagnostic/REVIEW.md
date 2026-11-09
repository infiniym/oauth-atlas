# Native-schema and account-recovery candidate

Source `33072e6e39bad54e08977cdc167128bea8ad699a`, prompt `live-guide.48`. The [original targeted Notion attempt](notion-r1.json) passed the recorder in 150.4 seconds with automatic recovery, ten model calls and 528,815 input tokens. This is not a full acceptance round.

**Manual qualification: fail.** The guide supplies the initial page and Markdown reads and a title-property read with `page_size=100`. It mentions `next_cursor`/`property_item.next_url` in prose, but supplies no concrete continuation command. Both the validator and recorder mistakenly treated `page_size` as continuation state. The consent example also uses a whole `NOTION_AUTH_URL` input despite a known documented endpoint; the recorder previously inspected resource requests only. A saved plan and the independent review's supported verdict do not override these findings.

The following candidate shares a parsed continuation detector between validation and the recorder, explicitly excludes batch-size parameters, and checks consent/token examples as well as resource examples. Original snapshots and this recorded result remain unchanged. The [source-retention diagnostic](../source-retention-v48.json) separately checks parser/context retention; it is not a generated-guide pass.
