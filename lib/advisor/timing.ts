import type {Assessment,RuleResult} from './types.ts';

export type TimingGuidance={setup:string;basis:string;wait:string;waitSourceIds:string[];checks:string};
export function timingGuidance(a:Assessment,custom:boolean,githubApp:boolean,dependencies:RuleResult[]):TimingGuidance{
 const ids=new Set(dependencies.map(d=>d.id));
 const setup=!custom?'30–90 minutes':a.provider==='slack'?'1–3 hours':githubApp?'1–3 hours':a.provider==='gmail'?'45–90 minutes':'30–60 minutes';
 const basis='Planning estimate, not a timed setup result. Assumes an existing provider account, a working app/backend and Composio access. Covers configuration and a first test connection; excludes building the feature, review preparation, security remediation and external waiting.';
 let wait='No provider app-review stage identified for this configuration path. Customer installation policy and permission fit still need checking.';
 const waitSourceIds:string[]=[];
 if(ids.has('GOOGLE-RESTRICTED')){wait='Google publishes a baseline of about 6 weeks for restricted-scope verification. This is an estimate after a complete submission, not a launch date. Any required independent security assessment has additional, unverified timing.';waitSourceIds.push('google-timing');}
 else if(ids.has('GOOGLE-SENSITIVE')){wait='Google publishes about 10 business days for sensitive-scope verification. Developer responses and requested changes can extend the process.';waitSourceIds.push('google-timing');}
 else if(ids.has('GOOGLE-EXCEPTION')){wait='This plan checks a personal, internal or testing exception first. No verification wait is assigned until eligibility is confirmed. Reassess before expanding access.';waitSourceIds.push('google-restricted');}
 else if(ids.has('SLACK-MARKETPLACE')){wait='For Marketplace submissions, Slack publishes up to 10 business days for preliminary feedback and up to 10 weeks for functional review of a new app. These are separate stages, not a promised total. Submission prerequisites and requested fixes add time.';waitSourceIds.push('slack-review-timing');}
 else if(a.provider==='slack'&&a.audience==='pilot'){wait='Unlisted distribution can support an early-customer pilot without completing Marketplace listing first. Customer workspace policy can still prevent installation; no administrator turnaround is established.';waitSourceIds.push('slack-distribution');}
 else if(a.provider==='slack'){wait=custom?'No Marketplace review is assigned to this single-workspace or development path. Reassess distribution and commercial-review requirements before expanding access.':'No new developer-owned Slack registration is included in this managed candidate path. Confirm the managed app’s permitted distribution, actual access and customer installation policy before launch.';waitSourceIds.push('slack-distribution',...(!custom?['managed','custom']:[]));}
 else if(a.provider==='gmail'&&!custom){wait='No new developer-owned Google registration is included in this managed candidate path. Confirm the actual permissions and permitted use before assuming you can proceed without additional work.';waitSourceIds.push('managed','custom');}
 else if(a.provider==='github'){wait='The documented registration/install path does not identify a general provider review queue. This does not remove customer organization approval or any separate Marketplace requirements.';waitSourceIds.push(githubApp?'github-register':'github-oauth-register');}
 const checks=a.orgPolicy==='restricted'?'Customer administrator approval is required by your answers; ask the administrator for a turnaround. It is excluded from the setup range.':'Customer administrator turnaround is not known. Check the target organization’s policy and actual permissions during the first connection test.';
 return {setup,basis,wait,waitSourceIds,checks};
}
