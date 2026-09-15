import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/CopyButton";
import { ToolCatalogue, type CatalogueTool } from "@/components/ToolCatalogue";
import { packages, platform } from "@/data/catalog";
import { firstCodeBlockAfter, readRepositoryFile } from "@/lib/repositoryContent";

export default function DocsPage() {
  const rootReadme = readRepositoryFile("README.md");
  const jiraReadme = readRepositoryFile("packages/mcp-jira/README.md");
  const confluenceReadme = readRepositoryFile("packages/mcp-confluence/README.md");
  const gatewayReadme = readRepositoryFile("apps/gateway/README.md");
  const quickStart = firstCodeBlockAfter(rootReadme, "Quick Start — For Users");
  const tools: CatalogueTool[] = packages.flatMap((item) => [
    ...item.readTools.map((tool) => ({ connector: item.displayName, name: tool.name, description: tool.description, mode: "Read" as const })),
    ...item.writeTools.map((tool) => ({ connector: item.displayName, name: tool.name, description: tool.description, mode: "Write" as const }))
  ]);

  return (
    <>
      <section className="page-hero"><div className="shell"><span className="eyebrow">Documentation hub</span><h1>From clone to first safe tool call.</h1><p>Repository-backed quick starts, package guides, gateway setup, channel instructions and a searchable {platform.totalTools}-tool catalogue.</p></div></section>
      <section className="section shell docs-layout">
        <aside className="docs-nav"><strong>On this page</strong><a href="#quick-start">Quick start</a><a href="#packages">Package guides</a><a href="#gateway">Gateway</a><a href="#channels">Channels</a><a href="#tools">Tool catalogue</a></aside>
        <div className="docs-content">
          <section id="quick-start"><span className="eyebrow">Root README</span><h2>Quick start.</h2><div className="code-block"><div><span>Terminal</span><CopyButton text={quickStart} /></div><pre><code>{quickStart}</code></pre></div></section>
          <section id="packages"><span className="eyebrow">Package READMEs</span><h2>Configure Jira or Confluence.</h2><div className="docs-cards"><Link href="/packages/jira"><strong>Jira package</strong><span>17 tools · Cloud and Data Center</span></Link><Link href="/packages/confluence"><strong>Confluence package</strong><span>13 tools · Cloud and Data Center</span></Link></div><details className="source-details"><summary>Read Jira README</summary><article className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{jiraReadme}</ReactMarkdown></article></details><details className="source-details"><summary>Read Confluence README</summary><article className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{confluenceReadme}</ReactMarkdown></article></details></section>
          <section id="gateway"><span className="eyebrow">Gateway README</span><h2>Connect web and communication channels.</h2><article className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{gatewayReadme}</ReactMarkdown></article></section>
          <section id="channels"><span className="eyebrow">Setup guides</span><h2>Connect your channel.</h2><div className="docs-cards"><Link href="/channels/teams"><strong>Microsoft Teams</strong><span>Bot registration and webhook setup</span></Link><Link href="/channels/slack"><strong>Slack</strong><span>App and Events API setup</span></Link><Link href="/channels/web-chat"><strong>Web Chat</strong><span>Browser client and gateway setup</span></Link></div></section>
          <section id="tools"><span className="eyebrow">Searchable catalogue</span><h2>Find the exact tool.</h2><ToolCatalogue tools={tools} /></section>
        </div>
      </section>
    </>
  );
}
