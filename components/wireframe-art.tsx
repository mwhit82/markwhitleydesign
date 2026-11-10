export type WireframeKind = 'agents' | 'assistant' | 'feedback' | 'photography' | 'system' | 'toolkit' | 'analytics' | 'code' | 'workflow' | 'components' | 'dashboard' | 'prototype';
export const wireframeKinds: Record<string, WireframeKind> = {
  'pendo-for-agents':'agents', leo:'assistant', 'pendo-listen':'feedback',
  'the-whitley-captures':'photography', 'salecycle-design-system':'system',
  'agent-toolkit':'toolkit', 'agent-analytics-in-novus':'analytics', 'frontend-101':'code',
  'ai-assistant-workflows':'workflow', 'design-system-refresh':'components',
  'insight-dashboard-redesign':'dashboard', 'prototype-lab':'prototype',
};
const Box = ({x,y,w,h}:{x:number;y:number;w:number;h:number}) => <rect x={x} y={y} width={w} height={h} rx="5"/>;
export function WireframeArt({kind}:{kind:WireframeKind}) {
  let drawing;
  switch(kind) {
    case 'agents': drawing=<><Box x={42} y={65} w={78} h={46}/><Box x={210} y={65} w={68} h={46}/><Box x={124} y={132} w={74} h={46}/><path d="M120 88h90M160 88v44M57 81h45m-45 12h29M224 81h38m-38 12h24M139 149h44m-44 12h28"/></>;break;
    case 'assistant': drawing=<><Box x={45} y={64} w={230} h={116}/><path d="M63 86h116m-116 12h87M102 120h152m-152 12h123M63 158h169"/><circle cx="247" cy="157" r="9"/><path d="m243 157 4-4 4 4m-4-4v8"/></>;break;
    case 'feedback': drawing=<>{[0,1,2].map(i=><g key={i}><Box x={43+i*80} y={65} w={69} h={112}/><path d={`M${54+i*80} 80h36m-36 20h46m-46 11h32m-32 27h46m-46 11h25`}/></g>)}</>;break;
    case 'photography': drawing=<><Box x={43} y={65} w={140} h={112}/><Box x={195} y={65} w={82} h={49}/><Box x={195} y={126} w={82} h={51}/><circle cx="146" cy="88" r="9"/><path d="m44 160 42-45 33 30 17-17 46 44m14-66 23-24 21 20 15-12 21 20m-80 54 25-24 20 17 17-12 18 20"/></>;break;
    case 'system': drawing=<><Box x={43} y={65} w={234} h={112}/><path d="M43 101h234M122 101v76M201 101v76M58 82h74M58 119h42m-42 10h29M137 119h42m-42 10h24M216 119h42m-42 10h27"/><circle cx="73" cy="153" r="9"/><rect x="144" y="144" width="30" height="18" rx="4"/><path d="m222 153 7 7 12-14"/></>;break;
    case 'toolkit': drawing=<><Box x={124} y={103} w={72} h={43}/>{[[47,65],[226,65],[47,142],[226,142]].map(([x,y])=><g key={x+y}><Box x={x} y={y} w={48} h={35}/><path d={`M${x+12} ${y+17}h24`}/></g>)}<path d="M95 82h15v42h14m72 0h15V82h15M95 160h15v-36m101 0v36h15m-84-36h36"/></>;break;
    case 'analytics': drawing=<><Box x={43} y={65} w={80} h={112}/><Box x={135} y={65} w={142} h={64}/><Box x={135} y={141} w={142} h={36}/><path d="M55 83h54m-54 13h39m-39 22h54m-54 13h32m-32 22h48m42-42 23-15 19 5 25-23 21 8 24-11M150 159h20m12 0h31m12 0h37"/></>;break;
    case 'code': drawing=<><Box x={43} y={65} w={65} h={112}/><Box x={120} y={65} w={157} h={112}/><path d="M55 83h40m-40 19h29m-29 19h34m-34 19h26m55-57h83m-69 18h99m-84 18h63m-78 18h86m-100 18h67"/></>;break;
    case 'workflow': drawing=<><Box x={44} y={86} w={60} h={43}/><Box x={130} y={86} w={60} h={43}/><Box x={216} y={86} w={60} h={43}/><path d="M104 107h26m60 0h26M73 129v26h173v-26M57 103h34m52 0h34m52 0h34"/></>;break;
    case 'components': drawing=<>{[0,1,2].map(i=><g key={i}><Box x={43+i*80} y={65} w={69} h={50}/><Box x={43+i*80} y={128} w={69} h={49}/><path d={`M${56+i*80} 90h43m-43 61h27`}/></g>)}</>;break;
    case 'dashboard': drawing=<><Box x={43} y={65} w={234} h={112}/><path d="M43 99h234M120 65v34m78-34v34M56 82h49m30 0h49m29 0h49M60 156h196M77 145v-24m34 24v-11m34 11v-32m34 32v-22m34 22v-39m34 39v-29"/></>;break;
    case 'prototype': drawing=<>{[0,1,2].map(i=><g key={i}><Box x={47+i*82} y={64+i*5} w={62} h={111}/><path d={`M${59+i*82} ${84+i*5}h38m-38 17h28m-28 37h38`}/><circle cx={78+i*82} cy={160+i*5} r="4"/></g>)}</>;break;
  }
  return <svg className="wireframeArt" viewBox="0 0 320 220" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="27" y="30" width="266" height="161" rx="8"/><path d="M27 50h266"/><circle cx="39" cy="40" r="1.5"/><circle cx="47" cy="40" r="1.5"/><circle cx="55" cy="40" r="1.5"/>{drawing}</g></svg>;
}
