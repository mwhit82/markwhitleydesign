import type { Metadata, Viewport } from 'next';
import Game from '@/components/hallowseve26/client';
export const metadata:Metadata={title:'HallowsEve26 — Santa’s Last Stand | Mark Whitley',description:'Build a Christmas castle with your elves, restore the old shrines, and defend the Hearth against twelve nights of Halloween. Can you make it until Christmas?'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1e2d2d'};
export default function HallowsEve26Page(){return <Game/>;}
