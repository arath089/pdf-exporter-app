import fs from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function readManifest() {
  const manifestPath = path.join(
    process.cwd(),
    "..",
    "web",
    "dist",
    ".vite",
    "manifest.json"
  );
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function readAsset(relPath: string) {
  const p = path.join(process.cwd(), "..", "web", "dist", relPath);
  return fs.readFileSync(p, "utf8");
}

export function registerPdfWidget(server: McpServer) {
  const manifest = readManifest();

  // Vite vanilla template entry is usually index.html → src/main.js
  // In manifest, look for the entry with isEntry: true
  const entry = Object.values<any>(manifest).find((v) => v.isEntry);
  if (!entry)
    throw new Error(
      "Vite manifest has no entry. Ensure build.manifest=true and web is built."
    );

  const js = readAsset(entry.file);
  const css = (entry.css ?? []).map((c: string) => readAsset(c)).join("\n");

  const templateUri = "ui://widget/pdf-editor.html";

  server.registerResource("pdf-editor-widget", templateUri, {}, async () => ({
    contents: [
      {
        uri: templateUri,
        mimeType: "text/html+skybridge",
        text: `
<div id="app"></div>
<style>${css}</style>
<script type="module">${js}</script>
          `.trim(),
        _meta: {
          // Optional but nice:
          "openai/widgetPrefersBorder": true,
        },
      },
    ],
  }));

  return templateUri;
}
