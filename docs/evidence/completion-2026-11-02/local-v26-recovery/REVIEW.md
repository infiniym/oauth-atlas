# v26 recovery checks

The local preview reported `80377b687ec665c073501088d8445a11f5f9ce68` and `live-guide.26`. These were real HTTP journeys with new jobs and public documentation reads.

| Case | Result |
| --- | --- |
| Inaccessible source | Passed in 0.5s. The job returned a specific source failure without a setup plan. [Record](inaccessible.json) |
| Public API | Passed in 22.0s. The guide gave a public read with no OAuth grant or authorization step. [Record](public-no-oauth.json) |
| Moved source | Passed in 98.1s. The reader required confirmation of the changed domain and the confirmed journey produced a usable guide. The original job was preserved. [Record](moved-docs.json) |
| Stream interruption and reload | The same job reopened with retained answers and replay reused its saved ID. The full test failed after 83.8s because the guide still lacked a documented page-title request and had an unsupported error-body claim. [Record](interrupted-reload.json) |
| New endpoint documentation | Passed in 25.8s. The job read the supplied official source, saved a new usable version, and preserved the old guide and common plan byte for byte. [Record](documentation-update.json) |

The current candidate needs its own integration pass. The controlled tests cover truncated or malformed responses, action correction, missing facts, source moves, concurrent processing and retained checkpoints.
