import Image from 'next/image';
export type WireframeKind = 'agents' | 'assistant' | 'feedback' | 'photography' | 'system' | 'toolkit' | 'analytics' | 'code' | 'workflow' | 'components' | 'dashboard' | 'prototype';
export const wireframeKinds: Record<string, WireframeKind> = {
  'pendo-for-agents':'agents', leo:'assistant', 'pendo-listen':'feedback',
  'the-whitley-captures':'photography', 'salecycle-design-system':'system',
  'agent-toolkit':'toolkit', 'agent-analytics-in-novus':'analytics', 'frontend-101':'code',
  'ai-assistant-workflows':'workflow', 'design-system-refresh':'components',
  'insight-dashboard-redesign':'dashboard', 'prototype-lab':'prototype',
};
const artwork: Record<WireframeKind,string> = {
 agents:'pendo-for-agents-mockup',assistant:'leo-mockup',feedback:'pendo-listen-mockup',
 photography:'whitley-captures-mockup',system:'salecycle-system-mockup',toolkit:'agent-toolkit',
 analytics:'agent-analytics',code:'frontend-101',workflow:'ai-workflows-mockup',
 components:'design-system-refresh-mockup',dashboard:'insight-dashboard-mockup',prototype:'prototype-lab-mockup',
};
export function WireframeArt({kind}:{kind:WireframeKind}) {
 return <Image src={`/portfolio/${artwork[kind]}.svg`} alt="" fill className="interfaceMockup" sizes="(max-width:639px) 100vw, (max-width:1023px) 50vw, (max-width:1279px) 33vw, 25vw"/>;
}
