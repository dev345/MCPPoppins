import { workflows } from "@/data/catalog";

const examples = [
  { channel: "Slack", title: "Project status", prompt: "Give me the project status and current blockers for the launch.", outcome: "Open Jira work and related Confluence context are combined into a source-linked status with suggested next actions." },
  { channel: "Teams", title: "Knowledge to action", prompt: "Find the latest launch decision and link it to the related Jira work.", outcome: "The gateway connects the decision to delivery state and prepares any write action for approval." },
  { channel: "Web chat", title: "Deep dive", prompt: "Investigate NAS-123 and show me everything related to it.", outcome: "Issue details, links, comments and relevant Confluence pages are assembled into one investigation." },
  { channel: "Web chat", title: "Context follow-up", prompt: "Tell me more about that issue.", outcome: "Conversation memory resolves the previous issue and returns fresh details without asking for the key again." }
];

export default function WorkflowsPage() {
  return (
    <>
      <section className="page-hero page-hero-workflows"><div className="shell"><span className="eyebrow">Workflow library</span><h1>Outcomes that begin inside the conversation.</h1><p>Reusable workflows join channel context, governed MCP tools and visible approval steps. The channel changes; the capability contract does not.</p></div></section>
      <section className="section shell"><div className="workflow-detail-grid">{workflows.map((flow) => <article key={flow.id}><div className="workflow-card-meta"><span className="workflow-number">{flow.number}</span>{flow.gateway && <span className="status-pill status-available">Gateway</span>}</div><h2>{flow.title}</h2><p>{flow.summary}</p><div className="workflow-trigger"><span>Trigger phrases</span><code>{flow.trigger}</code></div><ol>{flow.steps.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>)}</ol><button className="button button-ghost">Preview workflow</button></article>)}</div></section>
      <section className="section section-soft"><div className="shell"><div className="section-heading"><span className="eyebrow">Example prompts</span><h2>Four intents. One governed gateway.</h2><p>Try these prompts through any connected channel to invoke the live gateway workflows.</p></div><div className="example-grid">{examples.map((item) => <article key={item.title}><div><span className="status-pill status-preview">{item.channel}</span><strong>{item.title}</strong></div><blockquote>“{item.prompt}”</blockquote><p>{item.outcome}</p></article>)}</div></div></section>
      <section className="section shell demo-script"><span className="eyebrow">90-second judge script</span><h2>Knowledge → action → same capability elsewhere.</h2><div className="script-grid"><article><span>00:00</span><strong>Start in Slack</strong><p>Invoke MCPoppins in a launch thread where a blocker and decision already exist.</p></article><article><span>00:25</span><strong>Ground the answer</strong><p>Show Confluence decision and linked Jira issue with citations and conflict handling.</p></article><article><span>00:50</span><strong>Preview the effect</strong><p>Generate an OpenUI approval card for the exact Jira comment—no write yet.</p></article><article><span>01:15</span><strong>Change the surface</strong><p>Ask the same workflow in Teams to prove the governed core is portable.</p></article></div></section>
    </>
  );
}
