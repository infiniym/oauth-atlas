# Local v30 targeted diagnosis

Source `3840db2eb16d00fcf983a31da18ed0f2e6d65d0c` added response-path extraction and a separate structured continuation schema. The [three fresh original cases](round-1.json) all failed. GitLab took 65.9 seconds, Todoist 71.3 seconds and Forgejo 122.3 seconds. These were incomplete guides with no usable common plan.

The provider returned HTTP 400 with `Schema is too complex.` for the expanded step grammar. The older error handling reduced this to `Model unavailable` and repeated requests and source discovery. The [direct compilation check](schema-compile.json) records the error and the compact replacement's acceptance. The compilation probe generated no guide and counts only as a transport check.

The replacement reuses the previously accepted grammar. Application assembly classifies declared continuations as resource actions, links each to its initial request, and performs the complete request validation. Pagination validation requires both requests. A permanent model-request error now keeps its safe HTTP status, ends the repeated request, and retains the evidence and validated-fact checkpoint for an explicit retry. It does not start unrelated documentation retrieval to resolve a model configuration error. All 296 local tests pass, including the reproduced model-error and continuation cases.
