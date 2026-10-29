export type Source = { id: string; title: string; url: string; supports: string; retrievedAt: string; kind?: string };
export type Step = { title: string; detail: string; owner: string; doneWhen?: string; sourceIds: string[]; url?: string };
export type Guide = {
 id: string; name: string; website: string; category: string; color: string; initials: string;
 difficulty: 'low' | 'moderate' | 'high' | 'unknown'; difficultyLabel: string;
 headline: string; summary: string; scenario: string; nextAction: string;
 checkedAt: string; status: 'reviewed' | 'draft'; evidenceLabel: string;
 effort: string; effortBasis: string; wait: string; waitBasis: string; preparation?: string;
 test: string; production: string; caveat?: string; steps: Step[];
 blockers: { trigger: string; action: string; owner?: string; sourceIds: string[] }[];
 agentCan: string[]; humanMust: string[];
 attempts: { action: string; observation: string; result: string; notTested?: string }[];
 corrections: { before?: string; after: string }[]; uncertainties: string[]; sources: Source[];
 scopes?: { scope: string; category: string; purpose: string; sourceIds: string[] }[];
 findings?: { category: string; text: string; sourceIds: string[]; confidence: string }[];
 researchLog?: { title: string; detail: string; status: string }[];
};
