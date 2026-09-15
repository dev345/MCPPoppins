import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const PAT = process.env.CONFLUENCE_PAT;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const ENABLE_WRITES = (process.env.CONFLUENCE_ENABLE_WRITES || "false").toLowerCase() === "true";
const TIMEOUT = Math.max(5000, Number(process.env.CONFLUENCE_REQUEST_TIMEOUT) || 30000);
const MAX_RESULTS = Math.min(100, Math.max(1, Number(process.env.CONFLUENCE_MAX_RESULTS) || 25));

const errs = [];
if (!BASE_URL) errs.push("CONFLUENCE_BASE_URL is required (e.g. https://your-domain.atlassian.net/wiki).");
if (!PAT) errs.push("CONFLUENCE_PAT is required. Generate a token from your profile settings.");
if (errs.length) { console.error("\n--- Confluence MCP Config Error ---"); errs.forEach(e => console.error(`  - ${e}`)); process.exit(1); }

function buildAuth() {
  if (EMAIL) return `Basic ${Buffer.from(`${EMAIL}:${PAT}`).toString("base64")}`;
  return `Bearer ${PAT}`;
}

function sanitizeCql(input) { return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

async function confluenceRequest(path, options = {}) {
  const url = `${BASE_URL}/rest/api${path}`;
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      ...options, signal: controller.signal,
      headers: { Authorization: buildAuth(), "Content-Type": "application/json", Accept: "application/json", "X-Request-ID": randomUUID(), ...options.headers },
    });
    if (!r.ok) {
      const s = r.status; let d = ""; try { d = await r.text(); } catch {}
      if (s === 401) throw new Error("Authentication failed (401). Check your CONFLUENCE_PAT.");
      if (s === 403) throw new Error("Permission denied (403).");
      if (s === 404) throw new Error("Resource not found (404).");
      if (s === 429) throw new Error("Rate limited (429). Wait and retry.");
      throw new Error(`Confluence API ${s}: ${d.slice(0, 300)}`);
    }
    return r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`Request timed out (${TIMEOUT}ms).`);
    throw e;
  } finally { clearTimeout(tm); }
}

function storageToText(html) {
  if (!html) return "";
  let t = html;
  t = t.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
  t = t.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, l, c) => "\n" + "#".repeat(+l) + " " + strip(c) + "\n");
  t = t.replace(/<p[^>]*>(.*?)<\/p>/gi, (_, c) => strip(c) + "\n\n");
  t = t.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, c) => "- " + strip(c) + "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  t = t.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  t = t.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  t = t.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  t = t.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (_, row) => {
    const cells = []; row.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, (_, c) => { cells.push(strip(c).trim()); });
    return "| " + cells.join(" | ") + " |\n";
  });
  t = t.replace(/<ac:structured-macro[^>]*ac:name="code"[^>]*>.*?<ac:plain-text-body>(.*?)<\/ac:plain-text-body>.*?<\/ac:structured-macro>/gs,
    (_, code) => "\n```\n" + code.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1") + "\n```\n");
  t = strip(t);
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function strip(html) { return html.replace(/<[^>]*>/g, ""); }

const server = new McpServer({ name: "confluence", version: "1.0.0" });

server.tool("health_check", "Validate the Confluence connection.", {}, async () => {
  try {
    const d = await confluenceRequest("/space?limit=1");
    return { content: [{ type: "text", text: `Connected to ${BASE_URL}\nSpaces: ${d.size || d.results?.length || "?"}\nMode: ${ENABLE_WRITES ? "read-write" : "read-only"}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Failed: ${e.message}` }] }; }
});

server.tool("get_page", "Get a Confluence page by ID.", { pageId: z.string().describe("Page ID") }, async ({ pageId }) => {
  const d = await confluenceRequest(`/content/${pageId}?expand=body.storage,version,space,ancestors`);
  const content = storageToText(d.body?.storage?.value || "");
  const path = (d.ancestors || []).map(a => a.title).join(" > ");
  return { content: [{ type: "text", text: `# ${d.title}\n\n**ID:** ${d.id}\n**Space:** ${d.space?.key}\n**Version:** ${d.version?.number}\n**Updated:** ${d.version?.when}\n**Path:** ${path}\n**URL:** ${BASE_URL}/pages/viewpage.action?pageId=${d.id}\n\n---\n\n${content}` }] };
});

