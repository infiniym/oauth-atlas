# v55 diagnostics — failed

6 November 2026. Source `4caf5afd72cfa093721383f92a8416ab9d4397ae`, prompt `live-guide.55`. Both original records remain unchanged. These are targeted diagnostics, not a full round.

Notion failed after 74,705 ms. The independent check now retained its rejection of the missing full-title property calls. Action recovery still added only a cursor call without that collection's initial request. Investigation found that the new field-specific completeness check reused URL-ranking vocabulary, which intentionally removes common words such as title and name. That prevented the source's explicitly paginated title value from driving initial planning.

Forgejo failed after 85,398 ms. A general access-token scope notice was applied to the explicitly unscoped OAuth flow despite its specific source statement. The targeted update did not return a validated correction. This remains an internal interpretation/recovery failure; it does not establish that Forgejo lacks OAuth.

v56 separates semantic field matching from URL-ranking stopwords and retains exact neighboring source text and source titles on completeness notices, alongside the specific selected-grant evidence. The unchanged v54 Notion draft is now deterministically rejected for its missing source-declared title pagination. Fresh generation remains required.
