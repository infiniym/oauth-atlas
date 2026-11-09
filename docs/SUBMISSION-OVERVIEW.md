# OAuth Launch Advisor

A desktop guide from an integration idea to OAuth setup and approval.

[Project repository](https://github.com/infiniym/oauth-atlas/tree/codex/submission-readiness) · [Acceptance evidence](https://github.com/infiniym/oauth-atlas/blob/codex/submission-readiness/docs/evaluations/SUBMISSION-2026-11-09.md)

Candidate for review. Public Vercel deployment is pending, and live-guide acceptance is incomplete.

## Start with the feature

An agent developer wants to read a customer's email. Before building the feature, they must choose an app model, request the necessary access and understand whose approval is needed. OAuth Launch Advisor starts with what the app should do and what it must never do, then gives the developer a next action with an owner and a clear finish.

## The developer's journey

1. **Describe.** Enter the provider, the intended feature and its boundaries. Gmail, Slack and GitHub have reviewed assessments. Unfamiliar providers use research from official documentation.
2. **Confirm.** Answer choices that change the app model, credential actor or distribution path. Research and confirmed choices are saved between stages.
3. **Configure.** Follow registration, redirect, consent, credential and permission instructions. Review provider approval, marketplace listing and customer-admin prerequisites separately. Workload guidance identifies setup tasks and assumptions. Applicable published waiting times are cited.
4. **Continue together.** Track personal progress, share a dated plan or export Markdown. Editing creates a new version. The developer performs configuration, authorization and any required approval process.

## A concrete distinction

For Gmail, reading and preparing drafts selects gmail.readonly and gmail.compose. Sending only selects gmail.send. The guide explains that gmail.compose also permits sending, even when the requested feature only prepares drafts. Slack's person and app identities change the route, while GitHub supports a selected-repository installation boundary.

## Try the reviewed journey

Choose Gmail with reading and drafts, then edit to send-only. Compare the permissions, setup tasks and launch guidance. Share the saved version and inspect its sources and Markdown.

## Scope and current limits

The focused slice covers OAuth setup and approval. Resource API examples are supplementary and labeled as illustrative. Missing essential evidence blocks live-guide readiness. The current Notion, Dropbox and Calendly checks remain incomplete. Automated tests and both production builds pass. Public deployment and the final desktop walkthrough remain pending. Detailed outcomes and retained failures are in the repository.
