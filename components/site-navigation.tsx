"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const navigation = [
  {href:'/',label:'Home'}, {href:'/work',label:'Portfolio'},
  {href:'/playground',label:'Gaming'}, {href:'/photography',label:'Photography'},
  {href:'/contact',label:'Contact'},
];
export function SiteNavigation({className = ''}: {className?:string}) {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className={`editorialNav ${className}`}>{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav>;
}
