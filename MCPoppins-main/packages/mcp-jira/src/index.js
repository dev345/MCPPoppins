import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Configuration — validated at startup, no hard-coded organisation defaults
// ---------------------------------------------------------------------------

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_PAT = process.env.JIRA_PAT;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "";
const ENABLE_WRITES = (process.env.JIRA_ENABLE_WRITES || "false").toLowerCase() === "true";
const REQUEST_TIMEOUT = Math.max(5000, Number(process.env.JIRA_REQUEST_TIMEOUT) || 30000);
const MAX_RESULTS = Math.min(100, Math.max(1, Number(process.env.JIRA_MAX_RESULTS) || 25));
const ALLOWED_PROJECTS = (process.env.JIRA_ALLOWED_PROJECTS || "")
  .split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

const errors = [];
if (!JIRA_BASE_URL) errors.push("JIRA_BASE_URL is required. Set it to your Jira instance URL (e.g. https://your-domain.atlassian.net).");
if (!JIRA_PAT) errors.push("JIRA_PAT is required. Generate a Personal Access Token or API token from your Jira profile settings.");
if (errors.length > 0) {
  console.error("\n--- Jira MCP Configuration Error ---");
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error("\nSee .env.example for the full list of configuration options.\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProjectAllowed(key) {
  if (ALLOWED_PROJECTS.length === 0) return true;
  return ALLOWED_PROJECTS.includes(key.toUpperCase());
}

function buildAuth() {
  if (JIRA_EMAIL) return `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_PAT}`).toString("base64")}`;
  return `Bearer ${JIRA_PAT}`;
}

async function jiraRequest(path, options = {}) {
  const url = `${JIRA_BASE_URL}/rest/api/2${path}`;
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const r = await fetch(url, {
      ...options, signal: controller.signal,
      headers: { Authorization: buildAuth(), "Content-Type": "application/json", Accept: "application/json", "X-Request-ID": randomUUID(), ...options.headers },
    });
    if (!r.ok) {
      const s = r.status; let d = ""; try { d = await r.text(); } catch {}
      if (s === 401) throw new Error("Authentication failed (401). Check your JIRA_PAT.");
      if (s === 403) throw new Error("Permission denied (403).");
      if (s === 404) throw new Error("Resource not found (404).");
      if (s === 429) throw new Error("Rate limited (429). Wait and retry.");
      throw new Error(`Jira API ${s}: ${d.slice(0, 300)}`);
    }
    if (r.status === 204) return null;
    return r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`Request timed out (${REQUEST_TIMEOUT}ms).`);
    throw e;
  } finally { clearTimeout(tm); }
}

function extractPK(key) { const m = key.match(/^([A-Z][A-Z0-9_]+)-\d+$/i); return m ? m[1].toUpperCase() : null; }

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({ name: "jira", version: "1.0.0" });

// --- Read tools ---

server.tool("health_check", "Validate connection and show authenticated user.", {}, async () => {
  try {
    const me = await jiraRequest("/myself");
    return { content: [{ type: "text", text: `Connected as ${me.displayName} (${me.name || me.accountId})\nInstance: ${JIRA_BASE_URL}\nMode: ${ENABLE_WRITES ? "read-write" : "read-only"}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Connection failed: ${e.message}` }] }; }
});

server.tool("get_issue", "Get details of a Jira issue by key (e.g., PROJ-123)", { issueKey: z.string().describe("The issue key") }, async ({ issueKey }) => {
  const pk = extractPK(issueKey);
  if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} is not in the allowed list.` }] };
  const data = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}`);
  const f = data.fields;
  return { content: [{ type: "text", text: [
    `# ${issueKey}: ${f.summary}`, "", `**Status:** ${f.status?.name}`, `**Type:** ${f.issuetype?.name}`, `**Priority:** ${f.priority?.name}`,
    `**Assignee:** ${f.assignee?.displayName || "Unassigned"}`, `**Reporter:** ${f.reporter?.displayName || "Unknown"}`,
    `**Created:** ${f.created}`, `**Updated:** ${f.updated}`, `**Labels:** ${(f.labels || []).join(", ") || "None"}`,
    "", "## Description", "", f.description || "(No description)", "", `**URL:** ${JIRA_BASE_URL}/browse/${issueKey}`
  ].join("\n") }] };
});

