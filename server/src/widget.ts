import fs from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function webDistPath(...parts: string[]) {
  return path.join(process.cwd(), "web", "dist", ...parts);
}

function readManifest() {
  const manifestPath = webDistPath(".vite", "manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function readAsset(relPath: string) {
  const p = webDistPath(relPath);
  return fs.readFileSync(p, "utf8");
}

export function registerPdfWidget(server: McpServer) {
  const manifest = readManifest();

  const entry = Object.values<any>(manifest).find((v) => v.isEntry);
  if (!entry) {
    throw new Error(
      "Vite manifest has no entry. Ensure build.manifest=true and web is built."
    );
  }

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
          "openai/widgetPrefersBorder": true,
        },
      },
    ],
  }));

  return templateUri;
}
