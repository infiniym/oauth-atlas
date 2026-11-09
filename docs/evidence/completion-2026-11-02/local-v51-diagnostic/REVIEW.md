# v51 diagnostic — manual completeness failure

6 November 2026. Source `3ce0d38f5bf86bdabc66bd185a809d18dd541fec`, prompt `live-guide.51`.

The recorder reported a usable shared guide after 93,439 ms with bounded internal correction. The original `notion-r1.json` is unchanged. Manual source review disqualifies it: a correct first request and HTTP 200 do not complete the declared task.

- The title path correctly selects all `$.properties.*.title[].plain_text` segments, but the guide omits the property-item first/continuation calls required for full title values where the page response omits inline mentions. Source `s3` explicitly says to read every page of property items; source `s4` documents the endpoint and cursor end condition.
- The Markdown request correctly uses v2 and describes `truncated`/`unknown_block_ids`, but supplies no concrete follow-up request using a returned block ID. It also does not explicitly report the documented unsupported block formats beside the request.
- The independent review approved these omissions. Its reference selection favored sources used by already-selected steps, hiding the unused follow-up operation. Large reference context also buried concise completeness notices.

v52 surfaces exact source notices before schemas, includes relevant uncited operation references in review, and requires a decision for each notice. Applicable uncovered requirements make the mapping unresolved and feed targeted recovery. No request is inserted from a provider-specific hardcoded answer. Fresh live validation remains required.
