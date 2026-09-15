"use client";

import { useState } from "react";
import type { ConnectorPackage } from "@/data/catalog";
import { CopyButton } from "./CopyButton";

export function InstallTabs({ methods }: { methods: ConnectorPackage["install"] }) {
  const [active, setActive] = useState(0);
  const current = methods[active];
  return (
    <div className="install-console">
      <div className="install-tabs">{methods.map((item, index) => <button type="button" key={item.label} onClick={() => setActive(index)} className={active === index ? "active" : ""}>{item.label}</button>)}</div>
      <div className="code-line"><code>{current.command}</code><CopyButton text={current.command} /></div>
      <p>Use placeholder credentials only in copied examples. Secrets belong in environment variables.</p>
    </div>
  );
}
