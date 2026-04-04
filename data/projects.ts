export type Project = {
  slug: string;
  title: string;
  description: string;
  category: string;
  year: string;
  tags: string[];
  role: string;
  focus: string;
  impact: string;
  overview: string;
  challenge: string;
  approach: string;
  outcome: string;
};

export const projects: Project[] = [
  {
    slug: "ai-assistant-workflows",
    title: "AI Assistant Workflows",
    description:
      "A concept for structuring AI-powered product flows so guidance, intent, and action stay visible to users.",
    category: "AI Experience",
    year: "2026",
    tags: ["AI", "UX Strategy", "Workflow Design"],
    role: "Lead product designer shaping the interaction model and narrative.",
    focus: "Transparency, confidence, and task completion in AI-supported flows.",
    impact: "Established a reusable pattern for guided AI interactions across the product.",
    overview:
      "This concept explored how an AI assistant can move beyond chat and become a structured partner inside product workflows. The goal was to retain the power of AI without sacrificing user control or product clarity.",
    challenge:
      "Many AI features feel either too opaque or too generic. The design problem was creating a workflow where users could understand what the AI was doing, correct course easily, and stay anchored in the actual task.",
    approach:
      "I mapped the flow around intent capture, visible state, and reversible actions. Prototypes focused on reducing ambiguity through progressive disclosure, clear system feedback, and tight copy design.",
    outcome:
      "The resulting pattern language gave the team a consistent foundation for future AI features and helped frame product conversations around trust, transparency, and usefulness rather than novelty.",
  },
  {
    slug: "design-system-refresh",
    title: "Design System Refresh",
    description:
      "A visual and structural refresh of a mature interface system to improve consistency, scalability, and polish.",
    category: "Design Systems",
    year: "2025",
    tags: ["Design System", "UI Craft", "Governance"],
    role: "Design lead aligning visual language, tokens, and reusable component behavior.",
    focus: "Consistency across surfaces without losing product flexibility.",
    impact: "Reduced UI drift and made new feature teams faster to ship with confidence.",
    overview:
      "The refresh focused on strengthening the system beneath the interface, from spacing and typography to component ergonomics and dark-mode readiness.",
    challenge:
      "The existing product had strong utility but inconsistent execution. The design system needed to support multiple teams without becoming rigid or over-engineered.",
    approach:
      "I reviewed patterns in use, identified recurring inconsistencies, and defined a tighter set of primitives. The work emphasized token clarity, component states, and better guidance for designers and engineers.",
    outcome:
      "The updated system created a stronger baseline for craft across the product and improved alignment between product direction and day-to-day execution.",
  },
  {
    slug: "insight-dashboard-redesign",
    title: "Insight Dashboard Redesign",
    description:
      "A premium dashboard concept for turning dense product data into calmer, more decision-friendly views.",
    category: "Product UX",
    year: "2025",
    tags: ["Dashboards", "Data UX", "Interaction Design"],
    role: "End-to-end designer responsible for information hierarchy and visual direction.",
    focus: "Helping teams interpret patterns faster without adding noise.",
    impact: "Improved scannability and created clearer pathways from insight to action.",
    overview:
      "This redesign centered on how high-value product insights could be made more legible through stronger hierarchy, framing, and interaction pacing.",
    challenge:
      "Dense dashboards often collapse into visual overload. The challenge was to preserve depth while making the interface feel calm and easy to navigate.",
    approach:
      "I used modular cards, progressive detail, and narrative grouping to help users move from summary signals into actionable investigation. Prototypes tested the balance between density and simplicity.",
    outcome:
      "The concept demonstrated that a more premium, focused visual system could improve both comprehension and confidence when working with complex product data.",
  },
  {
    slug: "prototype-lab",
    title: "Prototype Lab",
    description:
      "A fast-moving exploration space for interaction patterns, motion studies, and early product ideas.",
    category: "Experimentation",
    year: "2024",
    tags: ["Prototyping", "Motion", "Concepts"],
    role: "Hands-on maker using prototypes to accelerate alignment and learning.",
    focus: "Finding signal early through tangible product concepts.",
    impact: "Turned abstract ideas into shareable prototypes that improved team decision-making.",
    overview:
      "Prototype Lab served as a lightweight environment for testing new interactions before they entered formal roadmap work.",
    challenge:
      "Teams often discuss concepts too abstractly. Without something tangible, useful critique arrives late and momentum stalls.",
    approach:
      "I treated prototypes as working arguments: specific enough to challenge, light enough to change quickly, and expressive enough to align teams around the experience rather than just requirements.",
    outcome:
      "The lab made it easier to stress-test direction early, reduce ambiguity, and create better conversations between product, design, and engineering.",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
