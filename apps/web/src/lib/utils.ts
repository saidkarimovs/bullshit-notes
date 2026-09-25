export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatMoney(value: string | number | null | undefined, currency = "USD") {
  if (value == null || value === "") return "—";
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
