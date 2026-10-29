'use client';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
export type PageSection={id:string;title:string};
export default function OnThisPage({items,mobile=false}:{items:PageSection[];mobile?:boolean}){
 const [active,setActive]=useState('');const key=items.map(i=>i.id).join('|');
 useEffect(()=>{
  if(mobile||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>{
   const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
   if(visible[0])setActive(visible[0].target.id);
  },{rootMargin:'-85px 0px -65% 0px',threshold:0});
  key.split('|').forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el);});
  return()=>observer.disconnect();
 },[key,mobile]);
 const links=<nav aria-label={mobile?'Page sections':'On this page'}>{items.map(i=><a key={i.id} href={'#'+i.id} aria-current={active===i.id?'location':undefined} onClick={()=>setActive(i.id)}>{i.title}</a>)}</nav>;
 if(mobile)return <details className="mobile-page-sections"><summary>On this page<ChevronDown size={14}/></summary>{links}</details>;
 return <aside className="page-toc"><p>On this page</p>{links}</aside>;
}
