# Candidate v18: one pass, six failures

Source `bdaa550553b3e6febb361785d99e4449c117f06c`, local production preview, 3 November 2026. **Forgejo passed; the other six cases failed.** These records are retained and do not satisfy the two-round gate.

Actual-example grounding exposed another shared input defect: plain sample values (`PAGE_ID`, `PROJECT_ID`) were treated as literal route definitions. The next candidate normalizes only values in the route-variable positions already established by documented endpoint metadata; fixed paths, hosts and query names remain grounded.

The compact transport produced valid JSON, but a free string list of citation IDs still allowed missing or excess citations. A small citation object with three slots is now paired with each row, with a nonempty primary ID pattern; the full local quote and semantic checks remain. Larger named-object schema experiments were rejected by the API's compiled grammar limit and were not deployed.

The stricter audit also exposed context gaps: general pagination end conditions and response aliases such as `subject` were present in saved sources but crowded out by response-example noise. Setup steps were not supplied to the reviewer, so it could mistakenly treat references to authorization inputs as missing. Those contexts are now retained explicitly.

Dropbox's attempt exceeded the wall-time gate (310.5 seconds) and its original timeout record is preserved. The saved job records a long wait inside targeted action repair. A reproducible body-read defect was found: `boundedText` checked the abort signal before awaiting a read but did not cancel a stalled response body when the signal fired. The new reader cancels on abort, uses the per-call deadline for the body, and has a stalled-stream regression. No timeout was lengthened.

Automatic missing-fact recovery now searches for its specific failed fact, prioritizes those results, and can follow a redirect to an official documentation host already established in saved sources. A new, unknown host still requires confirmation. No successful guide was substituted for a fresh run, and no provider account request was executed.
