# OAuth Launch Advisor

From an integration idea to the first useful test.

[Demo](https://oauth-launch-advisor.gharkagpt1.chatgpt.site/) · [Code and setup](https://github.com/infiniym/oauth-atlas)

## The problem

An agent developer wants to read a customer's email. Before building the feature, they must choose an app model, request the right access and understand whose approval is needed. Provider documentation explains the platform; the developer still has to work out which instructions apply to their feature.

## Start with the feature

“Read email and prepare drafts” needs a different plan from “send email only.” OAuth Launch Advisor begins with that distinction. It considers managed and developer-owned options, explains the permission boundary, and separates a first test from customer launch. The aim is an actionable next step, with its owner and a clear finish.

## The developer's journey

1. **Describe.** Enter an app name or official website, what the agent should do, and what it must never do. Apps outside the directory can use live research.
2. **Confirm.** Answer choices that change the setup, such as acting as the app or the connected person. The product researches provider facts and retains previous answers.
3. **Prepare and test.** Follow sourced registration and authorization instructions, then use a representative API request with the required access, inputs and expected response. Missing facts sit beside the affected action; targeted recovery keeps completed work.
4. **Continue together.** Track your own progress, review the separate launch requirements, and share a dated plan or download the same useful instructions as Markdown. Editing creates a new version.

## One useful learning

In the Gmail walkthrough, read-and-draft selected gmail.readonly and gmail.compose. Send-only selected gmail.send instead. The draft permission also grants sending: a product's narrow behavior is not necessarily the token's permission boundary. The guide makes that distinction explicit.

## Try it

Choose Gmail, select reading and drafts, then edit the plan to send-only. Compare the permissions and launch consequences. For live research, try Notion with: “Read titles and content of pages each customer explicitly shares. Read only; never create or modify pages.” The repository contains exact evaluation inputs and evidence.

## Scope

The focused slice combines reviewed Gmail, Slack and GitHub guidance with research from official provider documentation. It produces setup and test instructions. Developers still register and connect their accounts, run resource requests and obtain any required approvals. The dated catalog is discovery coverage, not a claim that every integration has been validated.
