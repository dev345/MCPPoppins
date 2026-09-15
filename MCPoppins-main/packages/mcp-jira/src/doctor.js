#!/usr/bin/env node
/**
 * Jira MCP Doctor — connection diagnostic
 * Usage: JIRA_BASE_URL=... JIRA_PAT=... node src/doctor.js
 */

const BASE = process.env.JIRA_BASE_URL;
const PAT = process.env.JIRA_PAT;
const EMAIL = process.env.JIRA_EMAIL;
const PROJECTS = (process.env.JIRA_ALLOWED_PROJECTS || "").split(",").map(p => p.trim()).filter(Boolean);

function auth() {
  if (EMAIL) return `Basic ${Buffer.from(`${EMAIL}:${PAT}`).toString("base64")}`;
  return `Bearer ${PAT}`;
}

async function main() {
  console.log("\n=== Jira MCP Doctor ===\n");
  let ok = true;

  if (!BASE) { console.log("  [FAIL] JIRA_BASE_URL not set"); ok = false; }
  else console.log(`  [OK] JIRA_BASE_URL = ${BASE}`);

  if (!PAT) { console.log("  [FAIL] JIRA_PAT not set"); ok = false; }
  else console.log("  [OK] JIRA_PAT is set");

  if (!ok) { console.log("\nFix config errors above."); process.exit(1); }

  console.log("\nTesting connection...");
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(`${BASE}/rest/api/2/myself`, { signal: c.signal, headers: { Authorization: auth(), Accept: "application/json" } });
    clearTimeout(t);
    if (r.ok) { const me = await r.json(); console.log(`  [OK] Authenticated as: ${me.displayName}`); }
    else { console.log(`  [FAIL] HTTP ${r.status}`); ok = false; }
  } catch (e) { console.log(`  [FAIL] ${e.message}`); ok = false; }

  if (PROJECTS.length && ok) {
    console.log("\nChecking projects...");
    for (const p of PROJECTS) {
      try {
        const r = await fetch(`${BASE}/rest/api/2/project/${p}`, { headers: { Authorization: auth(), Accept: "application/json" } });
        console.log(r.ok ? `  [OK] ${p}` : `  [FAIL] ${p} — HTTP ${r.status}`);
        if (!r.ok) ok = false;
      } catch (e) { console.log(`  [FAIL] ${p} — ${e.message}`); ok = false; }
    }
  }

  console.log(ok ? "\nAll checks passed." : "\nSome checks failed.");
  process.exit(ok ? 0 : 1);
}
main();
