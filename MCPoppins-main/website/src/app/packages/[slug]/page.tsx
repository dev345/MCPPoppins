import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/CopyButton";
import { InstallTabs } from "@/components/InstallTabs";
import { RiskBadge } from "@/components/PackageCard";
import { getPackage, packages } from "@/data/catalog";
import { firstCodeBlockAfter, readPackageFile } from "@/lib/repositoryContent";

export function generateStaticParams() { return packages.map((item) => ({ slug: item.slug })); }

export default async function PackageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getPackage(slug);
  if (!item) notFound();
  const readme = readPackageFile(item.slug, "README.md");
  const security = readPackageFile(item.slug, "SECURITY.md");
  const ideConfig = readPackageFile(item.slug, "mcp.local.example.json").trim();
  const quickStart = firstCodeBlockAfter(readme, "Quick Start");

  return (
    <>
      <section className="package-hero"><div className="shell package-hero-grid">
        <div><Link href="/marketplace" className="back-link">← Marketplace</Link><div className="package-title-row"><span className="package-mark package-mark-large" style={{ background: item.accent }}>{item.mark}</span><div><span className="micro-label">{item.name}</span><h1>{item.displayName}</h1></div></div><p>{item.description}</p><div className="package-actions"><span className="button button-accent">Read-only by default</span><a href="#install" className="button button-light">Install options</a></div></div>
        <aside className="package-facts"><div><span>Vendor</span><strong>{item.vendor}</strong></div><div><span>Version</span><strong>{item.version}</strong></div><div><span>Tools</span><strong>{item.readTools.length} read · {item.writeTools.length} write</strong></div><div><span>Source</span><strong>{item.source}</strong></div></aside>
      </div></section>

      <nav className="detail-nav"><div className="shell"><a href="#read-tools">Read tools</a><a href="#write-tools">Write tools</a><a href="#install">Install</a><a href="#setup">Quick start</a><a href="#config">IDE config</a><a href="#security">Security</a></div></nav>

      <section className="section shell detail-layout"><div className="detail-main">
        <section id="read-tools" className="detail-section"><span className="eyebrow">Read tools · {item.readTools.length}</span><h2>Useful from the first safe connection.</h2><div className="tool-list">{item.readTools.map((tool) => <article key={tool.name}><div><code>{tool.name}</code><p>{tool.description}</p></div><RiskBadge value="R0 Read" /></article>)}</div></section>
        <section id="write-tools" className="detail-section"><span className="eyebrow">Write tools · {item.writeTools.length}</span><h2>Visible, but never silently enabled.</h2><div className="tool-list">{item.writeTools.map((tool) => <article key={tool.name}><div><code>{tool.name}</code><p>{tool.description}</p></div><span className="approval-badge">Requires approval</span></article>)}</div></section>
        <section id="install" className="detail-section"><span className="eyebrow">npm · ZIP · Docker</span><h2>Choose an install method.</h2><InstallTabs methods={item.install} /></section>
        <section id="setup" className="detail-section"><span className="eyebrow">Quick start from package README</span><h2>Validate before the first tool call.</h2><div className="code-block"><div><span>Terminal</span><CopyButton text={quickStart} /></div><pre><code>{quickStart}</code></pre></div></section>
        <section id="config" className="detail-section"><span className="eyebrow">IDE config</span><h2>Copy placeholders, then supply your own values.</h2><div className="code-block"><div><span>mcp.local.example.json</span><CopyButton text={ideConfig} /></div><pre><code>{ideConfig}</code></pre></div></section>
        <section id="examples" className="detail-section"><span className="eyebrow">Example prompts</span><h2>Start with a known outcome.</h2><div className="prompt-list">{item.prompts.map((prompt, index) => <div className="prompt-row" key={prompt}><span>0{index + 1}</span><p>“{prompt}”</p><CopyButton text={prompt} /></div>)}</div></section>
        <section id="security" className="detail-section"><span className="eyebrow">Security</span><h2>Controls from the package source.</h2><div className="security-tags security-tags-large">{item.security.map((control) => <span key={control}>✓ {control}</span>)}</div><article className="markdown-body compact-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{security}</ReactMarkdown></article></section>
      </div><aside className="detail-aside"><div><span className="eyebrow">Clients</span>{item.clients.map((client) => <span className="compat-chip" key={client}>{client}</span>)}</div><div><span className="eyebrow">Operating systems</span>{item.os.map((os) => <p key={os}>✓ {os}</p>)}</div><div><span className="eyebrow">Editions</span>{item.supportedEditions.map((edition) => <p key={edition}>✓ {edition}</p>)}</div><div className="aside-note"><strong>Prototype boundary</strong><p>The page shows repository content and placeholder commands. It does not collect credentials or run connector actions.</p></div></aside></section>
    </>
  );
}
