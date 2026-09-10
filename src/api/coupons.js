import client from './client';

export const createCoupon = (couponDto) => client.post('/api/coupons', couponDto).then((r) => r.data);
export const updateCoupon = (id, couponDto) => client.put(`/api/coupons/${id}`, couponDto).then((r) => r.data);
export const deleteCoupon = (id) => client.delete(`/api/coupons/${id}`).then((r) => r.data);
export const getCouponById = (id) => client.get(`/api/coupons/${id}`).then((r) => r.data);
export const getCouponsByStore = (storeId) => client.get(`/api/coupons/store/${storeId}`).then((r) => r.data);

// Builds an axios-shaped error so callers that read `err.response?.data?.message`
// (see POS.jsx handleApplyCoupon) get the specific reason instead of a generic fallback.
function couponError(message) {
  const err = new Error(message);
  err.response = { data: { message } };
  return err;
}

// Validates a coupon code against the store's coupon list and returns the
// discount to apply. There's no dedicated backend "validate" endpoint, so this
// checks the same rules (active, expiry, minimum order, discount cap) against
// the coupons already returned by getCouponsByStore.
export const validateCoupon = async (code, storeId, orderTotal) => {
  const coupons = await getCouponsByStore(storeId);
  const coupon = coupons.find((c) => c.code?.trim().toLowerCase() === code.trim().toLowerCase());

  if (!coupon) throw couponError('Invalid coupon code.');
  if (coupon.active === false) throw couponError('This coupon is no longer active.');

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw couponError('This coupon has expired.');
  }

  if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
    throw couponError(`This coupon requires a minimum order of ${coupon.minOrderAmount}.`);
  }

  let discountAmount = coupon.discountType === 'PERCENTAGE'
    ? (orderTotal * Number(coupon.discountValue)) / 100
    : Number(coupon.discountValue);

  if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
    discountAmount = coupon.maxDiscountAmount;
  }

  discountAmount = Math.min(discountAmount, orderTotal);

  return { discountAmount, coupon };
};