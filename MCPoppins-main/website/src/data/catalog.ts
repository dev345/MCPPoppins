import metadata from "../../package-metadata.json";

export type Risk = "R0 Read" | "R2 Write";

type SourceTool = { name: string; description: string; requiresApproval?: boolean };
type SourcePackage = {
  name: string;
  displayName: string;
  version: string;
  description: string;
  vendor: string;
  supportedEditions: string[];
  runtime: string;
  transports: string[];
  clients: string[];
  os: string[];
  installMethods: string[];
  defaultMode: string;
  readTools: SourceTool[];
  writeTools: SourceTool[];
  security: string[];
  prompts: string[];
};

export type ConnectorPackage = SourcePackage & {
  slug: "jira" | "confluence";
  system: string;
  mark: string;
  status: "Available";
  summary: string;
  longSummary: string;
  modes: string[];
  channels: string[];
  compatibility: string[];
  install: { label: string; command: string }[];
  tools: { name: string; description: string; risk: Risk }[];
  source: string;
  accent: string;
};

const accents = { jira: "#2457ff", confluence: "#6d4aff" } as const;
const marks = { jira: "JI", confluence: "CO" } as const;

export const platform = metadata.platform;
export const gateway = (metadata as any).gateway || null;

export const packages: ConnectorPackage[] = (metadata.packages as SourcePackage[]).map((item) => {
  const slug = item.name.includes("jira") ? "jira" : "confluence";
  const imageName = slug === "jira" ? "mcp-jira" : "mcp-confluence";
  return {
    ...item,
    slug,
    system: item.vendor,
    mark: marks[slug],
    status: "Available",
    summary: item.description,
    longSummary: item.description,
    modes: item.installMethods,
    channels: ["IDE", "Web Chat", "Microsoft Teams", "Slack"],
    compatibility: [...item.supportedEditions, item.runtime, ...item.os],
    install: [
      { label: "npm", command: `npm install ${item.name}` },
      { label: "ZIP", command: `Download and extract the reviewed ${imageName} release ZIP` },
      { label: "Docker", command: `docker build -t mcp-platform/${slug} ../packages/${imageName}` }
    ],
    tools: [
      ...item.readTools.map((tool) => ({ ...tool, risk: "R0 Read" as const })),
      ...item.writeTools.map((tool) => ({ ...tool, risk: "R2 Write" as const }))
    ],
    source: `packages/${imageName}`,
    accent: accents[slug]
  };
});

export const workflows = [
  {
    id: "project-status",
    number: "01",
    title: "Cross-system project status",
    summary: "Chains Jira issues and Confluence documentation into one combined status view with source attribution.",
    steps: ["Fetch open Jira issues", "Search Confluence for related docs", "Combine with sources", "Suggest next actions", "Attach audit trace"],
    gateway: true,
    trigger: '"project status", "blockers", "standup"'
  },
  {
    id: "knowledge-to-action",
    number: "02",
    title: "Knowledge → action",
    summary: "Connect a Confluence decision to Jira delivery state and prepare a controlled action.",
    steps: ["Search Confluence decisions", "Find related Jira work", "Link decision to delivery", "Prepare comment", "Request approval"],
    gateway: true,
    trigger: '"decision", "link decision"'
  },
  {
    id: "deep-dive",
    number: "03",
    title: "Deep dive investigation",
    summary: "Full analysis of an issue: details, linked issues, comments, and related Confluence pages in one view.",
    steps: ["Fetch issue with links and comments", "Search Confluence for mentions", "Combine across systems", "Show source count", "Suggest follow-ups"],
    gateway: true,
    trigger: '"investigate NAS-123", "deep dive", "everything about"'
  },
  {
    id: "context-followup",
    number: "04",
    title: "Conversation memory",
    summary: "Say 'tell me more' and the gateway remembers the last issue from your conversation history.",
    steps: ["Scan conversation turns", "Extract last issue key", "Fetch fresh details", "Suggest Confluence search", "Continue context chain"],
    gateway: true,
    trigger: '"tell me more", "expand on that"'
  }
];

export const gatewayFeatures = gateway ? {
  tools: gateway.tools,
  intents: gateway.intents,
  workflows: gateway.workflows,
  features: gateway.features,
  endpoints: gateway.endpoints,
} : null;

export function getPackage(slug: string) {
  return packages.find((item) => item.slug === slug);
}
