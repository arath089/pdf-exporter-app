import path from "node:path";
import fs from "node:fs";

import express from "express";
import cors from "cors";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createCheckoutSession } from "./stripe";

import { renderPdf } from "./pdf";
import { buildMcpServer } from "./mcpApp";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/* ------------------------------------------------------------------ */
/* Basic app + config                                                  */
/* ------------------------------------------------------------------ */

const app = express();
app.set("trust proxy", true);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`
    );
  });
  next();
});
app.use(cors());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

const OUT_DIR = path.join(process.cwd(), "generated");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Freemium config (shared with REST)
const FREE_MAX_CHARS = Number(process.env.FREE_MAX_CHARS || 1500); // ~1 page
const FREE_MAX_EXPORTS = Number(process.env.FREE_MAX_EXPORTS || 3); // per day
const UPGRADE_URL = process.env.UPGRADE_URL || "/upgrade";

// In-memory usage store (good enough to start)
type Usage = { dayKey: string; count: number };
const usageByClientId = new Map<string, Usage>();

function getDayKeyUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getOrInitUsage(clientId: string) {
  const dayKey = getDayKeyUTC();
  const cur = usageByClientId.get(clientId);
  if (!cur || cur.dayKey !== dayKey) {
    const fresh = { dayKey, count: 0 };
    usageByClientId.set(clientId, fresh);
    return fresh;
  }
  return cur;
}

function getClientIdFromReq(req: express.Request) {
  // Prefer header, then body, then fallback bucket
  const headerId = req.headers["x-client-id"];
  const bodyId = (req.body && (req.body.clientId as string)) || "";
  const id =
    (typeof headerId === "string" && headerId) ||
    (Array.isArray(headerId) ? headerId[0] : "") ||
    bodyId ||
    "anon";
  return String(id);
}

/* ------------------------------------------------------------------ */
/* MCP over SSE (ChatGPT App)                                          */
/* IMPORTANT: define MCP routes BEFORE express.json()                   */
/* ------------------------------------------------------------------ */

const mcpServer = buildMcpServer();
const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/message", res);
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
    try {
      transport.close();
    } catch {}
  });

  await mcpServer.connect(transport);
});

app.post("/message", async (req, res) => {
  const sessionId = String(req.query.sessionId || "");
  const transport = transports.get(sessionId);
  if (!transport) {
    return res
      .status(400)
      .json({ error: "Unknown sessionId. Connect to /sse first.", sessionId });
  }
  await transport.handlePostMessage(req, res);
});

/* ------------------------------------------------------------------ */
/* Now enable JSON parsing for your normal REST routes                 */
/* ------------------------------------------------------------------ */

app.use(express.json({ limit: "2mb" }));

app.post("/api/checkout", createCheckoutSession);

/* ------------------------------------------------------------------ */
/* Health check                                                        */
/* ------------------------------------------------------------------ */

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* REST API (used by your website + local dev)                         */
/* ------------------------------------------------------------------ */

const CreateSchema = z.object({
  rawText: z.string().min(1, "rawText is required"),
  preset: z.enum(["report", "notes", "resume"]).default("report"),
  clientId: z.string().optional(), // allow website to send it in body
});

app.post("/api/create-pdf", async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { rawText, preset } = parsed.data;
  const clientId = getClientIdFromReq(req);

  console.log("[API] /api/create-pdf hit", {
    chars: rawText.length,
    preset,
    clientId,
  });

  // ---- Freemium: length gate
  if (rawText.length > FREE_MAX_CHARS) {
    const usage = getOrInitUsage(clientId);
    const remaining = Math.max(0, FREE_MAX_EXPORTS - usage.count);

    return res.status(402).json({
      ok: false,
      upgrade: true,
      reason: "length",
      freeMaxChars: FREE_MAX_CHARS,
      freeMaxExports: FREE_MAX_EXPORTS,
      freeExportsRemaining: remaining,
      overBy: rawText.length - FREE_MAX_CHARS,
      error: `Free exports support up to ${FREE_MAX_CHARS} characters.`,
      upgradeUrl: UPGRADE_URL,
    });
  }

  // ---- Freemium: daily export count gate
  const usage = getOrInitUsage(clientId);
  if (usage.count >= FREE_MAX_EXPORTS) {
    return res.status(402).json({
      ok: false,
      upgrade: true,
      reason: "quota",
      freeMaxChars: FREE_MAX_CHARS,
      freeMaxExports: FREE_MAX_EXPORTS,
      freeExportsRemaining: 0,
      error: `Free tier includes ${FREE_MAX_EXPORTS} exports per day.`,
      upgradeUrl: UPGRADE_URL,
    });
  }

  const id = nanoid(10);

  try {
    console.log("[API] starting renderPdf");
    const { fileName } = await Promise.race([
      renderPdf({ id, rawText, preset, outDir: OUT_DIR }),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("PDF generation timed out")), 60000)
      ),
    ]);
    console.log("[API] renderPdf done", { fileName });

    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ||
      req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
    const baseUrl = `${proto}://${host}`;
    const downloadUrl = `${baseUrl}/downloads/${fileName}`;

    usage.count += 1;
    const remaining = Math.max(0, FREE_MAX_EXPORTS - usage.count);

    res.json({
      ok: true,
      id,
      preset,
      fileName,
      downloadUrl,
      freeMaxChars: FREE_MAX_CHARS,
      freeMaxExports: FREE_MAX_EXPORTS,
      freeExportsRemaining: remaining,
      upgradeUrl: UPGRADE_URL,
    });
  } catch (err: any) {
    console.error("[API] renderPdf error", err);
    res.status(500).json({
      ok: false,
      error: err?.message || "Failed to create PDF",
      freeMaxChars: FREE_MAX_CHARS,
      freeMaxExports: FREE_MAX_EXPORTS,
      upgradeUrl: UPGRADE_URL,
    });
  }
});

/* ------------------------------------------------------------------ */
/* Serve generated PDFs                                                */
/* ------------------------------------------------------------------ */

app.get("/downloads/:file", (req, res) => {
  const safeName = path.basename(req.params.file);
  const filePath = path.join(OUT_DIR, safeName);

  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.sendFile(filePath);
});

/* ------------------------------------------------------------------ */
/* Website (serve Vite build from same server)                         */
/* ------------------------------------------------------------------ */

// Website (serve Vite build from same server)
const WEB_DIST = path.resolve(__dirname, "../../web/dist");
console.log("WEB_DIST =", WEB_DIST);

// Serve static assets (JS/CSS + index.html)
app.use(express.static(WEB_DIST));

// SPA fallback (must be LAST)
app.get("*", (req, res) => {
  // Only handle non-API routes
  if (req.path.startsWith("/api") || req.path.startsWith("/downloads")) {
    return res.status(404).end();
  }

  console.log("[SPA] serving index.html for", req.path);
  res.sendFile(path.join(WEB_DIST, "index.html"));
});

/* ------------------------------------------------------------------ */
/* Start server                                                        */
/* ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`🚀 Server running at ${PUBLIC_BASE_URL}`);
  console.log(`🧠 MCP SSE endpoint at ${PUBLIC_BASE_URL}/sse`);
});
