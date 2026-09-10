import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, StopCircle, ArrowRight, AlertTriangle, Settings2 } from 'lucide-react';
import { PageHeader, Loader, Ledger, LoadError } from '../../components/Layout';
import StatCard from '../../components/StatCard';
import StatusPill from '../../components/StatusPill';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import { Input } from '../../components/Field';
import { useAuthStore } from '../../store/authStore';
import { useWorkspace } from '../../store/workspaceContext';
import * as ordersApi from '../../api/orders';
import * as shiftsApi from '../../api/shifts';
import * as storesApi from '../../api/stores';
import * as inventoryApi from '../../api/inventory';
import { formatCurrency, formatDateTime, roleLabel } from '../../lib/format';
import { toast } from '../../store/toastStore';

const BRANCH_ROLES = ['ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'];
const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_STORAGE_KEY = 'zosh_low_stock_threshold';

function getStoredThreshold() {
  const saved = Number(localStorage.getItem(LOW_STOCK_STORAGE_KEY));
  return saved > 0 ? saved : DEFAULT_LOW_STOCK_THRESHOLD;
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { store, branches, activeBranch, isSuperAdmin, loading: workspaceLoading } = useWorkspace();

  if (isSuperAdmin) return <SuperAdminDashboard />;
  if (!workspaceLoading && !store) return <NoStoreDashboard />;

  return <StoreDashboard user={user} store={store} branches={branches} activeBranch={activeBranch} loading={workspaceLoading} />;
}

function NoStoreDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <div>
      <PageHeader eyebrow={roleLabel(user?.role)} title={`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`} />
      <Ledger className="text-center py-14">
        <p className="text-sm text-ink-text-muted mb-4 max-w-sm mx-auto">
          {user?.role === 'ROLE_STORE_ADMIN'
            ? "You haven't set up a store yet. Create one to start adding branches, products, and staff."
            : "You're not attached to a store yet. Ask your store admin to add you as an employee."}
        </p>
        {user?.role === 'ROLE_STORE_ADMIN' && (
          <Link to="/stores">
            <Button icon={ArrowRight}>Set up your store</Button>
          </Link>
        )}
      </Ledger>
    </div>
  );
}

function SuperAdminDashboard() {
  const [stores, setStores] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    storesApi.getAllStores().then(setStores).catch(() => { setStores([]); setLoadError(true); });
  };

  useEffect(load, []);

  if (!stores) return <Loader label="Loading stores…" />;
  if (loadError) {
    return (
      <div>
        <PageHeader eyebrow="Platform overview" title="All stores" description="Every store registered on Zosh POS." />
        <LoadError message="Couldn't load the store list." onRetry={load} />
      </div>
    );
  }

  const counts = stores.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader eyebrow="Platform overview" title="All stores" description="Every store registered on Zosh POS." />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total stores" value={stores.length} />
        <StatCard label="Active" value={counts.ACTIVE || 0} tone="ledger" />
        <StatCard label="Pending review" value={counts.PENDING || 0} tone="brass" />
        <StatCard label="Blocked" value={counts.BLOCKED || 0} tone="red" />
      </div>
      <DataTable
        emptyMessage="No stores registered yet."
        rows={stores}
        columns={[
          { key: 'brand', header: 'Store', render: (r) => <span className="font-medium">{r.brand}</span> },
          { key: 'storeType', header: 'Type' },
          { key: 'admin', header: 'Admin', render: (r) => r.storeAdmin?.fullName || '—' },
          { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
        ]}
      />
      <div className="mt-4 text-right">
        <Link to="/stores" className="text-sm text-ledger hover:underline">Manage stores →</Link>
      </div>
    </div>
  );
}

