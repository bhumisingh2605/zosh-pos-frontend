export const TAX_RATE_PERCENT = 5; // fallback used when a line has no taxRatePercent of its own

export const DISCOUNT_TYPES = {
  NONE: 'NONE',
  PERCENT: 'PERCENT',
  FLAT: 'FLAT',
};

/**
 * items: [{ sellingPrice, quantity, taxRatePercent?, discountType?, discountValue? }]
 * discountType/discountValue below (top-level) is the CART-WIDE discount (coupon-style,
 * applied on top of any per-line discounts).
 *
 * Returns per-rate tax breakdown so a cart mixing e.g. 5% and 18% items shows
 * correctly on the receipt, plus per-line discount totals.
 */
export function computeBilling({ items, discountType, discountValue, taxRatePercent = TAX_RATE_PERCENT }) {
  const lines = (items || []).map((item) => {
    const lineGross = item.sellingPrice * item.quantity;
    const dValue = Number(item.discountValue) || 0;
    let lineDiscount = 0;
    if (item.discountType === DISCOUNT_TYPES.PERCENT && dValue > 0) {
      lineDiscount = lineGross * (Math.min(dValue, 100) / 100);
    } else if (item.discountType === DISCOUNT_TYPES.FLAT && dValue > 0) {
      lineDiscount = Math.min(dValue, lineGross);
    }
    return {
      lineGross,
      lineDiscount,
      lineNet: lineGross - lineDiscount,
      rate: item.taxRatePercent ?? taxRatePercent,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineGross, 0);
  const lineDiscountAmount = lines.reduce((sum, l) => sum + l.lineDiscount, 0);
  const afterLineDiscounts = subtotal - lineDiscountAmount;

  const cartValue = Number(discountValue) || 0;
  let discountAmount = 0;
  if (discountType === DISCOUNT_TYPES.PERCENT && cartValue > 0) {
    discountAmount = afterLineDiscounts * (Math.min(cartValue, 100) / 100);
  } else if (discountType === DISCOUNT_TYPES.FLAT && cartValue > 0) {
    discountAmount = Math.min(cartValue, afterLineDiscounts);
  }

  const taxByRate = {};
  lines.forEach((l) => {
    const share = afterLineDiscounts > 0 ? l.lineNet / afterLineDiscounts : 0;
    const taxable = Math.max(l.lineNet - discountAmount * share, 0);
    const tax = taxable * (l.rate / 100);
    if (!taxByRate[l.rate]) taxByRate[l.rate] = { ratePercent: l.rate, taxableAmount: 0, taxAmount: 0 };
    taxByRate[l.rate].taxableAmount += taxable;
    taxByRate[l.rate].taxAmount += tax;
  });

  const taxBreakdown = Object.values(taxByRate)
    .map((t) => ({ ...t, taxableAmount: round2(t.taxableAmount), taxAmount: round2(t.taxAmount) }))
    .sort((a, b) => a.ratePercent - b.ratePercent);

  const taxableAmount = taxBreakdown.reduce((sum, t) => sum + t.taxableAmount, 0);
  const taxAmount = taxBreakdown.reduce((sum, t) => sum + t.taxAmount, 0);
  const total = taxableAmount + taxAmount;

  return {
    subtotal: round2(subtotal),
    lineDiscountAmount: round2(lineDiscountAmount),
    discountAmount: round2(discountAmount),
    taxableAmount: round2(taxableAmount),
    taxAmount: round2(taxAmount),
    taxBreakdown,
    total: round2(total),
    taxRatePercent,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}