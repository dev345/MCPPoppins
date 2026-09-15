import { randomUUID } from "node:crypto";

export function createJiraTools(config) {
  const { baseUrl, pat, email, projectKey, enableWrites, timeout = 30000, maxResults = 25 } = config;
  function auth() { if (email) return `Basic ${Buffer.from(`${email}:${pat}`).toString("base64")}`; return `Bearer ${pat}`; }

  async function req(path, opts = {}) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
    try {
      const r = await fetch(`${baseUrl}/rest/api/2${path}`, { ...opts, signal: c.signal, headers: { Authorization: auth(), "Content-Type": "application/json", Accept: "application/json", "X-Request-ID": randomUUID(), ...opts.headers } });
      if (!r.ok) { const s = r.status; if (s === 401) throw new Error("Auth failed (401)."); if (s === 403) throw new Error("Denied (403)."); if (s === 404) throw new Error("Not found (404)."); throw new Error(`Jira ${s}`); }
      return r.status === 204 ? null : r.json();
    } catch (e) { if (e.name === "AbortError") throw new Error("Timeout."); throw e; } finally { clearTimeout(t); }
  }

  const tools = {
    jira_health_check: { description: "Check Jira connection", connector: "jira", mode: "read", handler: async () => { const me = await req("/myself"); return `Connected as ${me.displayName} to ${baseUrl}. Mode: ${enableWrites ? "rw" : "ro"}.`; } },
    jira_whoami: { description: "Current Jira user", connector: "jira", mode: "read", handler: async () => { const d = await req("/myself"); return `${d.displayName} (${d.name || d.accountId})\n${d.emailAddress || ""}`; } },
    jira_my_issues: { description: "Your open issues", connector: "jira", mode: "read", handler: async () => {
      let jql = "assignee=currentUser() AND status!=Done ORDER BY updated DESC";
      if (projectKey) jql = `project=${projectKey} AND ${jql}`;
      const d = await req(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,priority,assignee`);
      if (!d.issues?.length) return "No open issues.";
      return d.issues.map(i => `${i.key}: ${i.fields.summary} [${i.fields.status?.name}] (${i.fields.priority?.name})`).join("\n");
    }},
    jira_get_issue: { description: "Get issue details with links and comments", connector: "jira", mode: "read", parameters: { issueKey: "string" }, handler: async ({ issueKey }) => {
      if (!issueKey) return "Provide an issue key.";
      const d = await req(`/issue/${encodeURIComponent(issueKey)}?fields=summary,status,priority,assignee,reporter,issuetype,created,updated,labels,description,issuelinks,comment`);
      const f = d.fields;
      const links = (f.issuelinks || []).map(l => { if (l.outwardIssue) return `  ${l.type.outward} ${l.outwardIssue.key}`; if (l.inwardIssue) return `  ${l.type.inward} ${l.inwardIssue.key}`; return null; }).filter(Boolean);
      const comments = (f.comment?.comments || []).slice(-3).map(c => `  ${c.author?.displayName || "?"}: ${(c.body || "").slice(0, 150)}`);
      const parts = [`${issueKey}: ${f.summary}`, `Status: ${f.status?.name} | Type: ${f.issuetype?.name} | Priority: ${f.priority?.name}`, `Assignee: ${f.assignee?.displayName || "Unassigned"} | Reporter: ${f.reporter?.displayName || "?"}`, `Created: ${f.created?.split("T")[0]} | Updated: ${f.updated?.split("T")[0]}`, `Labels: ${(f.labels || []).join(", ") || "None"}`];
      if (f.description) parts.push(`\nDescription:\n${f.description.slice(0, 500)}`);
      if (links.length) parts.push(`\nLinks:\n${links.join("\n")}`);
      if (comments.length) parts.push(`\nRecent comments:\n${comments.join("\n")}`);
      parts.push(`\nURL: ${baseUrl}/browse/${issueKey}`);
      return parts.join("\n");
    }},
    jira_search: { description: "JQL search", connector: "jira", mode: "read", parameters: { jql: "string" }, handler: async ({ jql }) => {
      if (!jql) return "Provide JQL.";
      const d = await req(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,priority,assignee`);
      if (!d.issues?.length) return "No issues.";
      return `${d.total} found:\n` + d.issues.map(i => `${i.key}: ${i.fields.summary} [${i.fields.status?.name}] (${i.fields.priority?.name})`).join("\n");
    }},
    jira_get_comments: { description: "Get issue comments", connector: "jira", mode: "read", parameters: { issueKey: "string" }, handler: async ({ issueKey }) => {
      if (!issueKey) return "Provide issue key.";
      const d = await req(`/issue/${encodeURIComponent(issueKey)}/comment?maxResults=${maxResults}`);
      if (!d.comments?.length) return `No comments on ${issueKey}.`;
      return d.comments.map(c => `${c.author?.displayName || "?"} (${c.created?.split("T")[0]}): ${(c.body || "").slice(0, 200)}`).join("\n\n");
    }},
    jira_get_sprint: { description: "Active sprint issues", connector: "jira", mode: "read", parameters: { projectKey: "string?" }, handler: async ({ projectKey: pk }) => {
      const p = pk || projectKey; if (!p) return "Provide project key.";
      try { const d = await req(`/search?jql=${encodeURIComponent(`project=${p} AND sprint in openSprints() ORDER BY priority DESC`)}&maxResults=${maxResults}&fields=summary,status,assignee,priority`); if (!d.issues?.length) return `No sprint issues for ${p}.`; return `Sprint (${d.total}):\n` + d.issues.map(i => `${i.key}: ${i.fields.summary} [${i.fields.status?.name}] -> ${i.fields.assignee?.displayName || "?"}`).join("\n"); } catch { return `No sprint data for ${p}.`; }
    }},
    jira_high_priority: { description: "High/Highest priority open issues", connector: "jira", mode: "read", handler: async () => {
      let jql = "priority in (Highest,High) AND status!=Done ORDER BY priority DESC"; if (projectKey) jql = `project=${projectKey} AND ${jql}`;
      const d = await req(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,priority,assignee`);
      if (!d.issues?.length) return "No high-priority issues.";
      return `${d.total} high-priority:\n` + d.issues.map(i => `${i.key}: ${i.fields.summary} [${i.fields.status?.name}] (${i.fields.priority?.name})`).join("\n");
    }},
    jira_overdue: { description: "Issues not updated in 14+ days", connector: "jira", mode: "read", handler: async () => {
      let jql = "status!=Done AND updated<=-14d ORDER BY updated ASC"; if (projectKey) jql = `project=${projectKey} AND ${jql}`;
      const d = await req(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,updated`);
      if (!d.issues?.length) return "No overdue issues.";
      return `${d.total} overdue:\n` + d.issues.map(i => `${i.key}: ${i.fields.summary} [${i.fields.status?.name}] last updated ${i.fields.updated?.split("T")[0]}`).join("\n");
    }},
  };

  if (enableWrites) {
    tools.jira_create_issue = { description: "Create issue (write)", connector: "jira", mode: "write", parameters: { projectKey: "string", summary: "string", description: "string?", issueType: "string?", priority: "string?" }, handler: async ({ projectKey: pk, summary, description, issueType, priority }) => {
      if (!pk || !summary) return "Provide projectKey and summary.";
      const body = { fields: { project: { key: pk }, summary, issuetype: { name: issueType || "Task" }, priority: { name: priority || "Medium" } } }; if (description) body.fields.description = description;
      const r = await req("/issue", { method: "POST", body: JSON.stringify(body) }); return `Created: ${r.key}\nURL: ${baseUrl}/browse/${r.key}`;
    }};
    tools.jira_add_comment = { description: "Add comment (write)", connector: "jira", mode: "write", parameters: { issueKey: "string", comment: "string" }, handler: async ({ issueKey, comment }) => {
      if (!issueKey || !comment) return "Provide issueKey and comment.";
      await req(`/issue/${encodeURIComponent(issueKey)}/comment`, { method: "POST", body: JSON.stringify({ body: comment }) }); return `Comment added to ${issueKey}.`;
    }};
  }
  return tools;
}
