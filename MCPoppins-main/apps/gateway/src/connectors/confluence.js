import { randomUUID } from "node:crypto";

export function createConfluenceTools(config) {
  const { baseUrl, pat, email, enableWrites, timeout = 30000, maxResults = 25 } = config;
  function auth() { if (email) return `Basic ${Buffer.from(`${email}:${pat}`).toString("base64")}`; return `Bearer ${pat}`; }
  function esc(s) { return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

  async function req(path, opts = {}) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
    try {
      const r = await fetch(`${baseUrl}/rest/api${path}`, { ...opts, signal: c.signal, headers: { Authorization: auth(), "Content-Type": "application/json", Accept: "application/json", "X-Request-ID": randomUUID(), ...opts.headers } });
      if (!r.ok) { const s = r.status; if (s === 401) throw new Error("Auth failed."); if (s === 403) throw new Error("Denied."); if (s === 404) throw new Error("Not found."); throw new Error(`Confluence ${s}`); }
      return r.json();
    } catch (e) { if (e.name === "AbortError") throw new Error("Timeout."); throw e; } finally { clearTimeout(t); }
  }

  function strip(h) { return (h || "").replace(/<[^>]*>/g, ""); }

  return {
    confluence_health_check: { description: "Check Confluence connection", connector: "confluence", mode: "read",
      handler: async () => { const d = await req("/space?limit=1"); return `Connected to ${baseUrl}. Spaces: ${d.results?.length || "?"}. Mode: ${enableWrites ? "rw" : "ro"}.`; }
    },
    confluence_search: { description: "Search pages", connector: "confluence", mode: "read", parameters: { query: "string", spaceKey: "string?" },
      handler: async ({ query, spaceKey }) => {
        if (!query) return "Provide a query.";
        let cql = `text ~ "${esc(query)}"`; if (spaceKey) cql += ` AND space = "${esc(spaceKey)}"`;
        const d = await req(`/content/search?cql=${encodeURIComponent(cql)}&limit=${maxResults}&expand=space,version`);
        if (!d.results?.length) return "No results.";
        return d.results.map(p => `${p.title} (ID: ${p.id}, Space: ${p.space?.key}, v${p.version?.number})`).join("\n");
      }
    },
    confluence_get_page: { description: "Get page by ID with labels and path", connector: "confluence", mode: "read", parameters: { pageId: "string" },
      handler: async ({ pageId }) => {
        if (!pageId) return "Provide page ID.";
        const d = await req(`/content/${pageId}?expand=body.storage,version,space,ancestors,metadata.labels`);
        const content = strip(d.body?.storage?.value || "").slice(0, 2000);
        const labels = (d.metadata?.labels?.results || []).map(l => l.name);
        const path = (d.ancestors || []).map(a => a.title).join(" > ");
        return [`${d.title} (ID: ${d.id}, v${d.version?.number})`, `Space: ${d.space?.key} (${d.space?.name})`, `Updated: ${d.version?.when?.split("T")[0]} by ${d.version?.by?.displayName || "?"}`, `Path: ${path || "Root"}`, labels.length ? `Labels: ${labels.join(", ")}` : null, `URL: ${baseUrl}/pages/viewpage.action?pageId=${d.id}`, `\n${content}`].filter(Boolean).join("\n");
      }
    },
    confluence_get_labels: { description: "Get page labels", connector: "confluence", mode: "read", parameters: { pageId: "string" },
      handler: async ({ pageId }) => { if (!pageId) return "Provide page ID."; const d = await req(`/content/${pageId}/label`); const l = (d.results || []).map(x => x.name); return l.length ? `Labels: ${l.join(", ")}` : "No labels."; }
    },
    confluence_get_children: { description: "List child pages", connector: "confluence", mode: "read", parameters: { pageId: "string" },
      handler: async ({ pageId }) => { if (!pageId) return "Provide page ID."; const d = await req(`/content/${pageId}/child/page?expand=version&limit=${maxResults}`); if (!d.results?.length) return "No child pages."; return d.results.map(p => `${p.title} (ID: ${p.id}, v${p.version?.number})`).join("\n"); }
    },
    confluence_get_history: { description: "Page version history", connector: "confluence", mode: "read", parameters: { pageId: "string" },
      handler: async ({ pageId }) => { if (!pageId) return "Provide page ID."; const d = await req(`/content/${pageId}/version?limit=10`); if (!d.results?.length) return "No history."; return d.results.map(v => `v${v.number} by ${v.by?.displayName || "?"} on ${v.when?.split("T")[0] || "?"}: ${v.message || "(no msg)"}`).join("\n"); }
    },
    confluence_get_attachments: { description: "Page attachments", connector: "confluence", mode: "read", parameters: { pageId: "string" },
      handler: async ({ pageId }) => { if (!pageId) return "Provide page ID."; const d = await req(`/content/${pageId}/child/attachment?limit=${maxResults}&expand=version`); if (!d.results?.length) return "No attachments."; return d.results.map(a => `${a.title} (${a.extensions?.fileSize ? (a.extensions.fileSize/1024).toFixed(1)+" KB" : "?"}, ${a.extensions?.mediaType || "?"})`).join("\n"); }
    },
    confluence_find_related: { description: "Find pages mentioning a Jira issue key", connector: "confluence", mode: "read", parameters: { issueKey: "string" },
      handler: async ({ issueKey }) => { if (!issueKey) return "Provide issue key."; const d = await req(`/content/search?cql=${encodeURIComponent(`text ~ "${esc(issueKey)}"`)}&limit=10&expand=space`); if (!d.results?.length) return `No pages mention ${issueKey}.`; return `Pages mentioning ${issueKey}:\n` + d.results.map(p => `${p.title} (ID: ${p.id}, Space: ${p.space?.key})`).join("\n"); }
    },
  };
}
