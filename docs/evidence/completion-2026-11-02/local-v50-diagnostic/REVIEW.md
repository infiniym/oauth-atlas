# v50 diagnostic — not a release pass

6 November 2026. Source `f1cab4ed37e87537d234152b555256f8fcb88a00`, prompt `live-guide.50`.

The fresh normal Notion journey failed after 57,863 ms. Sources and facts were retained, but step generation returned HTTP 400 and no usable guide. The original `notion-r1.json` is unchanged. This is a failed initial attempt, not an OAuth or provider limitation.

A format-only diagnostic using the exact step schema reproduced HTTP 400, `Schema is too complex.`, in 31,799 ms. Removing only the endpoint-prefix regex yielded HTTP 200 with the requested three empty arrays in 6,100 ms. These probes used no provider guidance and are not guide-generation passes. An earlier original-schema probe timed out at 20 seconds; that timeout is retained separately and is not a success.

The correction removes the transport regex and retains local endpoint/source validation, required response paths, every requested action, and independent review. Fresh live acceptance on the corrected code is still required.
