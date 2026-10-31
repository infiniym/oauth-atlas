import SavedPlan from '@/components/saved-plan';
export default async function PlanPage({params}:{params:Promise<{id:string}>}){return <SavedPlan id={(await params).id}/>;}
