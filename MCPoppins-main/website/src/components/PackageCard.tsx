import Link from "next/link";
import type { ConnectorPackage } from "@/data/catalog";

export function RiskBadge({ value }: { value: string }) {
  const cls = value.startsWith("R0") ? "read" : value.startsWith("R2") ? "write" : "material";
  return <span className={`risk-badge risk-${cls}`}>{value}</span>;
}

export function PackageCard({ item, compact = false }: { item: ConnectorPackage; compact?: boolean }) {
  return (
    <article className={`package-card ${compact ? "package-card-compact" : ""}`}>
      <div className="package-card-top">
        <span className="package-mark" style={{ background: item.accent }}>{item.mark}</span>
        <span className="status-pill status-available">Read-only</span>
      </div>
      <div><span className="micro-label">{item.name} · {item.vendor}</span><h3>{item.displayName}</h3><p>{item.description}</p></div>
      <div className="package-counts"><strong>{item.readTools.length}<span>read tools</span></strong><strong>{item.writeTools.length}<span>write tools</span></strong></div>
      <div className="package-tags">{item.supportedEditions.map((edition) => <span key={edition}>{edition}</span>)}</div>
      <div className="security-tags">{item.security.slice(0, 3).map((control) => <span key={control}>✓ {control}</span>)}</div>
      <div className="package-meta"><span>{item.tools.length} tools</span><span>v{item.version}</span></div>
      <Link href={`/packages/${item.slug}`} className="text-link">View details <span>↗</span></Link>
    </article>
  );
}
