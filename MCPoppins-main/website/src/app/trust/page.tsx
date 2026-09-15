import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readRepositoryFile } from "@/lib/repositoryContent";

const controls = [
  { title: "Read-only by default", copy: "Write tools require explicit enablement." },
  { title: "No TLS bypass", copy: "Certificate verification is never disabled." },
  { title: "No embedded credentials", copy: "Tokens come from environment variables only." },
  { title: "Project allowlist (Jira)", copy: "Restrict accessible Jira projects." },
  { title: "Safe CQL escaping", copy: "Sanitise Confluence search input." },
  { title: "Per-user identity", copy: "Each user supplies their own credentials." },
  { title: "Correlation IDs", copy: "Every request is traceable." },
  { title: "Request timeouts", copy: "Configurable; default 30 seconds." }
];

export default function TrustPage() {
  const sources = [
    { name: "Jira", markdown: readRepositoryFile("packages/mcp-jira/SECURITY.md") },
    { name: "Confluence", markdown: readRepositoryFile("packages/mcp-confluence/SECURITY.md") }
  ];

  return <><section className="trust-hero"><div className="shell"><span className="eyebrow">Trust & security centre</span><h1>Safe by default.<br />Explicit when actions matter.</h1><p>The controls below come from the Jira and Confluence package security documents.</p><div className="trust-hero-badges"><span>Read-only default</span><span>Per-user identity</span><span>Action approvals</span><span>Auditable</span></div></div></section><section className="section shell"><div className="control-grid">{controls.map((control, index) => <article key={control.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{control.title}</h2><p>{control.copy}</p></article>)}</div></section><section className="section section-ink"><div className="shell"><div className="section-heading"><span className="eyebrow">Package sources</span><h2>Read the controls in context.</h2><p>These documents remain the source of truth as package security guidance changes.</p></div><div className="security-source-grid">{sources.map((source) => <article className="markdown-body markdown-dark" key={source.name}><ReactMarkdown remarkPlugins={[remarkGfm]}>{source.markdown}</ReactMarkdown></article>)}</div></div></section></>;
}
