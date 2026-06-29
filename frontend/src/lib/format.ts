import { PRODUCT } from '@/lib/product';

export function formatCurrency(value: number, currency = PRODUCT.defaultCurrency, locale = PRODUCT.defaultLocale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCompactNumber(value: number, locale = PRODUCT.defaultLocale) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}