server.tool("get_page_by_title", "Find a page by title in a space.", {
  spaceKey: z.string().describe("Space key"), title: z.string().describe("Page title"),
}, async ({ spaceKey, title }) => {
  const d = await confluenceRequest(`/content?spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(title)}&expand=body.storage,version,space,ancestors`);
  if (!d.results?.length) return { content: [{ type: "text", text: `No page "${title}" in space "${spaceKey}"` }] };
  const p = d.results[0]; const content = storageToText(p.body?.storage?.value || "");
  return { content: [{ type: "text", text: `# ${p.title}\n\n**ID:** ${p.id}\n**Space:** ${p.space?.key}\n**Version:** ${p.version?.number}\n**URL:** ${BASE_URL}/pages/viewpage.action?pageId=${p.id}\n\n---\n\n${content}` }] };
});

server.tool("list_child_pages", "List child pages of a page.", { pageId: z.string() }, async ({ pageId }) => {
  const d = await confluenceRequest(`/content/${pageId}/child/page?expand=version&limit=${MAX_RESULTS}`);
  const pages = (d.results || []).map(p => `- **${p.title}** (ID: ${p.id}, v${p.version?.number})`);
  return { content: [{ type: "text", text: pages.length ? `Child pages:\n\n${pages.join("\n")}` : "No child pages." }] };
});

server.tool("search_pages", "Search Confluence pages using CQL.", {
  query: z.string().describe("Search text"), spaceKey: z.string().optional().describe("Space key"),
}, async ({ query, spaceKey }) => {
  let cql = `text ~ "${sanitizeCql(query)}"`;
  if (spaceKey) cql += ` AND space = "${sanitizeCql(spaceKey)}"`;
  const d = await confluenceRequest(`/content/search?cql=${encodeURIComponent(cql)}&limit=${MAX_RESULTS}&expand=version,space`);
  const results = (d.results || []).map(p => `- **${p.title}** (ID: ${p.id}, Space: ${p.space?.key})`);
  return { content: [{ type: "text", text: results.length ? `Results for "${query}":\n\n${results.join("\n")}` : `No results for "${query}"` }] };
});

server.tool("get_page_raw", "Get raw XHTML storage format.", { pageId: z.string() }, async ({ pageId }) => {
  const d = await confluenceRequest(`/content/${pageId}?expand=body.storage,version`);
  return { content: [{ type: "text", text: `**${d.title}** (v${d.version?.number})\n\n${d.body?.storage?.value || "(empty)"}` }] };
});

// P1: Structured page metadata (machine-readable JSON alongside text)
server.tool("get_page_metadata", "Get structured metadata for a Confluence page (ID, title, space, version, URL, labels).", {
  pageId: z.string().describe("Page ID"),
}, async ({ pageId }) => {
  const d = await confluenceRequest(`/content/${pageId}?expand=version,space,ancestors,metadata.labels`);
  const labels = (d.metadata?.labels?.results || []).map(l => l.name);
  const ancestors = (d.ancestors || []).map(a => ({ id: a.id, title: a.title }));
  const meta = {
    id: d.id, title: d.title,
    space: { key: d.space?.key, name: d.space?.name },
    version: d.version?.number, lastUpdated: d.version?.when, lastUpdatedBy: d.version?.by?.displayName,
    url: `${BASE_URL}/pages/viewpage.action?pageId=${d.id}`,
    labels, ancestors, type: d.type,
  };
  return { content: [{ type: "text", text: `## Page Metadata: ${d.title}\n\n\`\`\`json\n${JSON.stringify(meta, null, 2)}\n\`\`\`\n\n**Labels:** ${labels.length ? labels.join(", ") : "None"}\n**Path:** ${ancestors.map(a => a.title).join(" > ")}` }] };
});

// P1: List page attachments
server.tool("get_attachments", "List attachments on a Confluence page.", {
  pageId: z.string().describe("Page ID"),
}, async ({ pageId }) => {
  const d = await confluenceRequest(`/content/${pageId}/child/attachment?limit=${MAX_RESULTS}&expand=version`);
  const atts = d.results || [];
  if (!atts.length) return { content: [{ type: "text", text: `No attachments on page ${pageId}.` }] };
  const lines = atts.map(a => {
    const size = a.extensions?.fileSize ? `${(a.extensions.fileSize / 1024).toFixed(1)} KB` : "? KB";
    return `- **${a.title}** (${size}, ${a.extensions?.mediaType || "?"}) v${a.version?.number || "?"}`;
  });
  return { content: [{ type: "text", text: `Attachments (${atts.length}):\n\n${lines.join("\n")}` }] };
});

