"use client";

import { useMemo, useState } from "react";
import { packages } from "@/data/catalog";
import { PackageCard } from "./PackageCard";

export function MarketplaceClient() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? packages.filter((item) => `${item.displayName} ${item.name} ${item.vendor} ${item.description} ${item.supportedEditions.join(" ")}`.toLowerCase().includes(needle))
      : packages;
  }, [query]);

  return (
    <>
      <div className="market-controls">
        <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Jira or Confluence" aria-label="Search connectors" /></label>
      </div>
      <div className="results-meta"><span>{results.length} repository packages</span><span>Catalogue works without sign-in</span></div>
      <div className="market-grid">{results.map((item) => <PackageCard key={item.slug} item={item} />)}</div>
      {results.length === 0 && <div className="empty-state"><strong>No matching packages</strong><p>Try Jira, Confluence, Cloud or Data Center.</p></div>}
    </>
  );
}
