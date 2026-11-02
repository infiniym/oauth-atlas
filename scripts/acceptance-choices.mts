// Fixed intent policy declared in cases.json. This supplies no provider facts.
export function acceptanceAnswers(guide:any):Record<string,string>{
 const answers={...guide.input.answers};
 for(const q of guide.questions){
  const answer=q.id==='provider-identity'?q.options.find((o:string)=>o==='Yes, this is the provider'):/background|offline|later/i.test(q.prompt)?q.options.find((o:string)=>/only while|foreground|when.+signed in|online only/i.test(o)):/server|browser|platform/i.test(q.prompt)?q.options.find((o:string)=>/server|backend/i.test(o)):q.options.find((o:string)=>/connected (?:person|user)|individual (?:account|user)|act as (?:the )?(?:person|user)/i.test(o));
  if(!answer)throw new Error('Intent clarification needs review: '+JSON.stringify(q));answers[q.id]=answer;
 }
 return answers;
}