// P1: Get page labels
server.tool("get_labels", "Get labels on a Confluence page.", {
  pageId: z.string().describe("Page ID"),
}, async ({ pageId }) => {
  const d = await confluenceRequest(`/content/${pageId}/label`);
  const labels = (d.results || []).map(l => l.name);
  if (!labels.length) return { content: [{ type: "text", text: `No labels on page ${pageId}.` }] };
  return { content: [{ type: "text", text: `Labels: ${labels.join(", ")}` }] };
});

// P1: Get page version history
server.tool("get_page_history", "Get version history of a Confluence page.", {
  pageId: z.string().describe("Page ID"),
  limit: z.number().optional().describe("Versions to retrieve (default 10)"),
}, async ({ pageId, limit }) => {
  const max = Math.min(limit || 10, MAX_RESULTS);
  const d = await confluenceRequest(`/content/${pageId}/version?limit=${max}`);
  const versions = d.results || [];
  if (!versions.length) return { content: [{ type: "text", text: `No history for page ${pageId}.` }] };
  const lines = versions.map(v => `- **v${v.number}** by ${v.by?.displayName || "?"} on ${v.when?.split("T")[0] || "?"}: ${v.message || "(no message)"}`);
  return { content: [{ type: "text", text: `Version history (${versions.length}):\n\n${lines.join("\n")}` }] };
});

// P1: Search with pagination
server.tool("search_pages_advanced", "Search Confluence pages with pagination.", {
  query: z.string(), spaceKey: z.string().optional(),
  start: z.number().optional().describe("Offset (default 0)"),
  limit: z.number().optional().describe("Per page (default 25, max 100)"),
}, async ({ query, spaceKey, start, limit }) => {
  const offset = start || 0;
  const max = Math.min(limit || MAX_RESULTS, MAX_RESULTS);
  let cql = `text ~ "${sanitizeCql(query)}"`;
  if (spaceKey) cql += ` AND space = "${sanitizeCql(spaceKey)}"`;
  const d = await confluenceRequest(`/content/search?cql=${encodeURIComponent(cql)}&start=${offset}&limit=${max}&expand=version,space`);
  const results = (d.results || []).map(p => `- **${p.title}** (ID: ${p.id}, Space: ${p.space?.key})`);
  const total = d.totalSize || d.size || "?";
  const hasMore = !!d._links?.next;
  return { content: [{ type: "text", text: `Results for "${query}" (${offset + 1}-${offset + results.length} of ${total}):\n\n${results.length ? results.join("\n") : "None."}\n\n${hasMore ? `Next page: start=${offset + max}` : "End of results."}` }] };
});

if (ENABLE_WRITES) {
  server.tool("update_page", "Update a Confluence page (write mode required). Handles version conflicts.", {
    pageId: z.string(), newContent: z.string().describe("HTML/XHTML content"), title: z.string().optional(),
    expectedVersion: z.number().optional().describe("Expected current version for optimistic locking"),
  }, async ({ pageId, newContent, title, expectedVersion }) => {
    const cur = await confluenceRequest(`/content/${pageId}?expand=version,space`);
    if (expectedVersion !== undefined && cur.version.number !== expectedVersion) {
      return { content: [{ type: "text", text: `Version conflict: page is at v${cur.version.number} but you expected v${expectedVersion}. Re-read and retry.` }] };
    }
    const body = { id: pageId, type: "page", title: title || cur.title, space: { key: cur.space.key },
      body: { storage: { value: newContent, representation: "storage" } }, version: { number: cur.version.number + 1 } };
    try {
      const r = await confluenceRequest(`/content/${pageId}`, { method: "PUT", body: JSON.stringify(body) });
      return { content: [{ type: "text", text: `Updated: **${r.title}** v${r.version.number}` }] };
    } catch (e) {
      if (e.message.includes("409") || e.message.includes("version")) {
        return { content: [{ type: "text", text: `Version conflict during save. Another user edited the page. Re-read and retry.` }] };
      }
      throw e;
    }
  });

  server.tool("create_page", "Create a Confluence page (write mode required).", {
    spaceKey: z.string(), title: z.string(), content: z.string(), parentPageId: z.string().optional(),
  }, async ({ spaceKey, title, content, parentPageId }) => {
    const body = { type: "page", title, space: { key: spaceKey }, body: { storage: { value: content, representation: "storage" } } };
    if (parentPageId) body.ancestors = [{ id: parentPageId }];
    const r = await confluenceRequest("/content", { method: "POST", body: JSON.stringify(body) });
    return { content: [{ type: "text", text: `Created: **${r.title}** (ID: ${r.id})` }] };
  });
}

console.error(`Confluence MCP starting (${ENABLE_WRITES ? "read-write" : "read-only"}, timeout ${TIMEOUT}ms)`);
const transport = new StdioServerTransport();
await server.connect(transport);