function StoreDashboard({ user, store, branches, activeBranch, loading }) {
  const [todayOrders, setTodayOrders] = useState(null);
  const [recentOrders, setRecentOrders] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [threshold, setThreshold] = useState(getStoredThreshold);
  const [showThresholdEditor, setShowThresholdEditor] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [shift, setShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const isBranchStaff = BRANCH_ROLES.includes(user?.role);

  const loadOrders = () => {
    if (!activeBranch?.id) return;
    setLoadError(false);
    ordersApi.getTodayOrders(activeBranch.id).then(setTodayOrders).catch(() => { setTodayOrders([]); setLoadError(true); });
    ordersApi.getRecentOrders(activeBranch.id).then(setRecentOrders).catch(() => { setRecentOrders([]); setLoadError(true); });
  };

  useEffect(loadOrders, [activeBranch?.id]);

  useEffect(() => {
    if (!activeBranch?.id) return;
    // A nice-to-have widget, so a failed fetch just leaves the stat card
    // showing "—" instead of blocking the dashboard.
    inventoryApi.getInventoryByBranch(activeBranch.id).then(setInventory).catch(() => setInventory([]));
  }, [activeBranch?.id]);

  const lowStockItems = useMemo(
    () => (inventory || []).filter((r) => r.quantity != null && r.quantity <= threshold),
    [inventory, threshold],
  );

  const handleThresholdChange = (value) => {
    const n = Number(value);
    const safe = n > 0 ? n : DEFAULT_LOW_STOCK_THRESHOLD;
    setThreshold(safe);
    localStorage.setItem(LOW_STOCK_STORAGE_KEY, String(safe));
  };

  useEffect(() => {
    if (!isBranchStaff) return;
    shiftsApi.getCurrentShift().then(setShift).catch(() => setShift(null));
  }, [isBranchStaff]);

  const handleStartShift = async () => {
    setShiftLoading(true);
    try {
      const s = await shiftsApi.startShift();
      setShift(s);
      toast.success('Shift started. Have a good one.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the shift.');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleEndShift = async () => {
    setShiftLoading(true);
    try {
      await shiftsApi.endShift();
      setShift(null);
      toast.success('Shift closed out.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not end the shift.');
    } finally {
      setShiftLoading(false);
    }
  };

  if (loading) return <Loader label="Loading your workspace…" />;

  const todayTotal = (todayOrders || []).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow={store?.brand}
        title={`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`}
        description={activeBranch ? `Viewing ${activeBranch.name}` : 'No branch selected yet.'}
        actions={
          <Link to="/pos">
            <Button icon={ArrowRight}>Open POS terminal</Button>
          </Link>
        }
      />

      {isBranchStaff && (
        <Ledger className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-text-muted mb-1">Shift status</p>
            {shift ? (
              <p className="text-sm">
                <StatusPill tone="ledger">Open</StatusPill>{' '}
                <span className="text-ink-text-muted ml-1">started {formatDateTime(shift.shiftStart)}</span>
              </p>
            ) : (
              <p className="text-sm"><StatusPill tone="neutral">No open shift</StatusPill></p>
            )}
          </div>
          {shift ? (
            <Button variant="danger" icon={StopCircle} onClick={handleEndShift} loading={shiftLoading}>End shift</Button>
          ) : (
            <Button variant="primary" icon={PlayCircle} onClick={handleStartShift} loading={shiftLoading}>Start shift</Button>
          )}
        </Ledger>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Today's orders" value={todayOrders ? todayOrders.length : '—'} />
        <StatCard label="Today's sales" value={todayOrders ? formatCurrency(todayTotal) : '—'} tone="ledger" />
        <StatCard label="Branches" value={branches.length} />
        <StatCard label="Store status" value={store?.status || '—'} tone={store?.status === 'ACTIVE' ? 'ledger' : 'brass'} />
        <StatCard label="Low stock" value={inventory ? lowStockItems.length : '—'} tone={lowStockItems.length > 0 ? 'brass' : 'ledger'} />
      </div>

      {inventory && (
        <div className={`border rounded-sm px-5 py-4 mb-6 ${lowStockItems.length > 0 ? 'border-receipt-red/30 bg-receipt-red/5' : 'border-hairline bg-paper-raised'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={lowStockItems.length > 0 ? 'text-receipt-red' : 'text-ink-text-muted'} />
              <p className={`text-sm font-medium ${lowStockItems.length > 0 ? 'text-receipt-red' : 'text-ink-text-muted'}`}>
                {lowStockItems.length > 0
                  ? `${lowStockItems.length} product${lowStockItems.length > 1 ? 's' : ''} running low`
                  : `All stock above ${threshold} units`}
              </p>
            </div>
            <button
              onClick={() => setShowThresholdEditor((v) => !v)}
              className="flex items-center gap-1 text-xs text-ink-text-muted hover:text-ledger"
            >
              <Settings2 size={13} /> Alert at {threshold}
            </button>
          </div>

          {showThresholdEditor && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-soft">
              <span className="text-xs text-ink-text-muted">Warn me when stock falls to or below</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={threshold}
                onChange={(e) => handleThresholdChange(e.target.value)}
                className="!w-20 !py-1"
              />
              <span className="text-xs text-ink-text-muted">units. Saved on this device only.</span>
            </div>
          )}

          {lowStockItems.length > 0 && (
            <ul className="text-sm text-ink-text-muted space-y-1">
              {lowStockItems.slice(0, 5).map((inv) => (
                <li key={inv.id} className="flex justify-between">
                  <span>{inv.product?.name || 'Unknown product'}</span>
                  <span className="tabular font-medium text-receipt-red">{inv.quantity} left</span>
                </li>
              ))}
            </ul>
          )}
          {lowStockItems.length > 5 && (
            <Link to="/inventory" className="text-xs text-ledger hover:underline mt-2 inline-block">
              View all {lowStockItems.length} in Inventory →
            </Link>
          )}
        </div>
      )}

      <h2 className="text-sm font-semibold text-ink-text-muted mb-2 mt-8">Recent orders</h2>
      <DataTable
        rows={recentOrders}
        emptyMessage="No orders placed yet for this branch."
        columns={[
          { key: 'id', header: 'Order #', render: (r) => `#${r.id}` },
          { key: 'cashier', header: 'Cashier', render: (r) => r.cashier?.fullName || '—' },
          { key: 'items', header: 'Items', render: (r) => r.items?.length ?? 0 },
          { key: 'paymentType', header: 'Payment', render: (r) => <StatusPill>{r.paymentType}</StatusPill> },
          { key: 'totalAmount', header: 'Total', align: 'right', mono: true, render: (r) => formatCurrency(r.totalAmount) },
          { key: 'createdAt', header: 'Placed', render: (r) => formatDateTime(r.createdAt) },
        ]}
      />
    </div>
  );
}