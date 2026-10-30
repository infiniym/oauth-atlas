export default function ProviderMark({id}:{id:string}){
 if(id==='gmail')return <svg aria-hidden="true" viewBox="0 0 32 25" className="provider-mark"><path d="M3 23V4l13 10L29 4v19" fill="none" stroke="#4285f4" strokeWidth="5" strokeLinejoin="round"/><path d="M3 5l13 10L29 5" fill="none" stroke="#ea4335" strokeWidth="5"/><path d="M29 5v18" stroke="#34a853" strokeWidth="5"/><path d="M3 5v18" stroke="#fbbc04" strokeWidth="5"/></svg>;
 if(['slack','github','notion'].includes(id))return <img className={'provider-mark mark-'+id} src={'/provider-logos/'+id+'.svg'} alt="" aria-hidden="true" width={28} height={28}/>;
 return <span aria-hidden="true">{id.slice(0,1).toUpperCase()}</span>;
}
