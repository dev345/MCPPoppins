"use client";

import { useState } from "react";
import { OpenUIArtifact } from "./OpenUIArtifact";

const connectors = [
  {
    id: "jira",
    label: "Jira",
    mark: "JI",
    color: "#2457ff",
    eyebrow: "Work item",
    title: "PROJ-2481",
    detail: "Staged rollout is ready, but the owner is still unassigned.",
    factLabel: "Safe next step",
    fact: "Draft owner update"
  },
  {
    id: "confluence",
    label: "Confluence",
    mark: "CO",
    color: "#6d4aff",
    eyebrow: "Decision source",
    title: "RFC-14",
    detail: "The approved decision requires an owner before rollout begins.",
    factLabel: "Evidence",
    fact: "Versioned page cited"
  }
];

export function AgentDemo() {
  const [connector, setConnector] = useState(connectors[0]);
  const [approved, setApproved] = useState(false);

  return (
    <div className="agent-demo">
      <div className="demo-topbar">
        <div><span className="live-dot" /> Working connector proof</div>
        <span>Interactive prototype</span>
      </div>
      <div className="connector-tabs" role="tablist" aria-label="Working connectors">
        {connectors.map((item) => (
          <button key={item.id} className={connector.id === item.id ? "active" : ""} onClick={() => { setConnector(item); setApproved(false); }} role="tab" aria-selected={connector.id === item.id}>
            <span style={{ background: item.color }}>{item.mark}</span><div><small>Available now</small>{item.label}</div>
          </button>
        ))}
      </div>
      <div className="proof-surface">
        <div className="proof-context">
          <span style={{ background: connector.color }}>{connector.mark}</span>
          <div><small>{connector.eyebrow}</small><strong>{connector.title}</strong></div>
          <b className="proof-status">Connected</b>
        </div>
        <div className="proof-card">
          <p>{connector.detail}</p>
          <div><span>{connector.factLabel}</span><strong>{connector.fact}</strong></div>
        </div>
        <div className="proof-bridge" aria-label="Cross-tool evidence flow">
          <span>Jira issue</span><i>+</i><span>Confluence decision</span><b>→ MCPoppins</b>
        </div>
        <div className="agent-content">
          <div className="generated-label"><span className="avatar avatar-agent">MP</span><div><strong>Governed result</strong><small>Drafted from both connected tools</small></div></div>
          <OpenUIArtifact />
          <div className="evidence-row"><span>Jira live</span><span>Confluence cited</span><span>R2 approval</span></div>
          <div className="approval-actions">
            <button className="button button-accent" onClick={() => setApproved(true)} disabled={approved}>{approved ? "Approved in demo" : "Approve Jira update"}</button>
            <button className="button button-ghost" onClick={() => setApproved(false)}>Edit draft</button>
          </div>
          {approved && <div className="demo-receipt"><strong>Simulated receipt created</strong><span>No external system was changed in this prototype.</span></div>}
        </div>
        <div className="target-workspaces">
          <span className="teams-mark">TM</span>
          <div><small>Target workspaces</small><strong>Run this governed flow in Teams and your IDE</strong></div>
          <b>Same policy →</b>
        </div>
      </div>
      <div className="demo-footer"><span>Jira + Confluence context.</span><strong>Delivered safely to Teams and IDEs.</strong></div>
    </div>
  );
}
