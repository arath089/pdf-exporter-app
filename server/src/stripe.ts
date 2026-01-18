import Stripe from "stripe";
import type { Request, Response } from "express";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const APP_ORIGIN =
  process.env.APP_ORIGIN ||
  process.env.PUBLIC_BASE_URL ||
  "http://localhost:3000";

const PRICE_PRO_MONTHLY = process.env.PRICE_PRO_MONTHLY || "";
const PRICE_LIFETIME = process.env.PRICE_LIFETIME || "";
const PRICE_DAYPASS = process.env.PRICE_DAYPASS || "";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // ❌ DO NOT set apiVersion
});

function assertEnv() {
  if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
  if (!PRICE_PRO_MONTHLY || !PRICE_LIFETIME || !PRICE_DAYPASS) {
    throw new Error(
      "Missing PRICE_PRO_MONTHLY / PRICE_LIFETIME / PRICE_DAYPASS"
    );
  }
}

export async function createCheckoutSession(req: Request, res: Response) {
  try {
    assertEnv();

    const { plan, clientId } = req.body as {
      plan: "pro_monthly" | "lifetime" | "daypass";
      clientId: string;
    };

    if (!clientId) return res.status(400).json({ error: "Missing clientId" });

    let mode: "payment" | "subscription" = "payment";
    let price = PRICE_LIFETIME;

    if (plan === "pro_monthly") {
      mode = "subscription";
      price = PRICE_PRO_MONTHLY;
    } else if (plan === "daypass") {
      mode = "payment";
      price = PRICE_DAYPASS;
    } else {
      mode = "payment";
      price = PRICE_LIFETIME;
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: clientId,
      success_url: `${APP_ORIGIN}/upgrade?success=1&plan=${plan}`,
      cancel_url: `${APP_ORIGIN}/upgrade?canceled=1`,
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("createCheckoutSession error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to create checkout session" });
  }
}
