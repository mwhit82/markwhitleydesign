/** Deliberately brief: detailed case-study narratives will be supplied by Mark. */
export type PortfolioStudy = {
  slug: string; title: string; category: string; description: string;
  source?: string; tone: string; focus?: string; image?: string; alt?: string;
  conceptual?: boolean;
};
export const portfolioStudies: PortfolioStudy[] = [
  {slug:'pendo-for-agents',title:'Pendo for Agents',category:'Product design',description:'Product context and analytics for AI agents.',source:'https://www.pendo.io/pendo-for-agents/',tone:'pendo'},
  {slug:'salecycle-design-system',title:'SaleCycle design system',category:'Design systems',description:'The design system supporting SaleCycle’s product.',source:'https://www.salecycle.com/',tone:'sale'},
  {slug:'leo',title:'Leo',category:'AI assistant · Pendo',description:'An AI assistant built into Pendo’s platform.',source:'https://www.pendo.io/product/leo/',tone:'leo'},
  {slug:'pendo-listen',title:'Pendo Listen',category:'Product design',description:'Bringing customer feedback together to help teams understand what to build next.',source:'https://www.pendo.io/product/listen/',tone:'listen'},
  {slug:'agent-toolkit',title:'Agent Toolkit',category:'AI / Product Design',description:'Designing the tools and capabilities that help AI agents turn insights into meaningful actions.',focus:'AI agent capabilities, contextual intelligence, tool configuration, in-app guidance, and agent-driven actions.',tone:'toolkit',image:'/portfolio/agent-toolkit.svg',alt:'Concept illustration of connected agent tools, context and actions',conceptual:true},
  {slug:'agent-analytics-in-novus',title:'Agent Analytics in Novus',category:'AI / Analytics / Product Design',description:'Exploring how teams understand, monitor and improve the performance of AI agents.',focus:'Agent performance, live conversations, conversation trends, topics, issues, tool usage and code-aware product intelligence.',tone:'analytics',image:'/portfolio/agent-analytics.svg',alt:'Concept illustration of conversation streams and agent analytics',conceptual:true},
  {slug:'frontend-101',title:'Frontend 101',category:'Developer Experience / Internal Tools',description:'Helping designers confidently explore, understand and contribute to our frontend codebase.',focus:'A learning resource I created to help designers work inside our frontend repository, understand engineering concepts and participate more directly in product development.',tone:'frontend',image:'/portfolio/frontend-101.svg',alt:'Concept illustration of a code editor and learning modules',conceptual:true},
];

export type PortfolioTile = {
  slug: string; title: string; category: string; href: string; tone: string;
  image?: string; alt?: string; conceptual?: boolean; description?: string; external?: boolean;
};
const covers: Record<string, {image: string; alt: string}> = {
  'pendo-for-agents': {image:'/portfolio/pendo-agents-platform.webp',alt:'Pendo for Agents platform detecting issues in agent conversations'},
  leo: {image:'/portfolio/leo.webp',alt:'Leo assistant showing skills and product insights in Pendo'},
  'pendo-listen': {image:'/portfolio/listen.webp',alt:'Pendo Listen grouping customer feedback about dashboards'},
};
const tile = (slug: string): PortfolioTile => {
  const study = portfolioStudies.find(item => item.slug === slug)!;
  return {...study, ...covers[slug], href:`/work/${slug}`};
};
export const portfolioTiles: PortfolioTile[] = [
  tile('pendo-for-agents'), tile('leo'), tile('pendo-listen'),
  {slug:'the-whitley-captures',title:'The Whitley Captures',category:'Photography website',href:'https://www.thewhitleycaptures.com/',tone:'captures',image:'/portfolio/whitley-captures.webp',alt:'Newborn photography by The Whitley Captures',external:true},
  {...tile('salecycle-design-system'),category:'Design system · Case study coming soon'},
  tile('agent-toolkit'),tile('agent-analytics-in-novus'),tile('frontend-101'),
];
