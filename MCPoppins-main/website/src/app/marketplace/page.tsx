import { MarketplaceClient } from "@/components/MarketplaceClient";

export default function MarketplacePage() {
  return (
    <>
      <section className="page-hero page-hero-market"><div className="shell"><span className="eyebrow">MCP Marketplace</span><h1>Trusted connectors, inspectable before install.</h1><p>Browse the Jira and Confluence packages defined in the repository metadata. Compare tools, editions and security controls before opening the reusable detail page.</p></div></section>
      <section className="section shell market-section"><MarketplaceClient /></section>
    </>
  );
}
