
export function computeBookingTotals(selectedServices) {
  const itemCount = selectedServices.reduce(
    (sum, service) => sum + (Number(service.qty) || 1),
    0
  );

  const totalDuration = selectedServices.reduce(
    (sum, service) =>
      sum + (Number(service.duration) || 0) * (Number(service.qty) || 1),
    0
  );

  const subtotal = selectedServices.reduce(
    (sum, service) =>
      sum + (Number(service.price) || 0) * (Number(service.qty) || 1),
    0
  );

  const total = subtotal;

  return {
    itemCount,
    totalDuration,
    subtotal,
    total,
  };
}

