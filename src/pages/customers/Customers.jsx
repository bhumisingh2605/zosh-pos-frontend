import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, History } from 'lucide-react';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import * as customersApi from '../../api/customers';
import * as ordersApi from '../../api/orders';
import { formatDate, formatDateTime, formatCurrency } from '../../lib/format';
import { toast } from '../../store/toastStore';

function CustomerForm({ initial, onSubmit }) {
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Full name" required>
        <Input required value={form.fullName} onChange={update('fullName')} placeholder="Rohan Mehta" />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChange={update('phone')} placeholder="98765 43210" />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={update('email')} placeholder="customer@example.com" />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>Save customer</Button>
    </form>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [historyOrders, setHistoryOrders] = useState(null);

  const load = () => {
    setLoadError(false);
    customersApi.getAllCustomers().then(setCustomers).catch(() => { setCustomers([]); setLoadError(true); });
  };
  useEffect(load, []);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return load();
    try {
      setLoadError(false);
      setCustomers(await customersApi.searchCustomers(query.trim()));
    } catch {
      setLoadError(true);
    }
  };

  const handleSubmit = async (form) => {
    if (editing) {
      await customersApi.updateCustomer(editing.id, form);
      toast.success('Customer updated.');
    } else {
      await customersApi.createCustomer(form);
      toast.success('Customer added.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await customersApi.deleteCustomer(deleteTarget.id);
      toast.success('Customer removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete this customer.');
    } finally {
      setDeleting(false);
    }
  };

  const openHistory = (customer) => {
    setHistoryCustomer(customer);
    setHistoryOrders(null);
    ordersApi.getOrdersByCustomer(customer.id).then(setHistoryOrders).catch(() => setHistoryOrders([]));
  };

  if (customers === null) return <Loader label="Loading customers…" />;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People who've shopped at your store."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>Add customer</Button>}
      />

      <form onSubmit={runSearch} className="mb-4 flex gap-2 max-w-sm">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone, or email…" />
        <Button type="submit" variant="outline" icon={Search}>Search</Button>
      </form>

      {loadError ? (
        <LoadError message="Couldn't load customers." onRetry={load} />
      ) : (
        <DataTable
          rows={customers}
          emptyMessage="No customers yet."
          columns={[
            { key: 'fullName', header: 'Name', render: (r) => <span className="font-medium">{r.fullName}</span> },
            { key: 'phone', header: 'Phone', mono: true, render: (r) => r.phone || '—' },
            { key: 'email', header: 'Email', render: (r) => r.email || '—' },
            { key: 'createdAt', header: 'Since', render: (r) => formatDate(r.createdAt) },
            {
              key: 'actions', header: '', align: 'right',
              render: (r) => (
                <div className="inline-flex gap-1">
                  <button onClick={() => openHistory(r)} className="p-1.5 text-ink-text-muted hover:text-ledger"><History size={15} /></button>
                  <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-ink-text-muted hover:text-ledger"><Pencil size={15} /></button>
                  <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-ink-text-muted hover:text-receipt-red"><Trash2 size={15} /></button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit customer' : 'Add customer'}>
        <CustomerForm initial={editing} onSubmit={handleSubmit} />
      </Modal>

      <Modal
        open={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        title={historyCustomer ? `${historyCustomer.fullName}'s orders` : ''}
        width="max-w-lg"
      >
        {historyOrders === null ? (
          <Loader label="Loading orders…" />
        ) : historyOrders.length === 0 ? (
          <p className="text-sm text-ink-text-muted text-center py-8">No orders from this customer yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto -mx-1 px-1">
            {historyOrders.map((o) => (
              <div key={o.id} className="flex justify-between items-center py-2.5 border-b border-hairline text-sm">
                <div>
                  <p className="font-medium">Order #{o.id}</p>
                  <p className="text-xs text-ink-text-muted">{formatDateTime(o.createdAt)} · {o.items?.length ?? 0} items</p>
                </div>
                <span className="tabular font-medium">{formatCurrency(o.totalAmount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1 text-sm font-semibold">
              <span>Lifetime total</span>
              <span className="tabular">{formatCurrency(historyOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}</span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`"${deleteTarget?.fullName}" and their order history reference will be removed.`}
      />
    </div>
  );
}