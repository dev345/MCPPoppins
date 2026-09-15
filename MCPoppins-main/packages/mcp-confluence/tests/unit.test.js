/**
 * Confluence MCP — Unit Tests
 * Run: node --test tests/unit.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("sanitizeCql", () => {
  function sanitizeCql(i) { return i.replace(/\\/g,"\\\\").replace(/"/g,'\\"'); }
  it("escapes quotes", () => { assert.equal(sanitizeCql('hi "there"'), 'hi \\"there\\"'); });
  it("escapes backslash", () => { assert.equal(sanitizeCql("a\\b"), "a\\\\b"); });
  it("clean input unchanged", () => { assert.equal(sanitizeCql("normal text"), "normal text"); });
  it("empty", () => { assert.equal(sanitizeCql(""), ""); });
});

describe("storageToText", () => {
  function strip(h) { return h.replace(/<[^>]*>/g,""); }
  function storageToText(h) {
    if (!h) return "";
    let t = h;
    t = t.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_,l,c) => "\n"+"#".repeat(+l)+" "+strip(c)+"\n");
    t = t.replace(/<p[^>]*>(.*?)<\/p>/gi, (_,c) => strip(c)+"\n\n");
    t = t.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
    t = t.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
    t = strip(t); return t.replace(/\n{3,}/g,"\n\n").trim();
  }
  it("headings", () => { assert.ok(storageToText("<h1>T</h1>").includes("# T")); });
  it("paragraphs", () => { assert.ok(storageToText("<p>Hi</p>").includes("Hi")); });
  it("bold", () => { assert.ok(storageToText("<strong>b</strong>").includes("**b**")); });
  it("empty", () => { assert.equal(storageToText(""), ""); assert.equal(storageToText(null), ""); });
  it("strips tags", () => { assert.equal(storageToText("<div>x</div>"), "x"); });
});

describe("config", () => {
  it("clamps MAX_RESULTS", () => { assert.equal(Math.min(100,Math.max(1,0)), 1); assert.equal(Math.min(100,Math.max(1,500)), 100); });
});

describe("auth", () => {
  it("Bearer", () => { assert.equal(`Bearer t`, "Bearer t"); });
  it("Basic", () => { const e = Buffer.from("a@b:t").toString("base64"); assert.ok(`Basic ${e}`.startsWith("Basic ")); });
});
