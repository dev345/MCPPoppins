import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { createParser } from "@openuidev/react-lang";
import { openuiLibrary } from "@openuidev/react-ui";

const root = process.cwd();
const required = [
  "src/app/page.tsx",
  "src/app/marketplace/page.tsx",
  "src/app/packages/[slug]/page.tsx",
  "src/app/docs/page.tsx",
  "src/app/channels/[slug]/page.tsx",
  "src/app/workflows/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/trust/page.tsx",
  "package-metadata.json",
  "../packages/mcp-jira/README.md",
  "../packages/mcp-jira/SECURITY.md",
  "../packages/mcp-confluence/README.md",
  "../packages/mcp-confluence/SECURITY.md",
  "../apps/gateway/README.md",
  "../docs/channels/teams-setup.md",
  "../docs/channels/slack-setup.md",
  "../docs/channels/web-chat-setup.md"
];
for (const file of required) await access(path.join(root, file));

const home = await readFile(path.join(root, "src/app/page.tsx"), "utf8");
const docs = await readFile(path.join(root, "src/app/docs/page.tsx"), "utf8");
const pricing = await readFile(path.join(root, "src/app/pricing/page.tsx"), "utf8");
const openui = await readFile(path.join(root, "src/components/OpenUIArtifact.tsx"), "utf8");
const metadata = JSON.parse(await readFile(path.join(root, "package-metadata.json"), "utf8"));
const checks = [
  [home, "Meet MCPoppins"],
  [home, "platform.subhead"],
  [home, "platform.supportedPlatforms"],
  [docs, "platform.totalTools"],
  [docs, "packages/mcp-jira/README.md"],
  [docs, "apps/gateway/README.md"],
  [pricing, "Pricing is not published"],
  [openui, "@openuidev/react-lang"],
  [openui, "openuiLibrary"]
];
for (const [content, marker] of checks) {
  if (!content.includes(marker)) throw new Error(`Required marker missing: ${marker}`);
}

const packageToolCount = metadata.packages.reduce((sum, item) => sum + item.readTools.length + item.writeTools.length, 0);
if (metadata.packages.length !== metadata.platform.totalConnectors) throw new Error("Connector total does not match package metadata.");
if (packageToolCount !== metadata.platform.totalTools) throw new Error(`Tool total mismatch: expected ${metadata.platform.totalTools}, found ${packageToolCount}.`);
if (!metadata.gateway || metadata.gateway.tools < 1) throw new Error("Gateway tool metadata is missing.");
if (!Array.isArray(metadata.gateway.workflows) || metadata.gateway.workflows.length < 1) throw new Error("Gateway workflow metadata is missing.");
if (metadata.packages.some((item) => item.defaultMode !== "read-only")) throw new Error("Every connector must remain read-only by default.");

const openuiSource = await readFile(path.join(root, "src/lib/demoOpenUI.ts"), "utf8");
const responseMatch = openuiSource.match(/`([\s\S]*?)`/);
if (!responseMatch) throw new Error("Unable to read the canned OpenUI Lang response.");
const parser = createParser(openuiLibrary.toJSONSchema(), "Stack");
const parsed = parser.parse(responseMatch[1]);
const parseErrors = parsed.meta?.errors ?? [];
if (parseErrors.length > 0) throw new Error(`OpenUI Lang did not parse cleanly: ${JSON.stringify(parseErrors)}`);

console.log(`Content contract passed: ${required.length} source-backed routes/files, ${metadata.platform.totalTools} platform tools (${packageToolCount} package tools), ${metadata.gateway.workflows.length} gateway workflows, ${checks.length} product markers, and the OpenUI Lang parse.`);
