import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Field, Input, Select, Textarea } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import { useWorkspace } from '../../store/workspaceContext';
import * as refundsApi from '../../api/refunds';
import * as ordersApi from '../../api/orders';
import * as shiftsApi from '../../api/shifts';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { toast } from '../../store/toastStore';

function RefundForm({ orders, onSubmit }) {
  const [form, setForm] = useState({ orderId: orders[0]?.id || '', reason: '', amount: '', paymentType: 'CASH' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedOrder = orders.find((o) => o.id === Number(form.orderId));

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ ...form, orderId: Number(form.orderId), amount: Number(form.amount) });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not process the refund.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Order" required>
        <Select required value={form.orderId} onChange={update('orderId')}>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>#{o.id} — {o.customer?.fullName || 'Walk-in'} — {formatCurrency(o.totalAmount)}</option>
          ))}
        </Select>
      </Field>
      {selectedOrder && <p className="text-xs text-ink-text-muted -mt-2">Order total was {formatCurrency(selectedOrder.totalAmount)}.</p>}
      <Field label="Refund amount (₹)" required>
        <Input required type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} />
      </Field>
      <Field label="Refund via">
        <Select value={form.paymentType} onChange={update('paymentType')}>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
        </Select>
      </Field>
      <Field label="Reason" required>
        <Textarea required value={form.reason} onChange={update('reason')} placeholder="Why is this being refunded?" />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>Process refund</Button>
    </form>
  );
}

export default function Refunds() {
  const { activeBranch, loading: workspaceLoading } = useWorkspace();
    const [refunds, setRefunds] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loadError, setLoadError] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const load = () => {
      if (!activeBranch?.id) return;
      setLoadError(false);
      refundsApi.getRefundsByBranch(activeBranch.id).then(setRefunds).catch(() => { setRefunds([]); setLoadError(true); });
      ordersApi.getOrdersByBranch(activeBranch.id, {}).then(setRecentOrders).catch(() => { setRecentOrders([]); setLoadError(true); });
    };

  useEffect(load, [activeBranch?.id]);

  const handleSubmit = async (form) => {
    let shiftReportId;
    try {
      const shift = await shiftsApi.getCurrentShift();
      shiftReportId = shift?.id;
    } catch { /* no open shift, submit without it */ }
    await refundsApi.createRefund({ ...form, branchId: activeBranch.id, shiftReportId });
    toast.success('Refund processed.');
    setModalOpen(false);
    load();
  };

  if (workspaceLoading || refunds === null) return <Loader label="Loading refunds…" />;

  return (
    <div>
      <PageHeader
        eyebrow={activeBranch?.name}
        title="Refunds"
        description="Money returned to customers at this branch."
        actions={<Button icon={Plus} onClick={() => setModalOpen(true)} disabled={!recentOrders.length}>Process refund</Button>}
      />
      <DataTable
        rows={refunds}
        emptyMessage="No refunds recorded yet."
        columns={[
          { key: 'order', header: 'Order', render: (r) => `#${r.orderId ?? r.order?.id}` },
          { key: 'cashier', header: 'Processed by', render: (r) => r.cashier?.fullName || '—' },
          { key: 'reason', header: 'Reason', render: (r) => <span className="text-ink-text-muted">{r.reason}</span> },
          { key: 'paymentType', header: 'Via', render: (r) => <StatusPill>{r.paymentType}</StatusPill> },
          { key: 'amount', header: 'Amount', align: 'right', mono: true, render: (r) => formatCurrency(r.amount) },
          { key: 'createdAt', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Process a refund">
        <RefundForm orders={recentOrders} onSubmit={handleSubmit} />
      </Modal>
    </div>
  );
}
