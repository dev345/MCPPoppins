import Link from "next/link";

export default function NotFound() {
  return <section className="page-hero shell"><span className="eyebrow">404</span><h1>That package is not in the catalogue.</h1><p>Browse the sample Jira and Confluence kits instead.</p><Link className="button button-dark" href="/marketplace">Open marketplace</Link></section>;
}
