import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readRepositoryFile } from "@/lib/repositoryContent";

const channels = {
  teams: { name: "Microsoft Teams", file: "docs/channels/teams-setup.md" },
  slack: { name: "Slack", file: "docs/channels/slack-setup.md" },
  "web-chat": { name: "Web Chat", file: "docs/channels/web-chat-setup.md" }
} as const;

export function generateStaticParams() {
  return Object.keys(channels).map((slug) => ({ slug }));
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = channels[slug as keyof typeof channels];
  if (!channel) notFound();
  const guide = readRepositoryFile(channel.file);

  return <>
    <section className="page-hero"><div className="shell"><span className="eyebrow">Connect your channel</span><h1>{channel.name}</h1><p>Follow the repository guide to connect this adapter to the governed MCP gateway.</p></div></section>
    <section className="section shell docs-layout">
      <aside className="docs-nav"><strong>Channel guides</strong>{Object.entries(channels).map(([key, item]) => <Link key={key} href={`/channels/${key}`}>{item.name}</Link>)}<Link href="/docs#gateway">Gateway documentation</Link></aside>
      <div className="docs-content">
        <section><span className="eyebrow">Gateway overview</span><h2>One gateway, channel-specific adapters.</h2><p>The existing HTTP gateway exposes Jira and Confluence tools, preserves the requesting user context and routes messages through the channel adapter. Configure the gateway first, then follow the steps below.</p><Link href="/docs#gateway" className="text-link">Read gateway documentation <span>↗</span></Link></section>
        <article className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{guide}</ReactMarkdown></article>
      </div>
    </section>
  </>;
}