server.tool("search_issues", "Search Jira issues using JQL", {
  jql: z.string().describe("JQL query"), maxResults: z.number().optional().describe("Max results (default 25, max 100)"),
}, async ({ jql, maxResults }) => {
  const limit = Math.min(maxResults || MAX_RESULTS, MAX_RESULTS);
  const data = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}&fields=summary,status,assignee,priority,issuetype,updated`);
  if (!data.issues?.length) return { content: [{ type: "text", text: "No issues found." }] };
  const lines = data.issues.map((i) => `- **${i.key}**: ${i.fields.summary} [${i.fields.status?.name}] (${i.fields.priority?.name}, ${i.fields.assignee?.displayName || "Unassigned"})`);
  return { content: [{ type: "text", text: `Found ${data.total} issues (showing ${data.issues.length}):\n\n${lines.join("\n")}` }] };
});

server.tool("my_issues", "Get all open issues assigned to you", {}, async () => {
  let jql = "assignee = currentUser() AND status != Done ORDER BY updated DESC";
  if (JIRA_PROJECT_KEY) jql = `project = ${JIRA_PROJECT_KEY} AND ${jql}`;
  const data = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${MAX_RESULTS}&fields=summary,status,priority,issuetype,updated`);
  if (!data.issues?.length) return { content: [{ type: "text", text: "You have no open issues." }] };
  const lines = data.issues.map((i) => `- **${i.key}**: ${i.fields.summary} [${i.fields.status?.name}] (${i.fields.priority?.name})`);
  return { content: [{ type: "text", text: `Your open issues (${data.total}):\n\n${lines.join("\n")}` }] };
});

server.tool("get_board_issues", "Get issues from the active sprint/board", { status: z.string().optional().describe("Filter by status") }, async ({ status }) => {
  let jql = JIRA_PROJECT_KEY ? `project = ${JIRA_PROJECT_KEY} AND status != Done` : "status != Done";
  if (status) jql += ` AND status = "${status}"`;
  jql += " ORDER BY updated DESC";
  const data = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${MAX_RESULTS}&fields=summary,status,assignee,priority,issuetype`);
  if (!data.issues?.length) return { content: [{ type: "text", text: "No active issues found." }] };
  const lines = data.issues.map((i) => `- **${i.key}**: ${i.fields.summary} [${i.fields.status?.name}] -> ${i.fields.assignee?.displayName || "Unassigned"}`);
  return { content: [{ type: "text", text: `Active issues (${data.total} total, showing ${data.issues.length}):\n\n${lines.join("\n")}` }] };
});

server.tool("whoami", "Get the current authenticated Jira user info", {}, async () => {
  const d = await jiraRequest("/myself");
  return { content: [{ type: "text", text: `**Name:** ${d.displayName}\n**Username:** ${d.name || d.accountId || "N/A"}\n**Email:** ${d.emailAddress || "N/A"}` }] };
});

// P1: Real sprint view using Agile API with JQL fallback
server.tool("get_sprint_issues", "Get issues from the active sprint for a project (uses Agile API with JQL fallback).", {
  projectKey: z.string().optional().describe("Project key (uses default if not set)"),
}, async ({ projectKey }) => {
  const pk = projectKey || JIRA_PROJECT_KEY;
  if (!pk) return { content: [{ type: "text", text: "No project key provided and JIRA_PROJECT_KEY is not set." }] };
  if (!isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };

  // Try Agile API: board -> active sprint -> sprint issues
  try {
    const boardUrl = `${JIRA_BASE_URL}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(pk)}`;
    const ctrl1 = new AbortController(); const t1 = setTimeout(() => ctrl1.abort(), REQUEST_TIMEOUT);
    const bResp = await fetch(boardUrl, { signal: ctrl1.signal, headers: { Authorization: buildAuth(), Accept: "application/json", "X-Request-ID": randomUUID() } });
    clearTimeout(t1);

    if (bResp.ok) {
      const bData = await bResp.json();
      if (bData.values?.length > 0) {
        const boardId = bData.values[0].id;
        const boardName = bData.values[0].name;
        const sResp = await fetch(`${JIRA_BASE_URL}/rest/agile/1.0/board/${boardId}/sprint?state=active`, { headers: { Authorization: buildAuth(), Accept: "application/json" } });
        if (sResp.ok) {
          const sData = await sResp.json();
          if (sData.values?.length > 0) {
            const sprint = sData.values[0];
            const iResp = await fetch(`${JIRA_BASE_URL}/rest/agile/1.0/sprint/${sprint.id}/issue?maxResults=${MAX_RESULTS}&fields=summary,status,assignee,priority,issuetype`, { headers: { Authorization: buildAuth(), Accept: "application/json" } });
            if (iResp.ok) {
              const iData = await iResp.json();
              const lines = (iData.issues || []).map(i => `- **${i.key}**: ${i.fields.summary} [${i.fields.status?.name}] -> ${i.fields.assignee?.displayName || "Unassigned"} (${i.fields.priority?.name})`);
              return { content: [{ type: "text", text: `## Sprint: ${sprint.name}\n**Board:** ${boardName}\n**Goal:** ${sprint.goal || "None"}\n**Start:** ${sprint.startDate || "?"}\n**End:** ${sprint.endDate || "?"}\n\n${lines.length ? lines.join("\n") : "No issues in sprint."}` }] };
            }
          }
        }
      }
    }
  } catch { /* Agile API unavailable, fall through */ }

  // Fallback: JQL
  const jql = `project = ${pk} AND sprint in openSprints() ORDER BY priority DESC`;
  try {
    const data = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${MAX_RESULTS}&fields=summary,status,assignee,priority,issuetype`);
    if (!data.issues?.length) return { content: [{ type: "text", text: `No active sprint issues for ${pk}.` }] };
    const lines = data.issues.map(i => `- **${i.key}**: ${i.fields.summary} [${i.fields.status?.name}] -> ${i.fields.assignee?.displayName || "Unassigned"}`);
    return { content: [{ type: "text", text: `Sprint issues for ${pk} (${data.total}):\n\n${lines.join("\n")}` }] };
  } catch {
    return { content: [{ type: "text", text: `Could not retrieve sprint data for ${pk}.` }] };
  }
});

// P1: List issue attachments
server.tool("get_attachments", "List attachments on a Jira issue.", {
  issueKey: z.string().describe("The issue key"),
}, async ({ issueKey }) => {
  const pk = extractPK(issueKey);
  if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
  const data = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}?fields=attachment`);
  const atts = data.fields?.attachment || [];
  if (!atts.length) return { content: [{ type: "text", text: `No attachments on ${issueKey}.` }] };
  const lines = atts.map(a => `- **${a.filename}** (${(a.size / 1024).toFixed(1)} KB) by ${a.author?.displayName || "?"} on ${a.created?.split("T")[0] || "?"}`);
  return { content: [{ type: "text", text: `Attachments on ${issueKey} (${atts.length}):\n\n${lines.join("\n")}` }] };
});

