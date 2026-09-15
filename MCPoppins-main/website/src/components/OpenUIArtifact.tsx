"use client";

import { useState } from "react";
import { Renderer } from "@openuidev/react-lang";
import { openuiLibrary } from "@openuidev/react-ui";
import { demoOpenUIResponse } from "@/lib/demoOpenUI";

export function OpenUIArtifact() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="generated-fallback">
        <strong>Approval-ready Jira update</strong>
        <p>PROJ-2481 · Add rollout owner and link decision RFC-14. No write has happened yet.</p>
        <small>Sources: #launch-ops · RFC-14 · PROJ-2481</small>
      </div>
    );
  }

  return (
    <div className="openui-artifact" data-openui-renderer="true">
      <Renderer
        response={demoOpenUIResponse}
        library={openuiLibrary}
        isStreaming={false}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
