// lib/pricing.js

// Book 3 or more services and get 10% off the subtotal.
export const DISCOUNT_THRESHOLD = 3;
export const DISCOUNT_RATE = 0.1;

export function computeBookingTotals(selectedServices) {
  const itemCount = selectedServices.reduce((sum, s) => sum + s.qty, 0);

  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration * s.qty,
    0
  );

  const subtotal = selectedServices.reduce(
    (sum, s) => sum + s.price * s.qty,
    0
  );

  const qualifiesForDiscount = itemCount >= DISCOUNT_THRESHOLD;
  const discount = qualifiesForDiscount
    ? Math.round(subtotal * DISCOUNT_RATE)
    : 0;

  const total = subtotal - discount;

  return { itemCount, totalDuration, subtotal, qualifiesForDiscount, discount, total };
}