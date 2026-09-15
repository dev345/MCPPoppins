import Link from "next/link";
import { AgentDemo } from "@/components/AgentDemo";
import { platform, gateway } from "@/data/catalog";

export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="hero-kicker"><span>Trusted MCP kits</span> Local or governed gateway</div>
          <span className="meet-label">Meet MCPoppins</span>
          <h1>Connect your work tools to every AI workspace, <em>safely.</em></h1>
          <p className="hero-lede">{platform.subhead}</p>
          <p className="hero-support">Use Jira and Confluence from supported AI clients today, then extend the same governed gateway into communication channels.</p>
          <div className="hero-actions"><Link href="/marketplace" className="button button-dark">{platform.primaryCTA} <span>↗</span></Link><Link href="/workflows" className="button button-ghost">{platform.secondaryCTA}</Link></div>
          <div className="trust-line">{platform.trustStrip.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <AgentDemo />
      </section>

      <section className="channel-strip"><div className="shell channel-strip-inner"><span>Available connectors</span><strong>Jira · 17 tools</strong><strong>Confluence · 13 tools</strong><strong>Gateway · {gateway?.tools || 20} HTTP tools</strong><strong>Read-only by default</strong></div></section>

      {gateway && (
        <section className="section shell">
          <div className="section-heading"><span className="eyebrow">Intelligent gateway</span><h2>{gateway.intents} intent patterns. {gateway.workflows.length} cross-system workflows.</h2><p>The gateway chains Jira and Confluence tools, remembers conversation context, and formats responses for each channel.</p></div>
          <div className="platform-grid">
            <article><span>Capabilities</span>{gateway.features.map((f: string) => <strong key={f}>✓ {f}</strong>)}</article>
            <article><span>API endpoints</span>{gateway.endpoints.map((e: string) => <strong key={e}>{e}</strong>)}</article>
          </div>
        </section>
      )}

      <section className="section shell platforms-section">
        <div className="section-heading"><span className="eyebrow">Platforms</span><h2>Meet teams where they already work.</h2><p>Supported clients run the kits today. Planned channels use the existing gateway and adapter guides.</p></div>
        <div className="platform-grid"><article><span>Supported</span>{platform.supportedPlatforms.map((item) => <strong key={item}>✓ {item}</strong>)}</article><article><span>Planned</span>{platform.plannedPlatforms.map((item) => <strong key={item}>{item}</strong>)}</article></div>
      </section>

      <section id="mission" className="section section-ink"><div className="shell section-heading"><span className="eyebrow">The promise</span><h2>Find the work. Read the docs. Ask before posting.</h2><p>Every package starts read-only, keeps credentials outside the code and makes write approval explicit.</p></div></section>
    </>
  );
}
