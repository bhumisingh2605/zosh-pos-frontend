import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader, Loader, Ledger, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { Select } from '../../components/Field';
import { useWorkspace } from '../../store/workspaceContext';
import * as ordersApi from '../../api/orders';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { exportToCsv } from '../../lib/csvExport';

export default function Orders() {
  const { activeBranch, loading: workspaceLoading } = useWorkspace();
  const [orders, setOrders] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const load = () => {
    if (!activeBranch?.id) return;
    setLoadError(false);
    const filters = {};
    if (paymentType) filters.paymentType = paymentType;
    if (orderStatus) filters.orderStatus = orderStatus;
    ordersApi.getOrdersByBranch(activeBranch.id, filters).then(setOrders).catch(() => { setOrders([]); setLoadError(true); });
  };

  useEffect(load, [activeBranch?.id, paymentType, orderStatus]);

  const handleExport = () => {
    exportToCsv(`orders-${activeBranch?.name || 'branch'}-${new Date().toISOString().slice(0, 10)}.csv`, orders, [
      { header: 'Order #', value: (r) => r.id },
      { header: 'Customer', value: (r) => r.customer?.fullName || 'Walk-in' },
      { header: 'Cashier', value: (r) => r.cashier?.fullName || '' },
      { header: 'Payment', value: (r) => r.paymentType },
      { header: 'Items', value: (r) => r.items?.length ?? 0 },
      { header: 'Total', value: (r) => r.totalAmount },
      { header: 'Placed', value: (r) => r.createdAt },
    ]);
  };

  if (workspaceLoading || orders === null) return <Loader label="Loading orders…" />;

  return (
    <div>
      <PageHeader
        eyebrow={activeBranch?.name}
        title="Orders"
        description="Every sale rung up at this branch."
        actions={<Button variant="outline" icon={Download} disabled={!orders.length} onClick={handleExport}>Export CSV</Button>}
      />

      {loadError && <LoadError message="Could not load orders for this branch." onRetry={load} />}

      <div className="flex gap-3 mb-4">
        <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-40">
          <option value="">All payments</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
        </Select>
        <Select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
        </Select>
      </div>

      <DataTable
        rows={orders}
        emptyMessage="No orders match these filters."
        onRowClick={setSelected}
        columns={[
          { key: 'id', header: 'Order #', render: (r) => `#${r.id}` },
          { key: 'customer', header: 'Customer', render: (r) => r.customer?.fullName || 'Walk-in' },
          { key: 'cashier', header: 'Cashier', render: (r) => r.cashier?.fullName || '—' },
          { key: 'items', header: 'Items', render: (r) => r.items?.length ?? 0 },
          { key: 'paymentType', header: 'Payment', render: (r) => <StatusPill>{r.paymentType}</StatusPill> },
          { key: 'totalAmount', header: 'Total', align: 'right', mono: true, render: (r) => formatCurrency(r.totalAmount) },
          { key: 'createdAt', header: 'Placed', render: (r) => formatDateTime(r.createdAt) },
        ]}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Order #${selected.id}` : ''}>
        {selected && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <Ledger className="!p-3">
                <p className="text-xs text-ink-text-muted mb-1">Customer</p>
                <p>{selected.customer?.fullName || 'Walk-in'}</p>
              </Ledger>
              <Ledger className="!p-3">
                <p className="text-xs text-ink-text-muted mb-1">Cashier</p>
                <p>{selected.cashier?.fullName || '—'}</p>
              </Ledger>
            </div>
            <div className="border border-dashed border-hairline rounded-sm p-4">
              {selected.items?.map((i) => (
                <div key={i.id} className="flex justify-between text-sm py-1.5 tabular">
                  <span className="text-ink-text-muted">{i.quantity} × {i.product?.name}</span>
                  <span>{formatCurrency(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-2 mt-2 border-t border-hairline tabular">
                <span>Total ({selected.paymentType})</span>
                <span>{formatCurrency(selected.totalAmount)}</span>
              </div>
            </div>
            <p className="text-xs text-ink-text-muted mt-3">Placed {formatDateTime(selected.createdAt)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}