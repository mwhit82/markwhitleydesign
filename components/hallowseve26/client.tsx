'use client';
import dynamic from 'next/dynamic';
const Game=dynamic(()=>import('./game'),{ssr:false,loading:()=><div style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#1e2d2d',color:'#e3c28c',fontFamily:'Georgia,serif'}}>Lighting the Christmas Hearth…</div>});
export default Game;
