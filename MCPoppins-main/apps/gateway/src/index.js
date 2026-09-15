import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { publicAccess } from "./public-access.js";
import { createJiraTools } from "./connectors/jira.js";
import { createConfluenceTools } from "./connectors/confluence.js";

// ---------------------------------------------------------------------------
// MCP Gateway v2 — LLM-powered orchestration with keyword fallback
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
const SECRET = process.env.GATEWAY_SECRET || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const PUBLIC_ACCESS = process.env.PUBLIC_ACCESS === "true";
if (PUBLIC_ACCESS && (process.env.JIRA_PAT || process.env.CONFLUENCE_PAT) && process.env.PUBLIC_DATA_CONFIRMED !== "true") {
  throw new Error("Public connectors require PUBLIC_DATA_CONFIRMED=true and a workspace approved for public viewing.");
}
if (PUBLIC_ACCESS) {
  process.env.JIRA_ENABLE_WRITES = "false";
  process.env.CONFLUENCE_ENABLE_WRITES = "false";
}

// ---------------------------------------------------------------------------
// LLM Intent Resolution (OpenAI) — falls back to keyword matching
// ---------------------------------------------------------------------------

async function llmResolveIntent(message, conversationContext) {
  if (!OPENAI_KEY) return null; // Fall back to keyword matching

  const toolList = Object.entries(tools).map(([n, t]) => `${n}: ${t.description} (${t.mode})`).join("\n");

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: "system", content: `You are an intent router for MCPoppins, a governed MCP platform connecting Jira and Confluence.

Your job: understand the user's message and return a JSON action.

Available tools:
${toolList}

Available workflows:
- project_status: combined Jira issues + Confluence pages overview. Trigger for: project status, sprint status, standup, blockers, what's happening
- knowledge_action: search Confluence decisions then find related Jira work. Trigger for: decisions, link knowledge to action
- deep_dive: full investigation of a specific issue with related Confluence pages. Trigger for: investigate, deep dive, full analysis
- context_followup: ONLY use when the user says "tell me more", "expand on that", "more about that" — referring to something already discussed. Do NOT use for new questions.
- help: show all capabilities

CRITICAL RULES:
1. If the user mentions a Jira issue key like NAS-1237 or PROJ-123, return: {"action":"tool","tool":"jira_get_issue","params":{"issueKey":"THE_KEY"}}
2. If the user asks about critical/high-priority/urgent/important issues, return: {"action":"tool","tool":"jira_high_priority"}
3. If the user asks about their issues/tasks/tickets/work/latest issues, return: {"action":"tool","tool":"jira_my_issues"}
4. If the user asks about overdue/stale/neglected issues, return: {"action":"tool","tool":"jira_overdue"}
5. If the user asks about sprint/board, return: {"action":"tool","tool":"jira_get_sprint"}
6. If the user asks who they are, return: {"action":"tool","tool":"jira_whoami"}
7. If the user wants a cross-system overview, return: {"action":"workflow","workflow":"project_status"}
8. If the user wants to search Confluence/docs/wiki, return: {"action":"tool","tool":"confluence_search","params":{"query":"..."}}
9. If the user wants to search Jira, return: {"action":"tool","tool":"jira_search","params":{"jql":"text ~ \\"query\\" ORDER BY updated DESC"}}
10. ONLY use context_followup when the user explicitly says "tell me more", "expand", "that issue", "more about that" — NOT for new questions
11. For any new question about priority/issues/pages, use the appropriate direct tool — NEVER context_followup
12. "latest priority" or "priority issues" means jira_high_priority

Return ONLY valid JSON. No explanation.` },
          ...(conversationContext ? [{ role: "user", content: `Recent conversation:\n${conversationContext}` }] : []),
          { role: "user", content: message }
        ]
      })
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (e) {
    console.error(`[llm] Error: ${e.message}`);
    return null; // Fall back to keyword matching
  }
}

const app = express();
app.disable("x-powered-by");
if (!PUBLIC_ACCESS) app.use(cors());
app.use(express.json({ limit: "1mb" }));
if (PUBLIC_ACCESS) app.use(publicAccess(SECRET));
app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));
app.use(express.static(fileURLToPath(new URL("../../../website/out/", import.meta.url))));

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

const tools = {};
const connectorStatus = { jira: false, confluence: false };

