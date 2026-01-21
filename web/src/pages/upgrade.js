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

      @media (max-width: 520px){
      .u-wrap{
        padding: 28px 14px 40px;
      }

      .u-title{
        font-size: 28px;
      }

      .u-sub{
        font-size: 14px;
      }

      .u-grid{
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .u-card{
        padding: 16px;
        border-radius: 16px;
      }

      .u-price{
        font-size: 30px;
      }

      .u-btn{
        height: 48px;
        font-size: 16px;
      }

      .u-pills{
        gap: 8px;
      }

      .u-pill{
        font-size: 12px;
        padding: 7px 10px;
      }
    }
      @media (max-width: 520px){
      .u-title{ font-size: 28px; }
      .u-sub{ font-size: 15px; }

      /* Turn grid into horizontal slider */
      .u-grid{
        display: flex;
        overflow-x: auto;
        gap: 14px;
        scroll-snap-type: x mandatory;
        padding-bottom: 10px;
        -webkit-overflow-scrolling: touch;
      }

      .u-card{
        min-width: 86%;
        flex: 0 0 auto;
        scroll-snap-align: center;
        padding: 18px;
      }

      .u-price{ font-size: 32px; }
      .u-btn{ height: 52px; font-size: 16px; }

      /* Hide scrollbar */
      .u-grid::-webkit-scrollbar{ display:none; }
      .u-grid{ scrollbar-width: none; }

      /* Add dots */
      .u-dots{
        display:flex;
        justify-content:center;
        gap:8px;
        margin-top: 12px;
      }
      .u-dot{
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(255,255,255,0.25);
      }
      .u-dot.active{
        background: rgba(255,255,255,0.8);
      }
    }
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
            <button id="btnPro" class="u-btn primary">Upgrade to Pro</button>
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
            <button id="btnLifetime" class="u-btn">Buy Lifetime</button>
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
            <button id="btnDayPass" class="u-btn">Buy Day Pass</button>
          </div>
        </div>
      </div>

      <div class="u-dots" id="dots"></div>

      <div class="u-foot">
        Payments via Stripe · We’ll wire “Pro unlock” to accounts next.
        <br/>Free exports reset daily (UTC).
      </div>
    </div>
  `;

  // Mobile slider: auto-focus Pro card (Most popular)
  const grid = document.querySelector(".u-grid");
  if (grid) {
    const cards = Array.from(grid.querySelectorAll(".u-card"));
    const dotsEl = document.getElementById("dots");

    // Dots (mobile only)
    if (dotsEl && cards.length) {
      dotsEl.innerHTML = cards
        .map((_, i) => `<div class="u-dot" data-i="${i}"></div>`)
        .join("");
    }

    function setActiveDot(idx) {
      if (!dotsEl) return;
      dotsEl
        .querySelectorAll(".u-dot")
        .forEach((d, i) => d.classList.toggle("active", i === idx));
    }

    // Find the Pro card (featured / most popular)
    const proIndex = cards.findIndex((c) => c.classList.contains("featured"));
    if (proIndex >= 0) {
      // Scroll Pro into view on mobile
      cards[proIndex].scrollIntoView({
        behavior: "instant",
        inline: "center",
        block: "nearest",
      });
      setActiveDot(proIndex);
    } else {
      setActiveDot(0);
    }

    // Update dot on scroll
    grid.addEventListener(
      "scroll",
      () => {
        const mid = grid.scrollLeft + grid.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;

        cards.forEach((c, i) => {
          const rect = c.getBoundingClientRect();
          const center = rect.left + rect.width / 2;
          const dist = Math.abs(center - window.innerWidth / 2);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });

        setActiveDot(best);
      },
      { passive: true }
    );

    // Tap dots
    dotsEl?.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const i = Number(t.dataset.i);
      if (!Number.isFinite(i) || !cards[i]) return;
      cards[i].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      setActiveDot(i);
    });
  }

  async function startCheckout(plan, buttonEl) {
    try {
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = "Redirecting…";
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, clientId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");

      // ✅ Mobile-safe redirect
      window.location.assign(json.url);
    } catch (e) {
      alert(e?.message || "Checkout failed");
      if (buttonEl) {
        buttonEl.disabled = false;
        // restore label based on plan:
        buttonEl.textContent =
          plan === "pro_monthly"
            ? "Upgrade to Pro"
            : plan === "lifetime"
            ? "Buy Lifetime"
            : "Buy Day Pass";
      }
    }
  }

  document
    .getElementById("btnPro")
    ?.addEventListener("click", (e) =>
      startCheckout("pro_monthly", e.currentTarget)
    );

  document
    .getElementById("btnLifetime")
    ?.addEventListener("click", (e) =>
      startCheckout("lifetime", e.currentTarget)
    );

  document
    .getElementById("btnDayPass")
    ?.addEventListener("click", (e) =>
      startCheckout("daypass", e.currentTarget)
    );
}
