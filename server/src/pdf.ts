import path from "node:path";
import { chromium, type Browser } from "playwright";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

type Preset = "report" | "notes" | "resume";

function presetTitle(preset: Preset) {
  if (preset === "resume") return "Resume";
  if (preset === "notes") return "Notes";
  return "Report";
}

function mem(label: string) {
  const m = process.memoryUsage();
  console.log(
    `[MEM] ${label} rss=${Math.round(m.rss / 1e6)}MB heapUsed=${Math.round(
      m.heapUsed / 1e6
    )}MB ext=${Math.round(m.external / 1e6)}MB`
  );
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Reuse a single browser (stable on VMs)
let browserPromise: Promise<Browser> | null = null;

async function getBrowser() {
  if (!browserPromise) {
    console.log("[PDF] launching chromium...");
    mem("before chromium.launch");

    browserPromise = withTimeout(
      chromium.launch({
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      }),
      30000,
      "chromium.launch"
    ).then((b) => {
      console.log("[PDF] chromium launched");
      mem("after chromium.launch");

      b.on("disconnected", () => {
        console.log(
          "[PDF] chromium disconnected (likely OOM/crash). Resetting browserPromise."
        );
        browserPromise = null;
      });

      return b;
    });
  }
  return browserPromise;
}

// Simple queue to avoid concurrent chromium pressure
let queue: Promise<any> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function renderPdf(opts: {
  id: string;
  rawText: string;
  preset: Preset;
  outDir: string;
}): Promise<{ filePath: string; fileName: string }> {
  return enqueue(async () => {
    const { id, rawText, preset, outDir } = opts;

    let stage = "start";
    const stamp = (s: string) => {
      stage = s;
      console.log("[STAGE]", stage);
      mem(stage);
    };

    const t0 = Date.now();
    const elapsed = () => `${Date.now() - t0}ms`;

    try {
      stamp("start");

      const fileName = `${preset}-${id}.pdf`;
      const filePath = path.join(outDir, fileName);

      stamp("marked.parse");
      const rawHtml = await withTimeout(
        marked.parse(rawText) as any,
        15000,
        "marked.parse"
      );

      stamp("sanitizeHtml");
      const safeHtml = sanitizeHtml(rawHtml as any, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          "img",
          "h1",
          "h2",
          "pre",
          "code",
        ]),
        allowedAttributes: {
          a: ["href", "name", "target", "rel"],
          img: ["src", "alt"],
          code: ["class"],
          pre: ["class"],
        },
        allowedSchemes: ["http", "https", "data"],
      });

      stamp("buildHtml");
      const title = presetTitle(preset);

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { margin: 28mm 18mm; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      color: #111;
      line-height: 1.5;
      font-size: 12.5pt;
    }
    h1 { font-size: 22pt; margin: 0 0 12mm 0; letter-spacing: -0.02em; }
    .content pre { background: #f6f8fa; padding: 10px 12px; border-radius: 6px; font-size: 10.5pt; }
    .content code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="content">${safeHtml}</div>
</body>
</html>`;

      stamp("getBrowser");
      const browser = await getBrowser();

      stamp("newContext");
      const context = await withTimeout(
        browser.newContext(),
        10000,
        "browser.newContext"
      );

      try {
        stamp("newPage");
        const page = await withTimeout(
          context.newPage(),
          10000,
          "context.newPage"
        );

        console.log(`[PDF] setContent start (${elapsed()})`);
        stamp("setContent");
        await withTimeout(
          page.setContent(html, { waitUntil: "domcontentloaded" }),
          20000,
          "page.setContent"
        );
        console.log(`[PDF] setContent done (${elapsed()})`);

        // Small settle delay for fonts/layout
        await page.waitForTimeout(50);

        console.log(`[PDF] pdf start (${elapsed()})`);
        stamp("pdf");
        await withTimeout(
          page.pdf({
            path: filePath,
            format: "A4",
            printBackground: true,
          }),
          20000,
          "page.pdf"
        );
        console.log(`[PDF] pdf done (${elapsed()}) file=${fileName}`);

        stamp("done");
        return { filePath, fileName };
      } finally {
        stamp("context.close");
        await withTimeout(context.close(), 10000, "context.close");
      }
    } catch (err: any) {
      console.error("[PDF] FAILED at stage:", stage, "after", elapsed());
      console.error("[PDF] ERROR:", err?.message || err);
      throw err;
    }
  });
}
