import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderPdf } from "./pdf";
import { registerPdfWidget } from "./widget";

const OUT_DIR = path.join(process.cwd(), "generated");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Freemium config
const FREE_MAX_CHARS = Number(process.env.FREE_MAX_CHARS || 1500); // ~1 page
const FREE_MAX_EXPORTS = Number(process.env.FREE_MAX_EXPORTS || 3); // per day
const UPGRADE_URL = process.env.UPGRADE_URL || "/upgrade";

// In-memory usage store (good enough to start; later move to Redis/DB)
type Usage = { dayKey: string; count: number };
const usageByClientId = new Map<string, Usage>();

function getDayKeyUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // daily reset
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

const OpenEditorInput = z.object({
  seedText: z.string().optional(),
  preset: z.enum(["report", "notes", "resume"]).optional(),
  clientId: z.string().optional(), // optional; widget will send it later
});

const CreatePdfInput = z.object({
  rawText: z.string().min(1),
  preset: z.enum(["report", "notes", "resume"]).optional(),
  clientId: z.string().optional(),
});

export function buildMcpServer() {
  const mcp = new McpServer({ name: "PDF Exporter", version: "0.1.0" });
  const templateUri = registerPdfWidget(mcp);

  mcp.registerTool(
    "open_editor",
    {
      description:
        "Open the PDF editor UI. Use when user invokes PDF Exporter without text, or wants to paste/edit before exporting.",
      inputSchema: OpenEditorInput as any,
      _meta: {
        "openai/outputTemplate": templateUri,
        "openai/widgetAccessible": true,
      },
    },
    async (args: unknown) => {
      const parsed = OpenEditorInput.safeParse(args ?? {});
      const seedText = parsed.success ? parsed.data.seedText ?? "" : "";
      const preset = parsed.success ? parsed.data.preset ?? "report" : "report";

      // clientId may not exist yet; the widget will create one on first load
      const clientId = parsed.success ? parsed.data.clientId : undefined;

      let remaining = FREE_MAX_EXPORTS;
      if (clientId) {
        const usage = getOrInitUsage(clientId);
        remaining = Math.max(0, FREE_MAX_EXPORTS - usage.count);
      }

      return {
        content: [{ type: "text" as const, text: "Editor opened." }],
        structuredContent: {
          seedText,
          preset,
          freeMaxChars: FREE_MAX_CHARS,
          freeMaxExports: FREE_MAX_EXPORTS,
          freeExportsRemaining: remaining,
          upgradeUrl: UPGRADE_URL,
        },
      };
    }
  );

  mcp.registerTool(
    "create_pdf",
    {
      description:
        "Generate a PDF from text and return a download URL. Free tier is limited by length and daily export count.",
      inputSchema: CreatePdfInput as any,
      _meta: {
        "openai/outputTemplate": templateUri,
        "openai/widgetAccessible": true,
      },
    },
    async (args: unknown) => {
      const parsed = CreatePdfInput.safeParse(args);
      if (!parsed.success) {
        return {
          content: [{ type: "text" as const, text: "Invalid input." }],
          structuredContent: {
            ok: false,
            error: parsed.error.flatten(),
            freeMaxChars: FREE_MAX_CHARS,
            freeMaxExports: FREE_MAX_EXPORTS,
            upgradeUrl: UPGRADE_URL,
          },
        };
      }

      const rawText = parsed.data.rawText;
      const preset = parsed.data.preset ?? "report";
      const clientId = parsed.data.clientId || "anon"; // if missing, treat as one bucket

      // ---- Freemium: length gate
      if (rawText.length > FREE_MAX_CHARS) {
        const usage = getOrInitUsage(clientId);
        const remaining = Math.max(0, FREE_MAX_EXPORTS - usage.count);

        return {
          content: [
            { type: "text" as const, text: "Upgrade required (length limit)." },
          ],
          structuredContent: {
            ok: false,
            upgrade: true,
            reason: "length",
            freeMaxChars: FREE_MAX_CHARS,
            freeMaxExports: FREE_MAX_EXPORTS,
            freeExportsRemaining: remaining,
            overBy: rawText.length - FREE_MAX_CHARS,
            error: `Free exports support up to ${FREE_MAX_CHARS} characters.`,
            upgradeUrl: UPGRADE_URL,
            preset,
            rawText,
          },
        };
      }

      // ---- Freemium: daily export count gate
      const usage = getOrInitUsage(clientId);
      if (usage.count >= FREE_MAX_EXPORTS) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Upgrade required (daily export limit).",
            },
          ],
          structuredContent: {
            ok: false,
            upgrade: true,
            reason: "quota",
            freeMaxChars: FREE_MAX_CHARS,
            freeMaxExports: FREE_MAX_EXPORTS,
            freeExportsRemaining: 0,
            error: `Free tier includes ${FREE_MAX_EXPORTS} exports per day.`,
            upgradeUrl: UPGRADE_URL,
            preset,
            rawText,
          },
        };
      }

      // If we reach here, this export is allowed
      try {
        const id = nanoid(10);
        const { fileName } = await renderPdf({
          id,
          rawText,
          preset,
          outDir: OUT_DIR,
        });

        const publicBaseUrl =
          process.env.PUBLIC_BASE_URL ||
          `http://localhost:${process.env.PORT || 3000}`;

        const baseUrl =
          process.env.APP_ORIGIN ||
          (process.env.UPGRADE_URL
            ? new URL(process.env.UPGRADE_URL).origin
            : "") ||
          process.env.PUBLIC_BASE_URL ||
          "https://pdf-exporter.com";

        const downloadUrl = `${baseUrl}/downloads/${fileName}`;

        usage.count += 1;
        const remaining = Math.max(0, FREE_MAX_EXPORTS - usage.count);

        return {
          content: [{ type: "text" as const, text: "PDF ready." }],
          structuredContent: {
            ok: true,
            fileName,
            downloadUrl,
            preset,
            freeMaxChars: FREE_MAX_CHARS,
            freeMaxExports: FREE_MAX_EXPORTS,
            freeExportsRemaining: remaining,
            upgradeUrl: UPGRADE_URL,
          },
        };
      } catch (err: any) {
        console.error("create_pdf failed:", err);
        return {
          content: [{ type: "text" as const, text: "Failed to generate PDF." }],
          structuredContent: {
            ok: false,
            error: err?.message || String(err),
            freeMaxChars: FREE_MAX_CHARS,
            freeMaxExports: FREE_MAX_EXPORTS,
            upgradeUrl: UPGRADE_URL,
          },
        };
      }
    }
  );

  console.log("[MCP] Tools registered: open_editor, create_pdf");
  return mcp;
}
