# OAuth Launch Advisor

Helping developers get past “Where do I start?” when connecting an app.

[Demo](https://oauth-launch-advisor.gharkagpt1.chatgpt.site/) · [Code and setup](https://github.com/infiniym/oauth-atlas)

## The problem

A developer wants their agent to read a customer's email. Before building the feature, they face a different set of questions: Which app should I register? What access should I request? Will I need approval? How much work and waiting are involved? The answers are scattered across documentation, making it hard to choose a path and start.

## The approach

I began with provider guides, but a guide still leaves the developer to decide which instructions apply. I shifted the starting point to their intended feature. “Read email, never send” should lead to a different plan from “send email only.” The flow considers a managed app first and makes the remaining access checks explicit. The goal is a clear next action.

## The developer's journey

1. **Describe the integration.** Find an app or enter its name or website, including apps outside the directory. Say what it should do and must never do.
2. **Confirm the choices that matter.** Clarify whose account is connected and who will use the feature. Keep previous answers; research provider requirements for the developer.
3. **Start with one next action.** Explain the recommended setup, required access, who does the work and what completion looks like. Separate hands-on effort from approval waiting.
4. **Reach a first test.** Show setup steps and a representative API request. Identify missing information beside the affected step, with a way to resolve it.
5. **Prepare for launch and share.** Keep customer-launch requirements separate from initial testing. Share the plan so a teammate can continue with the same context.

## Why these choices

One layout makes familiar and unfamiliar apps feel like the same product. Reviewed guidance supports Gmail, Slack and GitHub; live research extends the journey to other apps. Permissions follow the requested feature, with unresolved access called out before testing. Linked sources let developers inspect the advice. Saving answers and repairing individual gaps avoids repeating the whole conversation.

## Try it

In the tested Gmail flow, changing read-and-draft to send-only changed the permission plan to gmail.send. Try that edit and compare the result. The README includes the exact Notion input for live research.

## Where the prototype stands

Live research can fail or return an incomplete guide; sources and unresolved steps remain available. The product guides setup; it does not connect accounts or complete provider approvals. Next, I would test whether developers can choose a path and reach a first working connection without help.
