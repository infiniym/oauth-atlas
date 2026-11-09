# v49 diagnostic — not a release pass

5 November 2026. Source `229fe43d4d134bca34e0ae10235ee62c9accd597`, prompt `live-guide.49`.

The fresh Notion journey failed after 151,482 ms. It added a real page-property continuation request, but the review of the corrected action hit `max_tokens`. The initial consent-URL placeholder also required correction. The original `notion-r1.json` is unchanged; no later review replay replaces this initial failure.

Manual inspection also found that response extraction was described without an exact path through the dynamic property map. A later controlled replay completed the review, but does not establish a usable fresh guide or retroactively pass this attempt. v50 requires an explicit source-validated response path and preserves a corrected action before its unfinished review, allowing review-only recovery. The consent callback parameter check was also corrected to apply the resource boundary restriction to resource requests.