if (process.env.JIRA_BASE_URL && process.env.JIRA_PAT) {
  const t = createJiraTools({ baseUrl: process.env.JIRA_BASE_URL, pat: process.env.JIRA_PAT, email: process.env.JIRA_EMAIL, projectKey: process.env.JIRA_PROJECT_KEY || "", enableWrites: process.env.JIRA_ENABLE_WRITES === "true", timeout: 30000, maxResults: 25 });
  Object.assign(tools, t);
  connectorStatus.jira = true;
  console.log(`[gateway] Jira: ${Object.keys(t).length} tools`);
}

if (process.env.CONFLUENCE_BASE_URL && process.env.CONFLUENCE_PAT) {
  const t = createConfluenceTools({ baseUrl: process.env.CONFLUENCE_BASE_URL, pat: process.env.CONFLUENCE_PAT, email: process.env.CONFLUENCE_EMAIL, enableWrites: process.env.CONFLUENCE_ENABLE_WRITES === "true", timeout: 30000, maxResults: 25 });
  Object.assign(tools, t);
  connectorStatus.confluence = true;
  console.log(`[gateway] Confluence: ${Object.keys(t).length} tools`);
}

// ---------------------------------------------------------------------------
// Conversation Memory (per-user, last 10 turns, 30min TTL)
// ---------------------------------------------------------------------------

const conversations = new Map();
const MEMORY_TTL = 30 * 60 * 1000;
const MAX_TURNS = 10;

function getConversation(userId) {
  const conv = conversations.get(userId);
  if (conv && Date.now() - conv.lastActive < MEMORY_TTL) return conv;
  const fresh = { turns: [], lastActive: Date.now() };
  conversations.set(userId, fresh);
  return fresh;
}

function addTurn(userId, role, content, toolsCalled = []) {
  const conv = getConversation(userId);
  conv.turns.push({ role, content, toolsCalled, timestamp: Date.now() });
  if (conv.turns.length > MAX_TURNS) conv.turns.shift();
  conv.lastActive = Date.now();
}

function getLastMentionedIssue(userId) {
  const conv = getConversation(userId);
  for (let i = conv.turns.length - 1; i >= 0; i--) {
    const match = conv.turns[i].content.match(/([A-Z][A-Z0-9]+-\d+)/);
    if (match) return match[1];
  }
  return null;
}

