import { readFileSync } from "node:fs";
import path from "node:path";

export function readRepositoryFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), "..", relativePath), "utf8");
}

export function readPackageFile(slug: string, filename: string) {
  return readRepositoryFile(path.join("packages", `mcp-${slug}`, filename));
}

export function firstCodeBlockAfter(markdown: string, heading: string) {
  const start = markdown.indexOf(heading);
  const source = start >= 0 ? markdown.slice(start) : markdown;
  return source.match(/```(?:bash|json)?\n([\s\S]*?)```/)?.[1].trim() ?? "";
}
