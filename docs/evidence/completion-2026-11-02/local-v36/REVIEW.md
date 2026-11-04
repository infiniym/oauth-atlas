# Local v36 first round

Source `abed452`, prompt `live-guide.36`. [All seven original attempts](round-1.json) are retained. OpenProject (119.7 s) and Forgejo (73.7 s) passed the recorder and request audit. The round still failed overall, and no second round was started.

OpenProject now explicitly sends the documented unfiltered value `filters=%5B%5D` in both initial and numbered continuation requests, extracts `_embedded.elements[].subject`, and stops using collection totals. Forgejo uses repository search with private access enabled, `data[].name`, genuinely unscoped OAuth and Link pagination. Their token boundaries are disclosed rather than presented as read-only enforcement.

Notion (9.6 s), Dropbox (8.5 s) and Todoist (8.6 s) could not read their initial sources. Those were network-reading failures, not provider capability findings. The next build retries a temporary failure at the same validated URL once, visibly, within the existing overall budget. HTTP 404 and unsafe destinations are not retried or accepted.

GitLab failed after 167.8 seconds. A 101-character input explanation repeatedly exceeded the old 100-character display budget, and later action correction did not complete a validated pagination handoff. The next build allows 200 characters for an input explanation while retaining all request/source validation and concise generation targets. It supplies a conservative word target to bounded display correction.

Linear failed after 47.7 seconds because an OAuth error-only JSON sample was incorrectly attributed to an earlier GraphQL request. The response parser recognized relative HTTP request lines but missed a subsequent absolute token-endpoint request line. The next build recognizes both, excludes error-only samples from success contracts and preserves the actual resource-response review. A separate direct model diagnostic of the dirty next candidate reproduced the same rejection; it is diagnosis, not a successful rerun.
