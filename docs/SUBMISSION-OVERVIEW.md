# OAuth Launch Advisor

From an integration idea to the first useful test.

[Project repository](https://github.com/infiniym/oauth-atlas) · [Local desktop preview](http://127.0.0.1:5187)

This overview accompanies the local desktop build and its test evidence. Public release is deferred.

## The problem

An agent developer wants to read a customer's email. Before building the feature, they must choose an app model, request the right access and understand whose approval is needed. The provider explains each option. The developer has to work out which ones apply to this feature.

## Start with the feature

“Read email and prepare drafts” needs a different plan from “send email only.” OAuth Launch Advisor begins with that distinction. It considers managed and developer-owned options, explains the permission boundary, and separates a first test from customer launch. The aim is an actionable next step, with its owner and a clear finish.

## The developer's journey

1. **Describe.** Enter an app name or official website, what the agent should do, and what it must never do. Apps outside the directory can use live research.
2. **Confirm.** Answer choices that change the setup, such as acting as the app or the connected person. The product researches provider facts and retains previous answers.
3. **Prepare and test.** Follow sourced registration and authorization instructions, then use a representative API request with the required access, inputs and expected response. Missing facts sit beside the affected action. Targeted recovery keeps completed work.
4. **Continue together.** Track your own progress, review the separate launch requirements, and share a dated plan or download the same useful instructions as Markdown. Editing creates a new version.

## One useful learning

In the Gmail walkthrough, reading and drafting selected gmail.readonly and gmail.compose. Sending only selected gmail.send. The guide shows that gmail.compose also grants sending, even when the feature only prepares drafts.

## Try it

Choose Gmail, select reading and drafts, then edit the plan to send-only. Compare the permissions and launch consequences. For live research, ask for titles and content from Notion pages each customer explicitly shares. Specify read-only access. The local release evaluation records the exact inputs and outcomes.

## Scope

The focused slice combines reviewed Gmail, Slack and GitHub guidance with research from official provider documentation. The catalog helps developers discover apps. Developers register and connect accounts, run the requests, and obtain any required approvals.
