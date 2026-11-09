# Notion bounded-correction candidate

Source `2e520b238e171f1f70c84c8169496600e05b5cfb`, prompt `live-guide.43`. The [original targeted attempt](notion-r1.json) passed the recorder in 74.5 seconds with four model calls. This is a diagnostic, not a seven-case acceptance round.

The output identifies the title property by its `type: title` discriminator and joins every `plain_text` segment. It uses the documented Markdown response, including `object: page_markdown`. Manual review still found an incomplete handoff for truncated content: the instructions mention reading returned `unknown_block_ids`, but supply no concrete follow-up request, input provenance or complete loop/end condition. Its completion criterion checks the initial Markdown response only. This attempt is therefore not counted as a complete usable-guide pass.

Inspecting the same official endpoint with content negotiation exposed the underlying extraction problem: the native Markdown response contains the full fenced YAML OpenAPI schema and conditions, while the HTML view loses the hierarchy. The next candidate requests native Markdown first, retains that original schema, and mechanically projects its parameters and response fields with a bounded YAML parser. It does not substitute a provider-specific answer or remove the truncation requirement.
