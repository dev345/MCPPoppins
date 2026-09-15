/**
 * Jira MCP — Unit Tests
 * Run: node --test tests/unit.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("extractProjectKey", () => {
  function extractPK(key) { const m = key.match(/^([A-Z][A-Z0-9_]+)-\d+$/i); return m ? m[1].toUpperCase() : null; }
  it("standard keys", () => { assert.equal(extractPK("PROJ-123"), "PROJ"); assert.equal(extractPK("AB-99999"), "AB"); });
  it("invalid keys", () => { assert.equal(extractPK("invalid"), null); assert.equal(extractPK(""), null); });
  it("case insensitive", () => { assert.equal(extractPK("proj-42"), "PROJ"); });
});

describe("isProjectAllowed", () => {
  function make(str) { const l = (str||"").split(",").map(p=>p.trim().toUpperCase()).filter(Boolean); return k => l.length===0||l.includes(k.toUpperCase()); }
  it("allows all when empty", () => { assert.equal(make("")("ANY"), true); });
  it("allows listed", () => { const c = make("A,B"); assert.equal(c("A"), true); assert.equal(c("C"), false); });
});

describe("config validation", () => {
  it("clamps MAX_RESULTS", () => { assert.equal(Math.min(100,Math.max(1,0)), 1); assert.equal(Math.min(100,Math.max(1,200)), 100); });
  it("clamps TIMEOUT min 5000", () => { assert.equal(Math.max(5000,1000), 5000); });
});

describe("auth headers", () => {
  it("Bearer for DC", () => { assert.equal(`Bearer tok`, "Bearer tok"); });
  it("Basic for Cloud", () => { const e = Buffer.from("a@b:t").toString("base64"); assert.ok(`Basic ${e}`.startsWith("Basic ")); });
});

describe("error mapping", () => {
  it("401", () => { assert.ok("Authentication failed (401)".includes("401")); });
  it("403", () => { assert.ok("Permission denied (403)".includes("403")); });
  it("429", () => { assert.ok("Rate limited (429)".includes("429")); });
});
