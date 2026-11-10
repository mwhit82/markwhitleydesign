"use client";
import {Icon} from '@/components/icon';
import {Cancel01Icon,ArrowUpRight01Icon} from '@hugeicons/core-free-icons';
import { useEffect,useRef } from 'react';
import Image from 'next/image';
import { resume } from '@/data/resume';
export function ResumeDrawer({onClose}:{onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;const element=ref.current;element?.showModal();document.body.style.overflow='hidden';return()=>{element?.close();document.body.style.overflow=overflow;opener?.focus({preventScroll:true});};},[]);
 return <dialog ref={ref} className="resumeDrawer" aria-labelledby="resume-title" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{if(event.key!=='Tab')return;const controls=event.currentTarget.querySelectorAll<HTMLElement>('button,a[href]');const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose();}}}>
 <header className="drawerTop"><span>Profile & experience</span><button onClick={onClose} autoFocus aria-label="Close profile"><Icon icon={Cancel01Icon} size={18}/></button></header>
 <div className="drawerBody"><Image src="/portfolio/mark-whitley.jpg" alt="Mark Whitley" width={64} height={64} className="resumeAvatar"/><h2 id="resume-title">{resume.name}</h2><p className="resumeRole">{resume.headline}</p><p>{resume.intro}</p><div className="resumeLinks"><a href={`mailto:${resume.email}`}>Email me <Icon icon={ArrowUpRight01Icon} size={18}/></a><a href={resume.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Icon icon={ArrowUpRight01Icon} size={18}/></a></div>
 <h3>Experience</h3>{resume.companies.map(company=><section className="resumeCompany" key={company.name}><h4>{company.name}</h4>{company.roles.map(role=><article key={role.title}><h5>{role.title}</h5><span className="resumeDates">{role.dates}</span>{role.description&&<p>{role.description}</p>}</article>)}</section>)}<section className="resumeCompany"><h3>Education</h3><p>{resume.education}</p></section><small>Experience from my LinkedIn profile · November 2026</small></div></dialog>;
}
