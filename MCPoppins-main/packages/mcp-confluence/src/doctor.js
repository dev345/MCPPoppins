#!/usr/bin/env node
const BASE = process.env.CONFLUENCE_BASE_URL;
const PAT = process.env.CONFLUENCE_PAT;
const EMAIL = process.env.CONFLUENCE_EMAIL;
function auth() { if (EMAIL) return `Basic ${Buffer.from(`${EMAIL}:${PAT}`).toString("base64")}`; return `Bearer ${PAT}`; }
async function main() {
  console.log("\n=== Confluence MCP Doctor ===\n");
  let ok = true;
  if (!BASE) { console.log("  [FAIL] CONFLUENCE_BASE_URL not set"); ok = false; } else console.log(`  [OK] URL = ${BASE}`);
  if (!PAT) { console.log("  [FAIL] CONFLUENCE_PAT not set"); ok = false; } else console.log("  [OK] PAT set");
  if (!ok) { process.exit(1); }
  console.log("\nTesting...");
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(`${BASE}/rest/api/space?limit=1`, { signal: c.signal, headers: { Authorization: auth(), Accept: "application/json" } });
    clearTimeout(t);
    if (r.ok) console.log("  [OK] Connected."); else { console.log(`  [FAIL] HTTP ${r.status}`); ok = false; }
  } catch (e) { console.log(`  [FAIL] ${e.message}`); ok = false; }
  console.log(ok ? "\nReady." : "\nFailed."); process.exit(ok ? 0 : 1);
}
main();
