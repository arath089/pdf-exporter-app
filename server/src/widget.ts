import fs from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function resolveWebDist(): string {
  // 1) Production/Docker layout: /app/web/dist
  const dockerStyle = path.join(process.cwd(), "web", "dist");

  // 2) Local monorepo layout when running from /server: ../web/dist
  const localStyle = path.join(process.cwd(), "..", "web", "dist");

  if (fs.existsSync(path.join(dockerStyle, ".vite", "manifest.json")))
    return dockerStyle;
  if (fs.existsSync(path.join(localStyle, ".vite", "manifest.json")))
    return localStyle;

  // Helpful error message
  throw new Error(
    `Could not find Vite manifest.json.\n` +
      `Tried:\n` +
      `- ${path.join(dockerStyle, ".vite", "manifest.json")}\n` +
      `- ${path.join(localStyle, ".vite", "manifest.json")}\n` +
      `Make sure you ran: cd web && npm run build`
  );
}

const WEB_DIST = resolveWebDist();

function readManifest() {
  const manifestPath = path.join(WEB_DIST, ".vite", "manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function readAsset(relPath: string) {
  const p = path.join(WEB_DIST, relPath);
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
