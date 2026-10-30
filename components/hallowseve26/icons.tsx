import type {CSSProperties} from 'react';
const paths:Record<string,React.ReactNode>={
 wood:<><path d="m5 12 17-6 6 15-17 6z" fill="#a56a36"/><path d="m5 12 6 15 6-3-6-15z" fill="#e7bb76"/><path d="m14 12 9-3m-7 9 9-3" stroke="#593e28"/></>,
 planks:<><path d="m3 13 21-8 6 5-21 8zm1 8 21-8 5 5-21 8z" fill="#e5b46b"/><path d="m9 18 21-8v4L9 22zm0 8 21-8v4L9 30z" fill="#986336"/></>,
 stone:<><path d="m4 23 2-13 14-6 9 10-4 12-14 1z" fill="#a2bbc5"/><path d="m6 10 10 7 13-1-9-12zm10 7-5 10-7-4" fill="#dce9ea"/><path d="m16 17 9 11 4-12z" fill="#66818d"/></>,
 toys:<><path d="M5 12h23v16H5z" fill="#c84947"/><path d="M3 9h27v6H3z" fill="#e96557"/><path d="M14 9h5v19h-5z" fill="#ffda79"/><path d="M16 9C3 9 7-3 16 9c9-12 14 0 0 0" fill="none" stroke="#ffda79" strokeWidth="3"/></>,
 followers:<><circle cx="16" cy="18" r="8" fill="#f4cf9c"/><path d="m5 14 15-12 8 13z" fill="#58a879"/><path d="M4 30q12-11 24 0" fill="#3d8965"/><circle cx="14" cy="18" r="1" fill="#263b3d"/><circle cx="20" cy="18" r="1" fill="#263b3d"/></>,
 build:<><path d="m6 26 13-17 5 4-13 17z" fill="#ce9252"/><path d="m10 7 7-5 12 9-7 7z" fill="#dae8e5"/><path d="m22 18 7-7-3-3-8 6z" fill="#91a8af"/></>,
 army:<><path d="M5 9h22v12L16 30 5 21z" fill="#b94149" stroke="#efc56b" strokeWidth="2"/><path d="m16 10 2 5 5 1-4 4 1 5-4-3-4 3 1-5-4-4 5-1z" fill="#ffe093"/><path d="M8 4h16v6H8z" fill="#345f58"/></>,
 cheer:<path d="m16 2 4 9 11 2-8 7 2 11-9-5-9 5 2-11-8-7 11-2z" fill="#ffdb76" stroke="#c58c39"/>,
 blessing:<g stroke="#c6f3ff" strokeWidth="2.5" strokeLinecap="round"><path d="M16 2v28M4 9l24 14M4 23 28 9M11 5l5 4 5-4M11 27l5-4 5 4M4 14l6-2-1-6M28 18l-6 2 1 6M4 18l6 2-1 6M28 14l-6-2 1-6"/></g>,
};
export function GameIcon({name,size=30,style}:{name:string;size?:number;style?:CSSProperties}){return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,...style}}>{paths[name]??paths.army}</svg>;}
