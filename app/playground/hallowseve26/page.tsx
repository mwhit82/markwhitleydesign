import type { Metadata, Viewport } from 'next';
import Game from '@/components/hallowseve26/client';
export const metadata:Metadata={title:'HallowsEve26 — The Northlands | Mark Whitley',description:'Build a living Christmas kingdom, command a toy army and liberate the Northlands. A stylised 3D settlement strategy game with twelve nights of Halloween sieges.'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1e2d2d'};
export default function HallowsEve26Page(){return <Game/>;}
