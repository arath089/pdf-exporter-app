export function renderPrivacy({ appEl }) {
  appEl.innerHTML = `
    <style>
      body { margin: 0; background: #0b0f1a; }
      .p-wrap{
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        color: rgba(255,255,255,0.92);
        max-width: 900px;
        margin: 0 auto;
        padding: 48px 16px 72px;
        line-height: 1.7;
      }
      .p-title{ margin: 0 0 10px; font-size: 34px; letter-spacing:-0.03em; }
      .p-sub{ color: rgba(255,255,255,0.68); margin: 0 0 24px; }
      .p-card{
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        border-radius: 16px;
        padding: 18px;
        margin: 12px 0;
      }
      .p-card h3{ margin: 0 0 10px; font-size: 16px; }
      .p-card p, .p-card li{ color: rgba(255,255,255,0.80); font-size: 14px; }
      .p-link{ color: rgba(255,255,255,0.78); text-decoration: none; }
      .p-link:hover{ text-decoration: underline; }
      .p-muted{ color: rgba(255,255,255,0.62); font-size: 13px; }
    </style>

    <div class="p-wrap">
      <h1 class="p-title">Privacy Policy</h1>
      <p class="p-sub">
        We built PDF Exporter to be simple and private. This page explains what we collect (very little) and why.
      </p>

      <div class="p-card">
        <h3>What data we process</h3>
        <p>
          When you generate a PDF, we process the text you provide to produce the PDF file.
          We do not sell your content, and we don’t use it to train models.
        </p>
      </div>

      <div class="p-card">
        <h3>What we store</h3>
        <ul>
          <li><strong>Generated PDFs:</strong> temporarily stored on our server so you can download them.</li>
          <li><strong>Usage counters:</strong> we may store anonymous usage counters (like daily export count) tied to a random client ID in your browser.</li>
        </ul>
        <p class="p-muted">
          Note: Storage may be ephemeral depending on hosting. In the future, we may move PDFs to encrypted storage with automatic expiry.
        </p>
      </div>

      <div class="p-card">
        <h3>Payments</h3>
        <p>
          Payments are handled by Stripe. We do not store your full card details on our servers.
        </p>
      </div>

      <div class="p-card">
        <h3>Cookies</h3>
        <p>
          We may use a small local identifier (stored in your browser) to manage free usage limits and purchases on the same device.
          We do not use third-party tracking cookies for advertising at this time.
        </p>
      </div>

      <div class="p-card">
        <h3>Contact</h3>
        <p>
          Questions or requests? Email: <a class="p-link" href="mailto:support@pdf-exporter.com">support@pdf-exporter.com</a>
        </p>
      </div>

      <p class="p-muted">
        Last updated: ${new Date().toISOString().slice(0, 10)}
        · <a class="p-link" href="/">Back to app</a>
      </p>
    </div>
  `;
}
