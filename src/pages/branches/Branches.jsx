import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Loader } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import { useWorkspace } from '../../store/workspaceContext';
import * as branchesApi from '../../api/branches';
import { formatTime } from '../../lib/format';
import { toast } from '../../store/toastStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function BranchForm({ initial, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    address: initial?.address || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    openTime: initial?.openTime?.slice(0, 5) || '09:00',
    closeTime: initial?.closeTime?.slice(0, 5) || '21:00',
    workingDays: initial?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day) ? f.workingDays.filter((d) => d !== day) : [...f.workingDays, day],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the branch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Branch name" required>
        <Input required value={form.name} onChange={update('name')} placeholder="Downtown branch" />
      </Field>
      <Field label="Address">
        <Input value={form.address} onChange={update('address')} placeholder="45 High Street" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input value={form.phone} onChange={update('phone')} placeholder="98765 43210" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={update('email')} placeholder="branch@example.com" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Opens at">
          <Input type="time" value={form.openTime} onChange={update('openTime')} />
        </Field>
        <Field label="Closes at">
          <Input type="time" value={form.closeTime} onChange={update('closeTime')} />
        </Field>
      </div>
      <Field label="Working days">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDay(d)}
              className={`px-2.5 py-1 rounded-sm text-xs border ${
                form.workingDays.includes(d)
                  ? 'bg-ledger text-white border-ledger-dark'
                  : 'bg-paper-raised text-ink-text-muted border-hairline'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Field>
      <Button type="submit" className="w-full" loading={loading}>Save branch</Button>
    </form>
  );
}

export default function Branches() {
  const { store, branches, loading, refresh } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditingBranch(null); setModalOpen(true); };
  const openEdit = (b) => { setEditingBranch(b); setModalOpen(true); };

  const handleSubmit = async (form) => {
    if (editingBranch) {
      await branchesApi.updateBranch(editingBranch.id, { ...form, storeId: store.id });
      toast.success('Branch updated.');
    } else {
      await branchesApi.createBranch({ ...form, storeId: store.id });
      toast.success('Branch added.');
    }
    setModalOpen(false);
    refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await branchesApi.deleteBranch(deleteTarget.id);
      toast.success('Branch removed.');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete this branch.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader label="Loading branches…" />;

  return (
    <div>
      <PageHeader
        eyebrow={store?.brand}
        title="Branches"
        description="Every physical location under this store."
        actions={<Button icon={Plus} onClick={openCreate}>Add branch</Button>}
      />
      <DataTable
        rows={branches}
        emptyMessage="No branches yet. Add your first one to start selling."
        columns={[
          { key: 'name', header: 'Branch', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'address', header: 'Address', render: (r) => r.address || '—' },
          { key: 'hours', header: 'Hours', mono: true, render: (r) => `${formatTime(r.openTime)} – ${formatTime(r.closeTime)}` },
          { key: 'manager', header: 'Manager', render: (r) => r.manager?.fullName || '—' },
          {
            key: 'actions', header: '', align: 'right',
            render: (r) => (
              <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(r)} className="p-1.5 text-ink-text-muted hover:text-ledger"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-ink-text-muted hover:text-receipt-red"><Trash2 size={15} /></button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingBranch ? 'Edit branch' : 'Add branch'}>
        <BranchForm initial={editingBranch} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`This removes "${deleteTarget?.name}" and unlinks its inventory and staff assignments.`}
      />
    </div>
  );
}
