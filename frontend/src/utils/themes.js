// Ported verbatim from app.js — category + payment theme system.
// These colors are LOCKED (part of the protected theme). Do not change.

export const CATEGORY_THEMES = {
  Food: { primary: '#16A34A', bg: '#ECFDF3', hover: '#DCFCE7' },
  Transport: { primary: '#EA580C', bg: '#FFF7ED', hover: '#FFEDD5' },
  Shopping: { primary: '#7C3AED', bg: '#F5F3FF', hover: '#EDE9FE' },
  Bills: { primary: '#2563EB', bg: '#EFF6FF', hover: '#DBEAFE' },
  Entertainment: { primary: '#D97706', bg: '#FFFBEB', hover: '#FEF3C7' },
  Health: { primary: '#DC2626', bg: '#FEF2F2', hover: '#FEE2E2' },
  Other: { primary: '#64748B', bg: '#F8FAFC', hover: '#F1F5F9' }
};

export const DEFAULT_CATEGORY_THEME = {
  primary: '#64748B',
  bg: '#F8FAFC',
  hover: '#F1F5F9'
};

export function getCategoryTheme(category) {
  return CATEGORY_THEMES[category] || DEFAULT_CATEGORY_THEME;
}

export function getCategoryPalette() {
  return ['#16A34A', '#EA580C', '#7C3AED', '#2563EB', '#D97706', '#DC2626', '#64748B'];
}

export function getCategoryColor(category, fallbackIndex = 0) {
  if (category && CATEGORY_THEMES[category]) {
    return CATEGORY_THEMES[category].primary;
  }
  const palette = getCategoryPalette();
  return DEFAULT_CATEGORY_THEME.primary || palette[fallbackIndex % palette.length];
}

export const PAYMENT_METHOD_THEMES = {
  Cash: { primary: '#0891B2', hoverBg: '#CFFAFE', hoverText: '#0E7490' },
  'Credit Card': { primary: '#C026D3', hoverBg: '#FAE8FF', hoverText: '#A21CAF' },
  'Debit Card': { primary: '#92400E', hoverBg: '#FEF3C7', hoverText: '#78350F' },
  UPI: { primary: '#EA580C', hoverBg: '#FFEDD5', hoverText: '#C2410C' },
  'Net Banking': { primary: '#115E59', hoverBg: '#CCFBF1', hoverText: '#134E4A' }
};

export const DEFAULT_PAYMENT_METHOD_THEME = {
  primary: '#475569',
  hoverBg: '#F1F5F9',
  hoverText: '#334155'
};

export function getPaymentMethodTheme(paymentMethod) {
  return PAYMENT_METHOD_THEMES[paymentMethod] || DEFAULT_PAYMENT_METHOD_THEME;
}

export function getPaymentMethodColor(paymentMethod) {
  return getPaymentMethodTheme(paymentMethod).primary;
}

export const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
export const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];
