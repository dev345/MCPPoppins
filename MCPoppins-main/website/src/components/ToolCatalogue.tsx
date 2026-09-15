"use client";

import { useMemo, useState } from "react";

export type CatalogueTool = {
  connector: string;
  name: string;
  description: string;
  mode: "Read" | "Write";
};

export function ToolCatalogue({ tools }: { tools: CatalogueTool[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? tools.filter((tool) => `${tool.connector} ${tool.name} ${tool.description} ${tool.mode}`.toLowerCase().includes(needle)) : tools;
  }, [query, tools]);

  return <div className="catalogue-panel">
    <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all 30 tools" aria-label="Search tool catalogue" /></label>
    <p className="results-meta"><span>{matches.length} tools</span><span>Jira and Confluence</span></p>
    <div className="tool-catalogue">
      {matches.map((tool) => <article key={`${tool.connector}-${tool.name}`}><div><span>{tool.connector}</span><code>{tool.name}</code><p>{tool.description}</p></div><strong className={tool.mode.toLowerCase()}>{tool.mode}{tool.mode === "Write" ? " · approval" : ""}</strong></article>)}
    </div>
    {matches.length === 0 && <div className="empty-state"><strong>No matching tools</strong><p>Try a connector name, tool name or capability.</p></div>}
  </div>;
}
