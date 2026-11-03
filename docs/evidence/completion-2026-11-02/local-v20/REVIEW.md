# Candidate v20: no complete live passes

Source `2e66202f9f3ae8767066f044e9067010a70aa0cf`, local production preview, 3 November 2026. **0/7** cases passed the complete recorder gate. Sources, final available requests, original review rejections and elapsed times remain in the JSON records. The candidate is not ready.

Positional transport rows still failed on column count, duplicate/blank step IDs, inconsistent blocker references and malformed field placement, consuming bounded recovery. One normal first planning call also exhausted its stage deadline. Syntax fixes alone did not yield a reliable live process.

The next candidate uses two smaller schema-constrained contracts with named fields: validate provider facts and permission mappings first, then generate steps and concrete requests against those retained facts. Both schemas were checked against the real API compilation limit. A request correction reuses accepted facts; interrupted planning checkpoints retain them. Full local schema, exact source quotes, endpoint/example grounding and independent semantic review still run.

Independent review in this candidate sometimes required enumeration of every shared resource for a request that only asked for a representative read test. The next review instruction retains complete pagination for declared listing tasks, while accepting a user-supplied resource ID with provenance for a representative read; it does not add unrequested discovery actions.

The remaining Dropbox fact is explicit App Folder root-path semantics. Its current official tutorial states the empty-path behavior, but recovery selected nearby method references instead. Generic recovery now carries the failed fact into both search and navigation selection, and planning retains tutorials that establish parameter/root semantics alongside endpoint references. No provider-specific output, endpoint bundle or source URL is embedded in the engine.
