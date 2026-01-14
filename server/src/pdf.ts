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

// Reuse a single browser (much more stable on small VMs)
let browserPromise: Promise<Browser> | null = null;
async function getBrowser() {
  if (!browserPromise) {
    console.log("[PDF] launching chromium...");
    browserPromise = chromium
      .launch({
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
        timeout: 30000,
      })
      .then((b) => {
        console.log("[PDF] chromium launched");
        b.on("disconnected", () => {
          console.log("[PDF] chromium disconnected; resetting browserPromise");
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

    const fileName = `${preset}-${id}.pdf`;
    const filePath = path.join(outDir, fileName);

    // marked can be async depending on version/config
    const rawHtml = await marked.parse(rawText);
    const safeHtml = sanitizeHtml(rawHtml, {
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

    const browser = await getBrowser();
    const context = await browser.newContext();

    try {
      const page = await context.newPage();

      console.log("[PDF] setContent start");
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      console.log("[PDF] setContent done");

      // A tiny delay can help fonts/layout settle in containers
      await page.waitForTimeout(50);

      console.log("[PDF] pdf() start");
      await Promise.race([
        page.pdf({
          path: filePath,
          format: "A4",
          printBackground: true,
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("PDF generation timed out")), 20000)
        ),
      ]);
      console.log("[PDF] pdf() done", fileName);

      return { filePath, fileName };
    } finally {
      await context.close();
    }
  });
}
