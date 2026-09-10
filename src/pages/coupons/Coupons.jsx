import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Loader, ErrorNote } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { useWorkspace } from '../../store/workspaceContext';
import * as couponsApi from '../../api/coupons';
import { formatCurrency } from '../../lib/format';
import { toast } from '../../store/toastStore';

const emptyForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  expiryDate: '',
  active: true,
};

function CouponForm({ initial, onSubmit }) {
  const [form, setForm] = useState(() => (initial
    ? {
        code: initial.code || '',
        discountType: initial.discountType || 'PERCENTAGE',
        discountValue: initial.discountValue ?? '',
        minOrderAmount: initial.minOrderAmount ?? '',
        maxDiscountAmount: initial.maxDiscountAmount ?? '',
        usageLimit: initial.usageLimit ?? '',
        expiryDate: initial.expiryDate ? initial.expiryDate.slice(0, 10) : '',
        active: initial.active ?? true,
      }
    : emptyForm));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: form.discountValue === '' ? null : Number(form.discountValue),
        minOrderAmount: form.minOrderAmount === '' ? null : Number(form.minOrderAmount),
        maxDiscountAmount: form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        expiryDate: form.expiryDate ? `${form.expiryDate}T23:59:59` : null,
        active: form.active,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the coupon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />

      <Field label="Coupon code" required>
        <Input
          required
          autoFocus
          value={form.code}
          onChange={(e) => update('code', e.target.value.toUpperCase())}
          placeholder="WELCOME10"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount type" required>
          <Select value={form.discountType} onChange={(e) => update('discountType', e.target.value)}>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FLAT">Flat amount</option>
          </Select>
        </Field>
        <Field label={form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount'} required>
          <Input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.discountValue}
            onChange={(e) => update('discountValue', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Minimum order amount" hint="Optional">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.minOrderAmount}
            onChange={(e) => update('minOrderAmount', e.target.value)}
          />
        </Field>
        <Field
          label="Max discount cap"
          hint={form.discountType === 'PERCENTAGE' ? 'Optional — caps a % discount' : 'Not used for flat discounts'}
        >
          <Input
            type="number"
            min="0"
            step="0.01"
            disabled={form.discountType !== 'PERCENTAGE'}
            value={form.maxDiscountAmount}
            onChange={(e) => update('maxDiscountAmount', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Usage limit" hint="Optional — total redemptions allowed">
          <Input
            type="number"
            min="0"
            step="1"
            value={form.usageLimit}
            onChange={(e) => update('usageLimit', e.target.value)}
          />
        </Field>
        <Field label="Expiry date" hint="Optional">
          <Input type="date" value={form.expiryDate} onChange={(e) => update('expiryDate', e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-text">
        <input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} />
        Active
      </label>

      <Button type="submit" className="w-full" loading={loading}>Save coupon</Button>
    </form>
  );
}

export default function Coupons() {
  const { store, loading: workspaceLoading } = useWorkspace();
  const [coupons, setCoupons] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!store?.id) return;
    couponsApi.getCouponsByStore(store.id).then(setCoupons).catch(() => setCoupons([]));
  };

  useEffect(load, [store?.id]);

  const handleSubmit = async (payload) => {
    if (editing) {
      await couponsApi.updateCoupon(editing.id, payload);
      toast.success('Coupon updated.');
    } else {
      await couponsApi.createCoupon({ ...payload, storeId: store.id });
      toast.success('Coupon created.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await couponsApi.deleteCoupon(deleteTarget.id);
      toast.success('Coupon removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete this coupon.');
    } finally {
      setDeleting(false);
    }
  };

  if (workspaceLoading || coupons === null) return <Loader label="Loading coupons…" />;

  return (
    <div>
      <PageHeader
        eyebrow={store?.brand}
        title="Coupons"
        description="Create discount codes cashiers can apply at checkout."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>Add coupon</Button>}
      />
      <DataTable
        rows={coupons}
        emptyMessage="No coupons yet. Create one to offer discounts at checkout."
        columns={[
          { key: 'code', header: 'Code', render: (r) => <span className="font-medium tabular">{r.code}</span> },
          {
            key: 'discount',
            header: 'Discount',
            render: (r) => (r.discountType === 'PERCENTAGE'
              ? `${r.discountValue}%${r.maxDiscountAmount ? ` (up to ${formatCurrency(r.maxDiscountAmount)})` : ''}`
              : formatCurrency(r.discountValue)),
          },
          {
            key: 'minOrderAmount',
            header: 'Min. order',
            render: (r) => (r.minOrderAmount ? formatCurrency(r.minOrderAmount) : '—'),
          },
          {
            key: 'usage',
            header: 'Used',
            render: (r) => `${r.usedCount ?? 0}${r.usageLimit ? ` / ${r.usageLimit}` : ''}`,
          },
          {
            key: 'expiryDate',
            header: 'Expires',
            render: (r) => (r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'Never'),
          },
          {
            key: 'active',
            header: 'Status',
            render: (r) => (
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? 'bg-ledger-soft text-ledger' : 'bg-hairline-soft text-ink-text-muted'}`}>
                {r.active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (r) => (
              <div className="inline-flex gap-1">
                <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-ink-text-muted hover:text-ledger">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-ink-text-muted hover:text-receipt-red">
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit coupon' : 'Add coupon'}>
        <CouponForm initial={editing} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`Coupon "${deleteTarget?.code}" will no longer be usable at checkout.`}
      />
    </div>
  );
}
