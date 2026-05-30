export function formatAmount(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatAmountCompact(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)
}

export function currencySymbol(currency = "INR"): string {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  )
}

export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
  { code: "MXN", label: "Mexican Peso (MX$)" },
  { code: "CNY", label: "Chinese Yuan (¥)" },
  { code: "CHF", label: "Swiss Franc (CHF)" },
  { code: "KRW", label: "Korean Won (₩)" },
] as const
