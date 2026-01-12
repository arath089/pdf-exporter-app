export function getEnv() {
  return {
    stripeMonthlyUrl:
      window.STRIPE_MONTHLY_URL || "https://buy.stripe.com/test_monthly",
    stripeLifetimeUrl:
      window.STRIPE_LIFETIME_URL || "https://buy.stripe.com/test_lifetime",
    stripeDayPassUrl:
      window.STRIPE_DAYPASS_URL || "https://buy.stripe.com/test_daypass",

    // pricing display values
    priceMonthly: 5,
    priceLifetime: 39,
    priceDayPass: 2.99,

    // limits (match your server defaults)
    freeMaxChars: 1500,
    freeMaxExports: 3,
    proMaxChars: 20000,
  };
}
