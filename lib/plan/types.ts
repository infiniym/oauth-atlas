import type { Assessment } from '../advisor/types.ts';
import type {ManagedMetadata} from '../advisor/types.ts';
export type PlanEvidence={sourceId:string;quote:string};
export type PlanSource={id:string;title:string;url:string;checkedAt:string};
export type PlanItem={id:string;title:string;detail:string;appliesWhen?:string;label?:string;sourceIds:string[];evidence?:PlanEvidence[];stage?:'prepare'|'test'|'launch';stepIds?:string[]};
export type PlanStep=PlanItem&{owner:string;stage:'prepare'|'test'|'launch';doneWhen:string;destination?:string;fields:string[];dependsOn?:string[];actionIds?:string[];blockedBy?:string[];testKind?:string;request?:{method:string;endpoint:string;example:string;language?:'javascript'|'sh'}};
export type PlanBlocker={id:string;title:string;consequence:'test'|'launch'|'follow-up';owner:string;resolution:string;stepIds?:string[];kind?:'prerequisite'|'instruction'|'verification'|'missing-evidence';resolutionStepIds?:string[];actionId?:string;gap?:{actionId:string;fact:'request'|'permission'};resolved?:boolean};
export type LaunchPlan={
  schemaVersion:1;id:string;provider:string;request:string;createdAt:string;
  basis:'Reviewed rules'|'Live research'|'Reference notes';status:string;summary:string;route:string;
  next:PlanStep|null;steps:PlanStep[];permissions:(PlanItem&{identifier:string;classification:string})[];
  nextNote?:string;
  observations?:{blockerTitle:string;note:string;satisfied:boolean;recordedAt:string;reportedBy:'developer'}[];
  coverage?:{actionId?:string;action:string;permissions:string[];status:'mapped'|'unresolved'|'unsupported';reason:string;support?:'reviewed'|'unresolved';execution?:'untested';evidence?:PlanEvidence[]}[];
  requirements:PlanItem[];blockers:PlanBlocker[];sources:PlanSource[];
  timing:{work:string;workBasis:string;wait:string;waitSourceIds:string[];external:string};
  integration:string;details:PlanItem[];preparation:{title:string;text:string}[];verification:string;
  context:{label:string;value:string}[];assessment?:Assessment;metadata?:ManagedMetadata;researchId?:string;previousId?:string;code?:string|null;
};
