import "../app.css";
import { createPdf } from "../lib/api.js";
import { getClientId } from "../lib/clientId.js";
import { getEnv } from "../lib/env.js";

export function renderEditor({ appEl, isWidget, initialToolOutput }) {
  const env = getEnv();
  const clientId = getClientId();

  const modeText = isWidget ? "Mode: ChatGPT Widget" : "Mode: Website";

  const initial = initialToolOutput || {};
  const presetInit = initial.preset || "report";
  const textInit = initial.seedText || initial.rawText || "";

  const editorHtml = `
    <div class="pe-shell">
      ${
        isWidget
          ? `
        <div class="pe-root">
          ${editorCore(modeText, presetInit, textInit, env)}
        </div>
      `
          : `
        <div class="pe-layout">
          <div class="pe-root">
            ${editorCore(modeText, presetInit, textInit, env)}
          </div>

          <aside class="pe-sidebar">
            <div class="pe-side-title">About</div>
            <div class="pe-side-box">
              Export clean PDFs from text or ChatGPT output. Fast, private, and simple.
            </div>

            <div class="pe-side-title" style="margin-top:14px;">Limits</div>
            <div class="pe-side-box">
              Free: <strong>${
                env.freeMaxExports
              }/day</strong> · <strong>${env.freeMaxChars.toLocaleString()}</strong> chars/export
              <br/>
              Pro: <strong>Unlimited</strong> · <strong>${env.proMaxChars.toLocaleString()}</strong> chars/export
              <div style="margin-top:10px;">
                <a class="pe-link" href="/upgrade">See plans →</a>
              </div>
            </div>

            <div class="pe-side-title" style="margin-top:14px;">Ad</div>
            <div class="pe-ad">Ad slot (250px)</div>

            <div class="pe-side-title" style="margin-top:14px;">Privacy</div>
            <div class="pe-side-box">
              PDFs are generated on demand. Add your privacy policy later here.
            </div>
          </aside>
        </div>
      `
      }
    </div>
  `;

  appEl.innerHTML = editorHtml;

  const btn = document.getElementById("btn");
  const out = document.getElementById("out");
  const statusWrap = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const textEl = document.getElementById("text");
  const presetEl = document.getElementById("preset");
  const freeText = document.getElementById("freeText");
  const upgradeLink = document.getElementById("upgradeLink");

  function updateFreeUI(meta) {
    const max = meta?.freeMaxExports ?? env.freeMaxExports;
    const remaining = meta?.freeExportsRemaining ?? max;
    freeText.textContent = `Free exports remaining: ${remaining}/${max}`;
    upgradeLink.href = meta?.upgradeUrl || "/upgrade";
  }

  updateFreeUI(initial);

  function setLoading(isLoading, msg = "") {
    statusWrap.dataset.loading = isLoading ? "true" : "false";
    statusText.textContent = msg;
    btn.disabled = isLoading;
  }

  function renderUpgradeCard(result, rawText) {
    const maxChars = result.freeMaxChars ?? env.freeMaxChars;
    const maxExports = result.freeMaxExports ?? env.freeMaxExports;
    const remaining = result.freeExportsRemaining ?? 0;
    const upgradeUrl = result.upgradeUrl || "/upgrade";

    let title = "";
    let body = "";
    let extra = "";

    if (result.reason === "quota") {
      title = "Upgrade for unlimited exports";
      body = `Free includes <strong>${maxExports}</strong> exports/day. You have <strong>0</strong> remaining today.`;
      extra = "Come back tomorrow or upgrade now.";
    } else {
      const overBy = result.overBy ?? Math.max(0, rawText.length - maxChars);
      title = "Upgrade to export longer PDFs";
      body = `Free limit: <strong>${maxChars.toLocaleString()}</strong> characters. You are over by <strong>${overBy.toLocaleString()}</strong>.`;
      extra = "Trim to free limit or upgrade.";
    }

    out.innerHTML = `
      <div class="pe-card">
        <div style="font-weight:900; margin-bottom:6px;">${title}</div>
        <div style="line-height:1.45;">
          ${body}<br/>
          <span style="color: var(--muted);">${extra}</span>
        </div>
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <a class="pe-link" href="${upgradeUrl}" target="_blank" rel="noreferrer">Upgrade ($5/mo)</a>
          ${
            result.reason === "length"
              ? `<button id="trimBtn" class="pe-select" type="button">Trim</button>`
              : ""
          }
        </div>
        <div style="margin-top:10px; color: var(--muted); font-size: 12px;">
          Free exports remaining: <strong>${remaining}/${maxExports}</strong>
        </div>
      </div>
    `;

    const trimBtn = document.getElementById("trimBtn");
    if (trimBtn) {
      trimBtn.addEventListener("click", () => {
        textEl.value = rawText.slice(0, maxChars);
        out.textContent = "Trimmed. Click Generate PDF again.";
      });
    }

    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  btn.addEventListener("click", async () => {
    const rawText = textEl.value.trim();
    const preset = presetEl.value;

    if (!rawText) {
      out.innerHTML = `<div class="pe-error">Please paste some text first.</div>`;
      return;
    }

    out.textContent = "";
    setLoading(true, "Generating…");

    try {
      const result = await createPdf({ isWidget, clientId, rawText, preset });
      updateFreeUI(result);

      if (result?.upgrade) {
        setLoading(false, "");
        renderUpgradeCard(result, rawText);
        return;
      }

      if (result?.ok === false) throw new Error(result.error || "Tool error");

      setLoading(false, "Done ✅");

      out.innerHTML = `
        <a class="pe-link" href="${
          result.downloadUrl
        }" download>Download PDF</a>
        <div style="margin-top:8px; color: var(--muted);">
          ${result.fileName ? `File: <strong>${result.fileName}</strong>` : ""}
        </div>
      `;
      out.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      setLoading(false, "");
      out.innerHTML = `<div class="pe-error">Error generating PDF: ${
        e?.message || "Unknown error"
      }</div>`;
      out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      console.error(e);
    }
  });
}

function editorCore(modeText, presetInit, textInit, env) {
  return `
    <div class="pe-header">
      <div class="pe-brand">
        <img class="pe-logo" src="/favicon.ico" alt="PDF Exporter" />
        <h1 class="pe-title">PDF Exporter</h1>
      </div>
    <div class="pe-badge">${modeText}</div>
    </div>

    <div class="pe-toolbar">
      <span class="pe-label">Preset</span>
      <select id="preset" class="pe-select">
        <option value="report" ${
          presetInit === "report" ? "selected" : ""
        }>Report</option>
        <option value="notes" ${
          presetInit === "notes" ? "selected" : ""
        }>Notes</option>
        <option value="resume" ${
          presetInit === "resume" ? "selected" : ""
        }>Resume</option>
      </select>

      <button id="btn" class="pe-button" type="button">Generate PDF</button>

      <div id="status" class="pe-status" data-loading="false">
        <span class="pe-spinner"></span>
        <span id="statusText"></span>
      </div>

      <div class="pe-status" id="freeStatus" style="margin-left:auto; white-space:nowrap;">
        <span id="freeText">Free exports remaining: ${env.freeMaxExports}/${
    env.freeMaxExports
  }</span>
      </div>

      <a class="pe-link" id="upgradeLink" href="/upgrade" rel="noreferrer">Upgrade</a>
    </div>

    <textarea id="text" class="pe-textarea" placeholder="Paste or write content here…">${escapeHtml(
      textInit
    )}</textarea>

    <div class="pe-footer">
      <div id="out" class="pe-out"></div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