// P1: Get worklogs
server.tool("get_worklogs", "Get work logs for a Jira issue.", {
  issueKey: z.string().describe("The issue key"),
}, async ({ issueKey }) => {
  const pk = extractPK(issueKey);
  if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
  const data = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/worklog`);
  const logs = data.worklogs || [];
  if (!logs.length) return { content: [{ type: "text", text: `No work logged on ${issueKey}.` }] };
  const lines = logs.map(w => `- **${w.timeSpent}** by ${w.author?.displayName || "?"} on ${w.started?.split("T")[0] || "?"}: ${w.comment || "(no comment)"}`);
  const totalH = (logs.reduce((s, w) => s + (w.timeSpentSeconds || 0), 0) / 3600).toFixed(1);
  return { content: [{ type: "text", text: `Work logs on ${issueKey} (${logs.length} entries, ${totalH}h total):\n\n${lines.join("\n")}` }] };
});

// P1: Get comments
server.tool("get_comments", "Get comments on a Jira issue.", {
  issueKey: z.string().describe("The issue key"),
}, async ({ issueKey }) => {
  const pk = extractPK(issueKey);
  if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
  const data = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/comment?maxResults=${MAX_RESULTS}`);
  const comments = data.comments || [];
  if (!comments.length) return { content: [{ type: "text", text: `No comments on ${issueKey}.` }] };
  const lines = comments.map(c => `### ${c.author?.displayName || "Unknown"} — ${c.created?.split("T")[0] || "?"}\n${c.body || "(empty)"}\n`);
  return { content: [{ type: "text", text: `Comments on ${issueKey} (${data.total || comments.length}):\n\n${lines.join("\n")}` }] };
});

