export type NavItem = {
  key: string;
  label: string;
  to: string;
  blurb: string;
};

export const navItems: NavItem[] = [
  { key: "graph", label: "Graph", to: "/graph", blurb: "Explore the knowledge graph." },
  { key: "code", label: "Code", to: "/code", blurb: "Work on code-aware insights." },
  { key: "metrics", label: "Metrics", to: "/metrics", blurb: "Review performance signals." },
  { key: "ai", label: "AI", to: "/ai", blurb: "Collaborate with AI copilots." },
  { key: "health", label: "Health", to: "/health", blurb: "Monitor service checks." },
];
