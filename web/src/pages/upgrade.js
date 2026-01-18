import { getEnv } from "../lib/env.js";
import { getClientId } from "../lib/clientId.js";

export function renderUpgrade({ appEl }) {
  const env = getEnv();

  const clientId = getClientId();

  async function startCheckout(plan) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, clientId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Checkout failed");
    window.location.href = json.url;
  }

  appEl.innerHTML = `
    <style>
      *{ box-sizing:border-box; }
      body{ margin:0; background: #0b0f1a; }
      .u-wrap{
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        color: rgba(255,255,255,0.92);
        max-width: 1100px;
        margin: 0 auto;
        padding: 56px 16px 72px;
      }
      .u-hero{ text-align:center; margin-bottom: 26px; }
      .u-title{ margin:0; font-size: 40px; letter-spacing:-0.03em; }
      .u-sub{ margin: 12px auto 0; max-width: 820px; color: rgba(255,255,255,0.68); line-height:1.6; }

      .u-pills{ display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-top: 16px; }
      .u-pill{ border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 999px; font-size: 13px; color: rgba(255,255,255,0.75); }

      .u-grid{ display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-top: 30px; }
      .u-card{
        border:1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 18px 50px rgba(0,0,0,0.35);
        display:flex; flex-direction:column;
      }
      .u-card.featured{
        border-color: rgba(37,99,235,0.55);
        background: linear-gradient(180deg, rgba(37,99,235,0.20), rgba(255,255,255,0.06));
      }
      .u-row{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
      .u-card h3{ margin:0; font-size:20px; }
      .u-badge{ font-size: 12px; padding: 6px 10px; border-radius: 999px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
      .u-price{ font-size: 36px; font-weight: 900; margin: 10px 0 8px; }
      .u-price span{ font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); }
      .u-desc{ color: rgba(255,255,255,0.68); line-height: 1.6; font-size: 14px; margin-bottom: 12px; }
      .u-list{ list-style:none; padding:0; margin: 8px 0 16px; color: rgba(255,255,255,0.82); font-size: 14px; }
      .u-list li{ margin-bottom: 9px; }
      .u-cta{ margin-top:auto; display:flex; flex-direction:column; gap: 10px; }
      .u-btn{
        height: 46px; border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.08);
        color: white; font-weight: 900; cursor:pointer;
        width: 100%; font-size: 15px;
      }
      .u-btn.primary{
        border-color: rgba(37,99,235,0.6);
        background: linear-gradient(180deg, rgba(37,99,235,0.92), rgba(37,99,235,0.72));
      }
      .u-btn:hover{ filter: brightness(1.05); }
      .u-foot{ text-align:center; margin-top: 26px; color: rgba(255,255,255,0.62); font-size: 13px; line-height:1.6; }
      .u-link{ color: rgba(255,255,255,0.75); text-decoration:none; }
    </style>

    <div class="u-wrap">
      <div class="u-hero">
        <h1 class="u-title">Upgrade PDF Exporter</h1>
        <p class="u-sub">
          Free is great for quick notes. Upgrade when you need longer docs or more exports.
          Pro unlocks <strong>unlimited exports</strong> and <strong>${env.proMaxChars.toLocaleString()}</strong> chars/export.
        </p>
        <div class="u-pills">
          <div class="u-pill">✅ Unlimited exports</div>
          <div class="u-pill">✅ Longer PDFs</div>
          <div class="u-pill">✅ Better formatting</div>
          <div class="u-pill">✅ $${env.priceMonthly}/mo</div>
        </div>
        <div style="margin-top:16px;">
          <a class="u-link" href="/">← Back to editor</a>
        </div>
      </div>

      <div class="u-grid">
        <div class="u-card">
          <div class="u-row">
            <h3>Free</h3>
            <span class="u-badge">Starter</span>
          </div>
          <div class="u-price">$0</div>
          <div class="u-desc">Perfect for occasional exports.</div>
          <ul class="u-list">
            <li>• ${env.freeMaxChars.toLocaleString()} chars/export</li>
            <li>• ${env.freeMaxExports} exports/day</li>
            <li>• Basic presets</li>
          </ul>
          <div class="u-cta">
            <button class="u-btn" disabled>Current plan</button>
          </div>
        </div>

        <div class="u-card featured">
          <div class="u-row">
            <h3>Pro</h3>
            <span class="u-badge">Most popular</span>
          </div>
          <div class="u-price">$${env.priceMonthly} <span>/ month</span></div>
          <div class="u-desc">For daily work. Unlimited exports + longer PDFs.</div>
          <ul class="u-list">
            <li>• Unlimited exports/day</li>
            <li>• ${env.proMaxChars.toLocaleString()} chars/export</li>
            <li>• Premium formatting presets</li>
            <li>• Priority improvements</li>
          </ul>
          <div class="u-cta">
            <a href="${
              env.stripeMonthlyUrl
            }" target="_blank" rel="noreferrer"><button id="btnPro" class="u-btn primary">Upgrade to Pro</button></a>
            <div style="text-align:center; color: rgba(255,255,255,0.62); font-size: 12px;">Cancel anytime</div>
          </div>
        </div>

        <div class="u-card">
          <div class="u-row">
            <h3>Lifetime</h3>
            <span class="u-badge">One-time</span>
          </div>
          <div class="u-price">$${env.priceLifetime} <span>once</span></div>
          <div class="u-desc">Pay once, keep Pro forever.</div>
          <ul class="u-list">
            <li>• Everything in Pro</li>
            <li>• No monthly payments</li>
            <li>• Early access to features</li>
          </ul>
          <div class="u-cta">
            <a href="${
              env.stripeLifetimeUrl
            }" target="_blank" rel="noreferrer"><button id="btnLifetime" class="u-btn">Buy Lifetime</button></a>
          </div>
        </div>

        <div class="u-card">
          <div class="u-row">
            <h3>Day Pass</h3>
            <span class="u-badge">Cheap</span>
          </div>
          <div class="u-price">$${env.priceDayPass} <span>24h</span></div>
          <div class="u-desc">Need it once? Unlock Pro for a day.</div>
          <ul class="u-list">
            <li>• Unlimited exports for 24 hours</li>
            <li>• ${env.proMaxChars.toLocaleString()} chars/export</li>
            <li>• Great for one-off tasks</li>
          </ul>
          <div class="u-cta">
            <a href="${
              env.stripeDayPassUrl
            }" target="_blank" rel="noreferrer"><button id="btnDayPass" class="u-btn">Buy Day Pass</button></a>
          </div>
        </div>
      </div>

      <div class="u-foot">
        Payments via Stripe · We’ll wire “Pro unlock” to accounts next.
        <br/>Free exports reset daily (UTC).
      </div>
    </div>
  `;

  document
    .getElementById("btnPro")
    ?.addEventListener("click", () => startCheckout("pro_monthly"));
  document
    .getElementById("btnLifetime")
    ?.addEventListener("click", () => startCheckout("lifetime"));
  document
    .getElementById("btnDayPass")
    ?.addEventListener("click", () => startCheckout("daypass"));
}
