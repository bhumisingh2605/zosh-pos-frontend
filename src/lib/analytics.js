export function groupSalesByDay(orders, days = 14) {
  const buckets = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({
      date: dayKey(d),
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      total: 0,
    });
  }

  const byKey = Object.fromEntries(buckets.map((b) => [b.date, b]));
  (orders || []).forEach((o) => {
    if (!o.createdAt) return;
    const key = dayKey(new Date(o.createdAt));
    if (byKey[key]) byKey[key].total += o.totalAmount || 0;
  });

  return buckets;
}

export function topProducts(orders, limit = 5) {
  const map = {};
  (orders || []).forEach((o) => {
    (o.items || []).forEach((i) => {
      const name = i.product?.name || i.name || 'Unknown item';
      if (!map[name]) map[name] = { name, quantity: 0, revenue: 0 };
      map[name].quantity += i.quantity || 0;
      map[name].revenue += (i.price || 0) * (i.quantity || 0);
    });
  });
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}