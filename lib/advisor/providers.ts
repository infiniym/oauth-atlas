import type {Assessment,Capability,ManagedMetadata,ProviderId,Source} from './types';
export const VERIFIED_AT='2026-10-30';
const source=(id:string,title:string,url:string,publisher:string):Source=>({id,title,url,publisher,checkedAt:VERIFIED_AT});
export const sources:Source[]=[
 source('toolkit-api','Toolkit metadata API and managed auth methods','https://docs.composio.dev/reference/api-reference/toolkits/getToolkitsBySlug','Composio'),
 source('managed','Managed OAuth directory','https://docs.composio.dev/toolkits/managed-auth','Composio'),
 source('custom','Managed vs custom auth','https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app','Composio'),
 source('sessions','Configuring sessions','https://docs.composio.dev/docs/configuring-sessions','Composio'),
 source('auth','Authentication and connected accounts','https://docs.composio.dev/docs/authentication','Composio'),
 source('gmail-toolkit','Gmail toolkit authentication','https://docs.composio.dev/toolkits/gmail','Composio'),
 source('slackbot-toolkit','Slackbot authentication and token roles','https://docs.composio.dev/toolkits/slackbot','Composio'),
 source('slack-toolkit','Slack toolkit authentication','https://docs.composio.dev/toolkits/slack','Composio'),
 source('github-toolkit','GitHub toolkit authentication','https://docs.composio.dev/toolkits/github','Composio'),
 source('gmail-scopes','Gmail scope classifications','https://developers.google.com/workspace/gmail/api/auth/scopes','Google'),
 source('google-sensitive','Sensitive scope verification','https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification','Google'),
 source('google-restricted','Restricted scope verification and exceptions','https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification','Google'),
 source('google-timing','OAuth verification timing estimates','https://support.google.com/cloud/answer/13463817?hl=en','Google'),
 source('slack-distribution','App lifecycle and distribution','https://docs.slack.dev/app-management/distribution/','Slack'),
 source('slack-history','Public channel history scope','https://docs.slack.dev/reference/scopes/channels.history/','Slack'),
 source('slack-private','Private channel history scope','https://docs.slack.dev/reference/scopes/groups.history/','Slack'),
 source('slack-write','Post message scope','https://docs.slack.dev/reference/scopes/chat.write/','Slack'),
 source('slack-review','Marketplace requirements','https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements/','Slack'),
 source('slack-review-timing','Marketplace review stages and timing','https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide/','Slack'),
 source('slack-limits','Conversations history rate limits','https://docs.slack.dev/reference/methods/conversations.history/','Slack'),
 source('github-model','Choosing a GitHub App','https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app','GitHub'),
 source('github-scopes','OAuth App scopes','https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps','GitHub'),
 source('github-contents','Repository contents API permissions','https://docs.github.com/en/rest/repos/contents','GitHub'),
 source('github-prs','Pull request API permissions','https://docs.github.com/en/rest/pulls/pulls','GitHub'),
 source('github-reviews','Pull request review API permissions','https://docs.github.com/en/rest/pulls/reviews','GitHub'),
 source('github-install','Install on selected repositories','https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app','GitHub'),
 source('github-register','Register a GitHub App','https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app','GitHub'),
 source('github-oauth-register','Register an OAuth App','https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app','GitHub'),
];
export const providerNames:Record<ProviderId,string>={gmail:'Gmail',slack:'Slack',github:'GitHub'};
const cap=(id:string,name:string,description:string,...sourceIds:string[]):Capability=>({id,name,description,sourceIds});
export const capabilities:Record<ProviderId,Capability[]>={
 gmail:[cap('read','Read email content','Read message bodies and attachments.','gmail-scopes'),cap('metadata','Read metadata only','Headers and labels, without message bodies.','gmail-scopes'),cap('draft','Create and manage drafts','Compose replies for review before sending.','gmail-scopes'),cap('send','Send email','Send messages without reading the mailbox.','gmail-scopes'),cap('modify','Modify or trash messages','Change mailbox messages; excludes permanent deletion.','gmail-scopes')],
 slack:[cap('read','Read public channel messages','Read conversations the token can access.','slack-history'),cap('post','Post messages','Send summaries to channels the identity can access.','slack-write'),cap('private','Read private channel messages','Requires appropriate channel access and scope.','slack-private')],
 github:[cap('contents','Read repository contents','Inspect code in accessible repositories.','github-contents'),cap('pulls','Read pull requests','Inspect PRs and their changes.','github-prs'),cap('review','Submit PR reviews','Create a review with inline review comments.','github-reviews'),cap('write','Create or update PRs','Write PRs; committing branch changes needs extra permissions.','github-prs'),cap('identity','Read public user identity','Public profile and repository information.','github-scopes')],
};
export function emptyAssessment(provider:ProviderId='gmail'):Assessment{return {version:1,provider,description:'',capabilities:[],audience:'unknown',stage:'unknown',branding:'unknown',background:'unknown',dataHandling:'unknown',workspaceOnly:'unknown',slackIdentity:'unknown',repoAccess:'unknown',orgPolicy:'unknown',managedScopes:'unknown',customScopes:'unknown',dedicatedQuota:'no',customInstance:'no',special:''};}
export function metadataSnapshot(provider:ProviderId):ManagedMetadata{return {provider,authMethods:['OAUTH2'],managedMethods:['OAUTH2'],origin:'Documentation snapshot',checkedAt:VERIFIED_AT,scopeCoverage:'unknown',note:'The official toolkit page lists managed OAuth2. Its default scope set and app-model compatibility have not been tested for your use case.'};}
export const examples:{label:string;description:string;assessment:Assessment}[]=[
 {label:'Gmail email assistant',description:'Read customer emails and draft replies',assessment:{...emptyAssessment('gmail'),description:'An AI assistant that reads customer Gmail messages and drafts replies for review.',capabilities:['read','draft'],audience:'public',stage:'production',branding:'yes',background:'yes',dataHandling:'servers'}},
 {label:'Slack customer pilot',description:'Read discussions and post daily summaries',assessment:{...emptyAssessment('slack'),description:'A Slack bot that reads public channel discussions and posts daily summaries for a limited customer pilot.',capabilities:['read','post'],audience:'pilot',stage:'test',branding:'no',background:'yes',slackIdentity:'bot'}},
 {label:'GitHub PR reviewer',description:'Review code across selected repositories',assessment:{...emptyAssessment('github'),description:'An automated GitHub agent that monitors pull requests overnight, reads code and submits reviews across selected customer repositories.',capabilities:['contents','pulls','review'],audience:'public',stage:'production',branding:'yes',background:'yes',repoAccess:'selected'}},
];
