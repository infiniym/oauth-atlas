export type Failure={category:'page-too-large'|'source-moved'|'source-unavailable'|'validation'|'planning'|'model-service';message:string;url?:string;destination?:string;serviceCode?:'credits'|'credentials';upstreamStatus?:number;modelRequests?:number};
export class ResearchFailure extends Error{failure:Failure;constructor(failure:Failure){super(failure.message);this.name='ResearchFailure';this.failure=failure;}}
export class ModelServiceFailure extends ResearchFailure{}
export function sourceFailure(error:unknown,url:string):Failure{
 if(error instanceof ResearchFailure)return error.failure;
 return {category:'source-unavailable',message:'No readable documentation was found. Try a direct public API-reference or Markdown page.',url};
}
