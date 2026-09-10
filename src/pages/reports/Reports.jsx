import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import StatCard from '../../components/StatCard';
import { Select } from '../../components/Field';
import { useWorkspace } from '../../store/workspaceContext';
import * as ordersApi from '../../api/orders';
import { formatCurrency, formatDate } from '../../lib/format';

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 0, label: 'All time' },
];

// Matches the theme's CSS custom properties (see src/index.css) so charts
// look native instead of like a bolted-on third-party widget.
const COLORS = {
  ledger: '#2f6f4e',
  brass: '#c7962c',
  red: '#c1443b',
  grid: '#e5ded0',
  muted: '#8a8272',
};
const PAYMENT_COLORS = { CASH: COLORS.ledger, UPI: COLORS.brass, CARD: COLORS.red };
const PIE_FALLBACK_COLORS = [COLORS.ledger, COLORS.brass, COLORS.red, COLORS.muted];

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function Reports() {
  const { activeBranch, loading: workspaceLoading } = useWorkspace();
  const [orders, setOrders] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);

  const load = () => {
    if (!activeBranch?.id) return;
    setLoadError(false);
    // Reports work off the full order history for the branch; the date range
    // filter below is applied client-side so switching ranges doesn't
    // re-fetch, and so this keeps working even if the backend doesn't
    // support arbitrary date-range query params.
    ordersApi.getOrdersByBranch(activeBranch.id).then(setOrders).catch(() => { setOrders([]); setLoadError(true); });
  };

  useEffect(load, [activeBranch?.id]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!rangeDays) return orders;
    const cutoff = startOfDay(new Date());
    cutoff.setDate(cutoff.getDate() - (rangeDays - 1));
    return orders.filter((o) => o.createdAt && new Date(o.createdAt) >= cutoff);
  }, [orders, rangeDays]);

  // --- Sales over time ---
  const salesByDay = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      if (!o.createdAt) return;
      const key = startOfDay(new Date(o.createdAt)).toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Number(o.totalAmount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total, label: formatDate(date) }));
  }, [filteredOrders]);

  // --- Top products ---
  const topProducts = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((i) => {
        const name = i.product?.name || 'Unknown product';
        map[name] = (map[name] || 0) + Number(i.quantity || 0);
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, quantity]) => ({ name, quantity }));
  }, [filteredOrders]);

  // --- Payment type breakdown ---
  const paymentBreakdown = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      const type = o.paymentType || 'OTHER';
      map[type] = (map[type] || 0) + Number(o.totalAmount || 0);
    });
    return Object.entries(map).map(([type, total]) => ({ type, total }));
  }, [filteredOrders]);

  // --- Summary stats ---
  const totalSales = filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const orderCount = filteredOrders.length;
  const avgOrderValue = orderCount ? totalSales / orderCount : 0;

  if (workspaceLoading || orders === null) return <Loader label="Loading reports…" />;

  return (
    <div>
      <PageHeader
        eyebrow={activeBranch?.name}
        title="Reports"
        description="Sales trends, top products, and payment mix for this branch."
        actions={
          <Select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))} className="w-40">
            {RANGE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
        }
      />

      {loadError && <LoadError message="Could not load orders for this branch." onRetry={load} />}

      {!loadError && !filteredOrders.length && (
        <div className="text-center text-sm text-ink-text-muted py-16 border border-dashed border-hairline rounded-sm">
          No orders in this range yet — reports will populate as sales come in.
        </div>
      )}

      {!loadError && filteredOrders.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <StatCard label="Total sales" value={formatCurrency(totalSales)} tone="ledger" />
            <StatCard label="Orders" value={orderCount} />
            <StatCard label="Average order value" value={formatCurrency(avgOrderValue)} tone="brass" />
          </div>

          <div className="border border-hairline bg-paper-raised rounded-sm p-5 mb-6">
            <h2 className="text-sm font-semibold text-ink-text mb-4">Sales over time</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesByDay} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: COLORS.muted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip formatter={(v) => formatCurrency(v)} labelStyle={{ color: '#1a1a1a' }} />
                <Line type="monotone" dataKey="total" stroke={COLORS.ledger} strokeWidth={2} dot={{ r: 3 }} name="Sales" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-hairline bg-paper-raised rounded-sm p-5">
              <h2 className="text-sm font-semibold text-ink-text mb-4">Top products by units sold</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={{ stroke: COLORS.grid }} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: COLORS.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v) => [`${v} sold`, '']} labelStyle={{ color: '#1a1a1a' }} />
                  <Bar dataKey="quantity" fill={COLORS.brass} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border border-hairline bg-paper-raised rounded-sm p-5">
              <h2 className="text-sm font-semibold text-ink-text mb-4">Payment method breakdown</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    dataKey="total"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {paymentBreakdown.map((entry, i) => (
                      <Cell key={entry.type} fill={PAYMENT_COLORS[entry.type] || PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend
                    formatter={(value) => <span style={{ color: '#4a4436', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
