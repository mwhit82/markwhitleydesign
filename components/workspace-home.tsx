"use client";
import {useEffect,useRef} from 'react';
import {useSearchParams} from 'next/navigation';
import {PortfolioTile} from './portfolio-tile';
import {GameCard} from './game-card';
import {PhotographyGallery} from './photography/gallery';
import {useCollectionTransition} from './use-collection-transition';
import {CardMotion} from './card-motion';
import {AgentBuild} from './agent-build';
import {portfolioTiles,type PortfolioTile as Tile} from '@/data/portfolio';
import {projects} from '@/data/projects';
import {games} from '@/data/games';
import {photographs,hasPlaceholders} from '@/data/photography';
import styles from '@/app/portfolio.module.css';
export const designItems:Tile[]=[...portfolioTiles,...projects.filter(p=>!portfolioTiles.some(t=>t.slug===p.slug)).map(p=>({slug:p.slug,title:p.title,description:p.description,category:p.category,tone:'concept',conceptual:true,href:`/work/${p.slug}`}))];
const copy={design:{title:'Selected design',description:'Products, systems and AI experiences. A selection of things I’ve helped shape.',count:`${designItems.length} projects`},games:{title:'A little play.',description:'Small worlds, playable experiments and things made just to see what happens.',count:`${games.length} games`},photography:{title:'Through my lens.',description:hasPlaceholders?'Selected photography — gallery preview.': 'A collection of moments, places and perspectives. Photographs by Mark Whitley.',count:`${photographs.length} photographs`}};
export function WorkspaceHome(){
 const params=useSearchParams();const requested=params.get('view');const {view,ready,host,body}=useCollectionTransition(requested==='games'||requested==='photography'?requested:'design');const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{document.title=view==='photography'?'Photography | Mark Whitley':view==='games'?'Games | Mark Whitley':'Mark Whitley | Product Design Engineer';},[view]);
 useEffect(()=>{const mapHash=()=>{const hash=location.hash;const legacy=hash==='#portfolio'?'design':hash==='#gaming'?'games':hash==='#photography'||hash.startsWith('#photo-')||hash==='#selected-photographs'?'photography':null;if(legacy&&new URLSearchParams(location.search).get('view')!==legacy)history.replaceState(null,'',`/?view=${legacy}${hash.startsWith('#photo-')?hash:''}`);};mapHash();window.addEventListener('hashchange',mapHash);return()=>window.removeEventListener('hashchange',mapHash);},[]);
 return <div className={styles.home}><div ref={host} className="collectionTransitionHost"><div ref={body} className="collectionTransitionBody"><header className={styles.intro}><h1>{copy[view].title}</h1><span className={styles.collectionCount} aria-live="polite">{copy[view].count}</span><p>{copy[view].description}</p></header><div ref={container} className="collectionStage">{ready&&view!=='photography'&&<CardMotion view={view} container={container}/>} {ready&&view!=='photography'&&<AgentBuild view={view} container={container}/>}<section key={view} aria-label={view==='design'?'Design projects':view==='games'?'Games':'Photography'}>{view==='design'?<div className={styles.grid}>{designItems.map(project=><PortfolioTile key={project.slug} project={project}/>)}</div>:view==='games'?<div className={styles.grid}>{games.map(game=><GameCard key={game.slug} game={game}/>)}</div>:<PhotographyGallery photos={photographs} ready={ready}/>}</section></div></div></div></div>;
}
