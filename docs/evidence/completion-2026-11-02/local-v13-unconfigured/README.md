# Local startup configuration failure

All seven jobs were retained. None produced a usable guide or made a configured model call. The first local production invocation passed a relative `.dev.vars` path; Wrangler resolved it beside the generated configuration, so the server had no model bindings. This is an environment/setup failure, not evidence against or for the interpretation changes.

The local start command now resolves the ignored root `.dev.vars` to an absolute path. The next configured run uses fresh jobs and a different evidence directory. Nothing here is overwritten or retroactively counted as passing.