setInterval(() => { const now = Date.now(); for (const [k, v] of conversations) { if (now - v.lastActive > MEMORY_TTL) conversations.delete(k); } }, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------

const auditLog = [];
const MAX_AUDIT = 500;

function audit(entry) {
  const record = { ...entry, timestamp: new Date().toISOString(), id: randomUUID() };
  auditLog.unshift(record);
  if (auditLog.length > MAX_AUDIT) auditLog.pop();
  return record;
}

// ---------------------------------------------------------------------------
// Smart Intent Router
// ---------------------------------------------------------------------------

const intents = [
  { name: "my_issues", keywords: ["my issues", "my tickets", "assigned to me", "my work", "my tasks", "what am i working on", "fetch my issues", "latest issues", "fetch issues", "fetch me"], tool: "jira_my_issues", category: "jira" },
  { name: "search_issues", keywords: ["search jira", "find issues", "jql", "look for tickets", "find bugs"], tool: "jira_search", category: "jira", needsParam: true },
  { name: "get_issue", keywords: ["issue details", "tell me about", "what is", "status of", "show issue"], tool: "jira_get_issue", category: "jira", needsParam: true },
  { name: "whoami", keywords: ["who am i", "whoami", "my profile", "my identity"], tool: "jira_whoami", category: "jira" },
  { name: "jira_health", keywords: ["jira health", "jira status", "jira connection", "test jira"], tool: "jira_health_check", category: "jira" },
  { name: "comments", keywords: ["comments on", "show comments", "get comments", "what did people say"], tool: "jira_get_comments", category: "jira", needsParam: true },
  { name: "sprint", keywords: ["sprint issues", "active sprint", "current sprint", "sprint board"], tool: "jira_get_sprint", category: "jira" },
  { name: "high_priority", keywords: ["high priority", "critical issues", "highest priority", "urgent issues", "p1 issues", "critical tasks", "important issues", "critical", "priority issues", "latest priority"], tool: "jira_high_priority", category: "jira" },
  { name: "overdue", keywords: ["overdue", "stale issues", "not updated", "neglected", "stuck issues"], tool: "jira_overdue", category: "jira" },
  { name: "search_pages", keywords: ["search confluence", "find pages", "search wiki", "find docs", "search documentation"], tool: "confluence_search", category: "confluence", needsParam: true },
  { name: "get_page", keywords: ["get page", "read page", "show page", "page content"], tool: "confluence_get_page", category: "confluence", needsParam: true },
  { name: "conf_health", keywords: ["confluence health", "confluence status", "wiki health"], tool: "confluence_health_check", category: "confluence" },
  { name: "page_labels", keywords: ["labels on", "page labels", "show labels", "tagged with"], tool: "confluence_get_labels", category: "confluence", needsParam: true },
  { name: "child_pages", keywords: ["child pages", "sub pages", "children of", "pages under"], tool: "confluence_get_children", category: "confluence", needsParam: true },
  { name: "page_history", keywords: ["page history", "version history", "who edited", "page versions"], tool: "confluence_get_history", category: "confluence", needsParam: true },
  { name: "attachments", keywords: ["attachments", "files on", "uploaded files", "page files"], tool: "confluence_get_attachments", category: "confluence", needsParam: true },
  { name: "find_related", keywords: ["related pages", "confluence pages for", "docs mentioning", "pages about issue"], tool: "confluence_find_related", category: "confluence", needsParam: true },
  { name: "project_status", keywords: ["project status", "sprint status", "what's happening", "project update", "standup", "what's blocking", "blockers", "launch status"], workflow: "project_status", category: "cross" },
  { name: "knowledge_action", keywords: ["decision", "knowledge to action", "link decision", "connect jira confluence"], workflow: "knowledge_action", category: "cross" },
  { name: "deep_dive", keywords: ["deep dive", "investigate", "full analysis", "everything about"], workflow: "deep_dive", category: "cross" },
  { name: "more_details", keywords: ["tell me more", "more about that", "expand on that", "elaborate"], workflow: "context_followup", category: "context" },
  { name: "help", keywords: ["help", "what can you do", "capabilities", "commands"], workflow: "help", category: "meta" },
];

function matchIntent(message) {
  const lower = message.toLowerCase();
  const issueMatch = message.match(/([A-Z][A-Z0-9]+-\d+)/);
  if (issueMatch) return { intent: "get_issue", tool: "jira_get_issue", params: { issueKey: issueMatch[1] }, confidence: 0.95 };

  let best = null, bestScore = 0;
  for (const intent of intents) {
    let score = 0;
    for (const kw of intent.keywords) { if (lower.includes(kw)) score += kw.split(" ").length; }
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  if (best && bestScore > 0) return { intent: best.name, tool: best.tool, workflow: best.workflow, category: best.category, confidence: Math.min(bestScore / 3, 1), needsParam: best.needsParam };
  return null;
}

function extractQuery(message) {
  return message.replace(/^(search|find|look for|show me|get|what is|tell me about)\s+(jira|confluence|wiki|pages?|issues?|tickets?|docs?)\s*(for|about|on|with)?\s*/i, "").replace(/^(search|find|look for)\s*/i, "").trim() || message;
}

// ---------------------------------------------------------------------------
// Cross-System Workflows
// ---------------------------------------------------------------------------

async function runWorkflow(name, message, userId) {
  const results = { toolsCalled: [], sources: [], reply: "", suggestions: [] };

  if (name === "project_status") {
    const parts = [];
    if (tools.jira_my_issues) {
      try { const r = await tools.jira_my_issues.handler({}); results.toolsCalled.push("jira_my_issues"); results.sources.push({ system: "Jira", status: "ok" }); parts.push(`## Jira — Active Issues\n${r}`); }
      catch (e) { results.sources.push({ system: "Jira", status: "error", detail: e.message }); parts.push(`## Jira\n_${e.message}_`); }
    }
    if (tools.confluence_search) {
      try { const q = extractQuery(message) || "sprint status"; const r = await tools.confluence_search.handler({ query: q }); results.toolsCalled.push("confluence_search"); results.sources.push({ system: "Confluence", status: "ok" }); parts.push(`## Confluence — Related Docs\n${r}`); }
      catch (e) { results.sources.push({ system: "Confluence", status: "error", detail: e.message }); parts.push(`## Confluence\n_${e.message}_`); }
    }
    results.reply = `# Project Status\n\n${parts.join("\n\n")}\n\n---\n_Sources: ${results.sources.filter(s => s.status === "ok").map(s => s.system).join(", ")}_`;
    results.suggestions = ["Show my overdue issues", "Search Confluence for deployment", "Get details on a specific issue"];
  }
  else if (name === "knowledge_action") {
    const q = extractQuery(message) || "decision";
    const parts = [];
    if (tools.confluence_search) { try { const r = await tools.confluence_search.handler({ query: q }); results.toolsCalled.push("confluence_search"); results.sources.push({ system: "Confluence", status: "ok" }); parts.push(`## Decision Sources\n${r}`); } catch (e) { parts.push(`## Confluence\n_${e.message}_`); } }
    if (tools.jira_search) { try { const r = await tools.jira_search.handler({ jql: `text ~ "${q}" ORDER BY updated DESC` }); results.toolsCalled.push("jira_search"); results.sources.push({ system: "Jira", status: "ok" }); parts.push(`## Related Jira Work\n${r}`); } catch (e) { parts.push(`## Jira\n_${e.message}_`); } }
    results.reply = `# Knowledge to Action\n\n${parts.join("\n\n")}\n\n---\n_Cross-system: Confluence decisions + Jira delivery_`;
    results.suggestions = ["Get details on a specific issue", "Search another decision", "Project status"];
  }
  else if (name === "deep_dive") {
    // Deep investigation: issue details + related Confluence pages + comments + high-priority context
    const issueKey = getLastMentionedIssue(userId) || extractQuery(message).match(/([A-Z][A-Z0-9]+-\d+)/)?.[1];
    const parts = [];

    if (issueKey && tools.jira_get_issue) {
      try { const r = await tools.jira_get_issue.handler({ issueKey }); results.toolsCalled.push("jira_get_issue"); results.sources.push({ system: "Jira", type: "issue", status: "ok" }); parts.push(`## Issue: ${issueKey}\n${r}`); }
      catch (e) { parts.push(`## Issue\n_${e.message}_`); }
    }

    if (issueKey && tools.confluence_find_related) {
      try { const r = await tools.confluence_find_related.handler({ issueKey }); results.toolsCalled.push("confluence_find_related"); results.sources.push({ system: "Confluence", type: "related-pages", status: "ok" }); parts.push(`## Related Documentation\n${r}`); }
      catch (e) { parts.push(`## Confluence\n_${e.message}_`); }
    }

    if (!issueKey && tools.jira_high_priority) {
      try { const r = await tools.jira_high_priority.handler({}); results.toolsCalled.push("jira_high_priority"); results.sources.push({ system: "Jira", type: "high-priority", status: "ok" }); parts.push(`## High Priority Issues\n${r}`); }
      catch (e) { parts.push(`## High Priority\n_${e.message}_`); }
    }

    if (!issueKey && tools.confluence_search) {
      try { const q = extractQuery(message) || "architecture design"; const r = await tools.confluence_search.handler({ query: q }); results.toolsCalled.push("confluence_search"); results.sources.push({ system: "Confluence", type: "search", status: "ok" }); parts.push(`## Related Pages\n${r}`); }
      catch (e) { parts.push(`## Confluence\n_${e.message}_`); }
    }

    results.reply = `# Deep Dive${issueKey ? `: ${issueKey}` : ""}\n\n${parts.join("\n\n")}\n\n---\n_${results.sources.filter(s => s.status === "ok").length} sources queried across ${[...new Set(results.sources.map(s => s.system))].join(" + ")}_`;
    results.suggestions = issueKey ? ["Show my issues", "Project status", `Search Confluence for ${issueKey}`] : ["Show my issues", "Project status", "Search Confluence"];
  }

  else if (name === "context_followup") {
    const lastIssue = getLastMentionedIssue(userId);
    if (lastIssue && tools.jira_get_issue) { results.reply = await tools.jira_get_issue.handler({ issueKey: lastIssue }); results.toolsCalled.push("jira_get_issue"); results.suggestions = [`Search Confluence for ${lastIssue}`, "My issues", "Project status"]; }
    else { results.reply = "I don't have enough context. Try asking about a specific issue or searching."; results.suggestions = ["Show my issues", "Search Confluence", "Project status"]; }
  }
  else if (name === "help") {
    const tl = Object.entries(tools).map(([n, t]) => `- **${n}**: ${t.description}`).join("\n");
    results.reply = `# MCPoppins Gateway\n\n## Commands\n- "Show my issues"\n- "Project status" — Jira + Confluence combined\n- "Search Confluence for [topic]"\n- "PROJ-123" — issue details\n- "What's blocking?"\n- "Tell me more" — uses conversation history\n\n## Tools\n${tl}\n\n## Workflows\n- project_status — chains Jira + Confluence\n- knowledge_action — links decisions to work\n- context_followup — conversation memory`;
    results.suggestions = ["Show my issues", "Project status", "Search Confluence for architecture"];
  }
  return results;
}

function suggestActions(toolsCalled, reply) {
  const s = [];
  if (toolsCalled.includes("jira_my_issues")) { const m = reply.match(/([A-Z][A-Z0-9]+-\d+)/); if (m) s.push(`Details on ${m[1]}`); s.push("Project status", "Search Confluence"); }
  else if (toolsCalled.includes("jira_get_issue")) s.push("Search Confluence for this topic", "My issues", "Project status");
  else if (toolsCalled.includes("confluence_search")) s.push("Related Jira work", "My issues");
  return s;
}

// ---------------------------------------------------------------------------
// Proactive Insights — appended to relevant responses
// ---------------------------------------------------------------------------

async function getProactiveInsights() {
  const insights = [];
  if (tools.jira_high_priority) {
    try { const r = await tools.jira_high_priority.handler({}); const c = (r.match(/\n/g) || []).length; if (c > 0) insights.push(`${c} high-priority issue${c > 1 ? "s" : ""} open.`); } catch {}
  }
  if (tools.jira_overdue) {
    try { const r = await tools.jira_overdue.handler({}); if (!r.includes("No overdue")) { const c = (r.match(/\n/g) || []).length; if (c > 0) insights.push(`${c} issue${c > 1 ? "s" : ""} not updated in 14+ days.`); } } catch {}
  }
  return insights;
}

// ---------------------------------------------------------------------------
// Action Preview / Approval Flow
// ---------------------------------------------------------------------------

const pendingApprovals = new Map();
const APPROVAL_TTL = 5 * 60 * 1000;

function createApproval(userId, action, params, preview) {
  const id = randomUUID().slice(0, 8);
  pendingApprovals.set(id, { action, params, preview, userId, createdAt: Date.now() });
  return id;
}

setInterval(() => { const now = Date.now(); for (const [k, v] of pendingApprovals) { if (now - v.createdAt > APPROVAL_TTL) pendingApprovals.delete(k); } }, 60000);

// ---------------------------------------------------------------------------
// Channel-Aware Formatting
// ---------------------------------------------------------------------------

function formatForChannel(reply, suggestions, channel) {
  if (channel === "teams") {
    let f = reply.replace(/^# (.+)$/gm, "**$1**").replace(/^## (.+)$/gm, "\n**$1**");
    if (suggestions?.length) f += `\n\n---\n**Suggested:** ${suggestions.join(" | ")}`;
    return f;
  }
  if (channel === "slack") {
    let f = reply.replace(/^# (.+)$/gm, "*$1*").replace(/^## (.+)$/gm, "\n*$1*").replace(/\*\*(.+?)\*\*/g, "*$1*");
    if (suggestions?.length) f += `\n\n_Try: ${suggestions.join(" | ")}_`;
    return f;
  }
  return reply;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function authMw(req, res, next) {
  if (PUBLIC_ACCESS && ((req.method === "POST" && req.path === "/chat") || (req.method === "GET" && req.path === "/tools"))) return next();
  if (!SECRET && !PUBLIC_ACCESS) return next();
  if (!SECRET || req.headers.authorization !== `Bearer ${SECRET}`) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_, res) => res.json({ status: "ok", version: "2.0.0", tools: Object.keys(tools).length, connectors: connectorStatus, memory: { active: conversations.size }, audit: { events: auditLog.length } }));

app.get("/tools", authMw, (_, res) => res.json({ tools: Object.entries(tools).map(([n, t]) => ({ name: n, description: t.description, connector: t.connector, mode: t.mode })), total: Object.keys(tools).length, workflows: ["project_status", "knowledge_action", "context_followup", "help"] }));

app.post("/tools/:name", authMw, async (req, res) => {
  const id = randomUUID(), t = tools[req.params.name], start = Date.now();
  if (!t) return res.status(404).json({ error: "Tool not found", id });
  try { const r = await t.handler(req.body || {}); audit({ type: "tool_call", tool: req.params.name, success: true, ms: Date.now() - start, id }); res.json({ result: r, id, tool: req.params.name, ms: Date.now() - start }); }
  catch (e) { audit({ type: "tool_call", tool: req.params.name, success: false, error: e.message, ms: Date.now() - start, id }); res.status(500).json({ error: e.message, id }); }
});

app.post("/chat", authMw, async (req, res) => {
  const { message, channel, userId } = req.body, id = randomUUID(), uid = userId || `anon-${channel || "api"}`, start = Date.now();
  if (typeof message !== "string" || !message.trim() || message.length > 4000) return res.status(400).json({ error: "Enter a message between 1 and 4000 characters.", id });
  if (!connectorStatus.jira && !connectorStatus.confluence && !/^(help|hello|hi)\b/i.test(message.trim())) {
    return res.json({ id, reply: "The gateway is running, but Jira and Confluence are not connected yet. You can explore the website and interactive demo while the owner connects a workspace approved for public viewing.", toolsCalled: [], sources: [], suggestions: ["Help"], ms: Date.now() - start });
  }
  addTurn(uid, "user", message);
  const r = { id, channel: channel || "api", userId: uid, message, toolsCalled: [], sources: [], reply: "", suggestions: [], ms: 0, intent: null };
  try {
    const matched = matchIntent(message);

    // Try LLM first, fall back to keyword matching
    let llmResult = null;
    if (OPENAI_KEY) {
      const ctx = getConversation(uid).turns.slice(-4).map(t => `${t.role}: ${t.content.slice(0, 200)}`).join("\n");
      llmResult = await llmResolveIntent(message, ctx);
    }

    if (llmResult) {
      r.intent = llmResult.action === "workflow" ? llmResult.workflow : (llmResult.tool || "llm");
      if (llmResult.action === "workflow" && llmResult.workflow) {
        const w = await runWorkflow(llmResult.workflow, message, uid);
        Object.assign(r, { reply: w.reply, toolsCalled: w.toolsCalled, sources: w.sources, suggestions: w.suggestions });
      } else if (llmResult.action === "tool" && llmResult.tool && tools[llmResult.tool]) {
        r.reply = await tools[llmResult.tool].handler(llmResult.params || {});
        r.toolsCalled.push(llmResult.tool);
        r.sources.push({ system: tools[llmResult.tool].connector, status: "ok" });
        r.suggestions = suggestActions(r.toolsCalled, r.reply);
      } else { llmResult = null; }
    }

    if (!llmResult) {
      r.intent = matched ? matched.intent : "unrecognized";
      if (matched?.workflow) { const w = await runWorkflow(matched.workflow, message, uid); Object.assign(r, { reply: w.reply, toolsCalled: w.toolsCalled, sources: w.sources, suggestions: w.suggestions }); }
      else if (matched?.tool && tools[matched.tool]) {
        const p = {}; if (matched.params) Object.assign(p, matched.params);
        else if (matched.needsParam) { const q = extractQuery(message); if (matched.tool === "jira_search") p.jql = `text ~ "${q}" ORDER BY updated DESC`; else if (matched.tool === "jira_get_issue") p.issueKey = q; else if (matched.tool === "confluence_search") p.query = q; else if (matched.tool === "confluence_get_page") p.pageId = q; }
        r.reply = await tools[matched.tool].handler(p); r.toolsCalled.push(matched.tool); r.sources.push({ system: tools[matched.tool].connector, status: "ok" }); r.suggestions = suggestActions(r.toolsCalled, r.reply);
      } else { r.reply = `Try: "show my issues", "project status", "search confluence for [topic]", "PROJ-123", "help"`; r.suggestions = ["Show my issues", "Project status", "Help"]; }
    }
    addTurn(uid, "assistant", r.reply, r.toolsCalled);
    r.ms = Date.now() - start; audit({ type: "chat", intent: r.intent, tools: r.toolsCalled, channel: r.channel, uid, success: true, ms: r.ms, id }); res.json(r);
  } catch (e) { r.error = e.message; r.ms = Date.now() - start; audit({ type: "chat", intent: r.intent, uid, success: false, error: e.message, ms: r.ms, id }); res.status(500).json(r); }
});

app.get("/audit", authMw, (req, res) => { const l = Math.min(Number(req.query.limit) || 50, MAX_AUDIT), t = req.query.type; let f = auditLog; if (t) f = f.filter(e => e.type === t); res.json({ events: f.slice(0, l), total: f.length }); });
app.get("/conversation/:userId", authMw, (req, res) => { const c = conversations.get(req.params.userId); if (!c) return res.json({ turns: [] }); res.json({ turns: c.turns, lastActive: new Date(c.lastActive).toISOString() }); });

app.get("/approvals", authMw, (_, res) => {
  const active = []; for (const [id, a] of pendingApprovals) { if (Date.now() - a.createdAt < APPROVAL_TTL) active.push({ id, ...a }); }
  res.json({ approvals: active, total: active.length });
});
app.post("/approvals/:id/confirm", authMw, async (req, res) => {
  const a = pendingApprovals.get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found or expired." });
  if (Date.now() - a.createdAt > APPROVAL_TTL) { pendingApprovals.delete(req.params.id); return res.status(410).json({ error: "Expired." }); }
  try { const t = tools[a.action]; if (!t) return res.status(404).json({ error: "Tool gone." }); const r = await t.handler(a.params); pendingApprovals.delete(req.params.id); audit({ type: "approval_confirmed", id: req.params.id, action: a.action, userId: a.userId, success: true }); res.json({ result: r, approvalId: req.params.id, status: "confirmed" }); }
  catch (e) { audit({ type: "approval_confirmed", id: req.params.id, action: a.action, success: false, error: e.message }); res.status(500).json({ error: e.message }); }
});
app.post("/approvals/:id/reject", authMw, (req, res) => {
  const a = pendingApprovals.get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found." });
  pendingApprovals.delete(req.params.id); audit({ type: "approval_rejected", id: req.params.id, action: a.action, userId: a.userId });
  res.json({ status: "rejected", approvalId: req.params.id });
});

app.post("/webhooks/teams", async (req, res) => {
  const text = req.body?.text?.replace(/<[^>]*>/g, "").trim() || "";
  if (!text) return res.json({ type: "message", text: "Try: 'show my issues' or 'project status'" });
  try { const cr = await fetch(`http://localhost:${PORT}/chat`, { method: "POST", headers: { "Content-Type": "application/json", ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}) }, body: JSON.stringify({ message: text, channel: "teams", userId: req.body?.from?.id || "teams-user" }) }); const d = await cr.json(); res.json({ type: "message", text: formatForChannel(d.reply || d.error || "No response.", d.suggestions, "teams") }); }
  catch (e) { res.json({ type: "message", text: `Error: ${e.message}` }); }
});

app.post("/webhooks/slack", async (req, res) => {
  if (req.body.type === "url_verification") return res.json({ challenge: req.body.challenge });
  const ev = req.body.event; if (!ev || ev.type !== "message" || ev.bot_id) return res.sendStatus(200);
  try { const cr = await fetch(`http://localhost:${PORT}/chat`, { method: "POST", headers: { "Content-Type": "application/json", ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}) }, body: JSON.stringify({ message: ev.text, channel: "slack", userId: ev.user || "slack-user" }) }); const d = await cr.json(); if (process.env.SLACK_BOT_TOKEN && d.reply) { await fetch("https://slack.com/api/chat.postMessage", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }, body: JSON.stringify({ channel: ev.channel, text: formatForChannel(d.reply, d.suggestions, "slack") }) }); } }
  catch (e) { console.error(`[slack] ${e.message}`); }
  res.sendStatus(200);
});

app.listen(PORT, () => { console.log(`\n=== MCP Gateway v2 ===\nhttp://localhost:${PORT}\nTools: ${Object.keys(tools).length}\nWorkflows: project_status, knowledge_action, context_followup, help\nFeatures: intent routing, memory, audit, cross-system workflows, suggestions\nEndpoints: /health /tools /chat /audit /conversation/:userId /webhooks/teams /webhooks/slack\n`); });