// P1: Get linked issues
server.tool("get_links", "Get linked issues (blocks, relates to, duplicates, etc.).", {
  issueKey: z.string().describe("The issue key"),
}, async ({ issueKey }) => {
  const pk = extractPK(issueKey);
  if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
  const data = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}?fields=issuelinks`);
  const links = data.fields?.issuelinks || [];
  if (!links.length) return { content: [{ type: "text", text: `No linked issues on ${issueKey}.` }] };
  const lines = links.map(l => {
    if (l.outwardIssue) return `- ${l.type.outward} **${l.outwardIssue.key}**: ${l.outwardIssue.fields?.summary} [${l.outwardIssue.fields?.status?.name}]`;
    if (l.inwardIssue) return `- ${l.type.inward} **${l.inwardIssue.key}**: ${l.inwardIssue.fields?.summary} [${l.inwardIssue.fields?.status?.name}]`;
    return `- ${l.type.name}`;
  });
  return { content: [{ type: "text", text: `Linked issues for ${issueKey}:\n\n${lines.join("\n")}` }] };
});

// --- Write tools (only when enabled) ---

if (ENABLE_WRITES) {
  server.tool("create_issue", "Create a new Jira issue (write mode required)", {
    projectKey: z.string(), summary: z.string(), description: z.string().optional(),
    issueType: z.enum(["Task", "Story", "Bug", "Sub-task", "Epic"]).default("Task"),
    priority: z.enum(["Highest", "High", "Medium", "Low", "Lowest"]).default("Medium"),
    labels: z.array(z.string()).optional(), parentKey: z.string().optional(),
  }, async ({ projectKey, summary, description, issueType, priority, labels, parentKey }) => {
    if (!isProjectAllowed(projectKey)) return { content: [{ type: "text", text: `Access denied: project ${projectKey} not allowed.` }] };
    const body = { fields: { project: { key: projectKey }, summary, issuetype: { name: issueType }, priority: { name: priority } } };
    if (description) body.fields.description = description;
    if (labels) body.fields.labels = labels;
    if (parentKey && issueType === "Sub-task") body.fields.parent = { key: parentKey };
    const r = await jiraRequest("/issue", { method: "POST", body: JSON.stringify(body) });
    return { content: [{ type: "text", text: `Issue created: **${r.key}**\nURL: ${JIRA_BASE_URL}/browse/${r.key}` }] };
  });

  server.tool("update_issue", "Update fields on an existing Jira issue (write mode required)", {
    issueKey: z.string(), summary: z.string().optional(), description: z.string().optional(),
    labels: z.array(z.string()).optional(), priority: z.enum(["Highest", "High", "Medium", "Low", "Lowest"]).optional(),
  }, async ({ issueKey, summary, description, labels, priority }) => {
    const pk = extractPK(issueKey);
    if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
    const fields = {};
    if (summary) fields.summary = summary; if (description) fields.description = description;
    if (labels) fields.labels = labels; if (priority) fields.priority = { name: priority };
    await jiraRequest(`/issue/${encodeURIComponent(issueKey)}`, { method: "PUT", body: JSON.stringify({ fields }) });
    return { content: [{ type: "text", text: `Issue ${issueKey} updated.` }] };
  });

  server.tool("transition_issue", "Change the status of a Jira issue (write mode required)", {
    issueKey: z.string(), statusName: z.string().describe("Target status (e.g., 'In Progress', 'Done')"),
  }, async ({ issueKey, statusName }) => {
    const pk = extractPK(issueKey);
    if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
    const t = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/transitions`);
    const target = t.transitions.find((x) => x.name.toLowerCase() === statusName.toLowerCase());
    if (!target) return { content: [{ type: "text", text: `Cannot transition to "${statusName}". Available:\n${t.transitions.map((x) => `- ${x.name}`).join("\n")}` }] };
    await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/transitions`, { method: "POST", body: JSON.stringify({ transition: { id: target.id } }) });
    return { content: [{ type: "text", text: `${issueKey} transitioned to **${statusName}**.` }] };
  });

  server.tool("add_comment", "Add a comment to a Jira issue (write mode required)", {
    issueKey: z.string(), comment: z.string(),
  }, async ({ issueKey, comment }) => {
    const pk = extractPK(issueKey);
    if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
    await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/comment`, { method: "POST", body: JSON.stringify({ body: comment }) });
    return { content: [{ type: "text", text: `Comment added to ${issueKey}.` }] };
  });

  server.tool("assign_issue", "Assign a Jira issue to a user (write mode required)", {
    issueKey: z.string(), username: z.string().describe("Username, 'me', or empty to unassign"),
  }, async ({ issueKey, username }) => {
    const pk = extractPK(issueKey);
    if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
    let assignee;
    if (username === "") assignee = null;
    else if (username === "me") { const me = await jiraRequest("/myself"); assignee = me.name || me.accountId; }
    else assignee = username;
    await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/assignee`, { method: "PUT", body: JSON.stringify({ name: assignee }) });
    return { content: [{ type: "text", text: `${issueKey} assigned to ${assignee || "nobody"}.` }] };
  });

  server.tool("log_work", "Log time spent on a Jira issue (write mode required)", {
    issueKey: z.string(), timeSpent: z.string().describe("e.g., '2h', '1d', '30m'"), comment: z.string().optional(),
  }, async ({ issueKey, timeSpent, comment }) => {
    const pk = extractPK(issueKey);
    if (pk && !isProjectAllowed(pk)) return { content: [{ type: "text", text: `Access denied: project ${pk} not allowed.` }] };
    const body = { timeSpent }; if (comment) body.comment = comment;
    await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/worklog`, { method: "POST", body: JSON.stringify(body) });
    return { content: [{ type: "text", text: `Logged ${timeSpent} on ${issueKey}.` }] };
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const mode = ENABLE_WRITES ? "read-write" : "read-only";
console.error(`Jira MCP starting (${mode}, timeout ${REQUEST_TIMEOUT}ms, max ${MAX_RESULTS} results)`);
if (ALLOWED_PROJECTS.length) console.error(`Allowed projects: ${ALLOWED_PROJECTS.join(", ")}`);

const transport = new StdioServerTransport();
await server.connect(transport);
