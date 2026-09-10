import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { useWorkspace } from '../../store/workspaceContext';
import * as employeesApi from '../../api/employees';
import { roleLabel, formatDate } from '../../lib/format';
import { toast } from '../../store/toastStore';

const BRANCH_ROLE_OPTIONS = [
  { value: 'ROLE_BRANCH_MANAGER', label: 'Branch manager' },
  { value: 'ROLE_BRANCH_CASHIER', label: 'Cashier' },
];
const STORE_ROLE_OPTIONS = [
  { value: 'ROLE_STORE_MANAGER', label: 'Store manager' },
  ...BRANCH_ROLE_OPTIONS,
];

function EmployeeForm({ initial, branches, scopeIsStore, onSubmit }) {
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    password: '',
    role: initial?.role || (scopeIsStore ? 'ROLE_STORE_MANAGER' : 'ROLE_BRANCH_CASHIER'),
    branchId: initial?.branchId || branches[0]?.id || '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const needsBranch = scopeIsStore && form.role !== 'ROLE_STORE_MANAGER';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ ...form, branchId: needsBranch ? Number(form.branchId) : undefined });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this employee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Full name" required>
        <Input required value={form.fullName} onChange={update('fullName')} placeholder="Meera Iyer" />
      </Field>
      <Field label="Email" required>
        <Input type="email" required disabled={!!initial} value={form.email} onChange={update('email')} placeholder="employee@example.com" />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChange={update('phone')} placeholder="98765 43210" />
      </Field>
      {!initial && (
        <Field label="Temporary password" required hint="They can change this after logging in.">
          <Input type="password" required minLength={6} value={form.password} onChange={update('password')} />
        </Field>
      )}
      <Field label="Role" required>
        <Select value={form.role} onChange={update('role')}>
          {(scopeIsStore ? STORE_ROLE_OPTIONS : BRANCH_ROLE_OPTIONS).map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </Select>
      </Field>
      {needsBranch && (
        <Field label="Branch" required>
          <Select required value={form.branchId} onChange={update('branchId')}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
      )}
      <Button type="submit" className="w-full" loading={loading}>Save employee</Button>
    </form>
  );
}

export default function Employees() {
  const user = useAuthStore((s) => s.user);
  const { store, branches, activeBranch, loading: workspaceLoading } = useWorkspace();
  const scopeIsStore = ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER'].includes(user?.role);

   const [employees, setEmployees] = useState(null);
   const [loadError, setLoadError] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [editing, setEditing] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [deleting, setDeleting] = useState(false);

   const load = () => {
     setLoadError(false);
     if (scopeIsStore && store?.id) {
       employeesApi.getStoreEmployees(store.id).then(setEmployees).catch(() => { setEmployees([]); setLoadError(true); });
     } else if (!scopeIsStore && activeBranch?.id) {
       employeesApi.getBranchEmployees(activeBranch.id).then(setEmployees).catch(() => { setEmployees([]); setLoadError(true); });
     }
   };

  useEffect(load, [store?.id, activeBranch?.id, scopeIsStore]);

  const handleSubmit = async (form) => {
    if (editing) {
      await employeesApi.updateEmployee(editing.id, form);
      toast.success('Employee updated.');
    } else if (form.branchId) {
      await employeesApi.createBranchEmployee(form.branchId, form);
      toast.success('Employee added to branch.');
    } else {
      await employeesApi.createStoreEmployee(store.id, form);
      toast.success('Employee added.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await employeesApi.deleteEmployee(deleteTarget.id, deleteTarget);
      toast.success('Employee removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove this employee.');
    } finally {
      setDeleting(false);
    }
  };

  if (workspaceLoading || employees === null) return <Loader label="Loading employees…" />;

  return (
    <div>
      <PageHeader
        eyebrow={scopeIsStore ? store?.brand : activeBranch?.name}
        title="Employees"
        description={scopeIsStore ? 'Everyone with access to this store, across all branches.' : 'Staff at your branch.'}
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>Add employee</Button>}
      />
      <DataTable
        rows={employees}
        emptyMessage="No employees added yet."
        columns={[
          { key: 'fullName', header: 'Name', render: (r) => <span className="font-medium">{r.fullName}</span> },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role', render: (r) => <StatusPill tone="neutral">{roleLabel(r.role)}</StatusPill> },
          { key: 'lastLogin', header: 'Last login', render: (r) => formatDate(r.lastLogin) },
          {
            key: 'actions', header: '', align: 'right',
            render: (r) => (
              <div className="inline-flex gap-1">
                <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-ink-text-muted hover:text-ledger"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-ink-text-muted hover:text-receipt-red"><Trash2 size={15} /></button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit employee' : 'Add employee'}>
        <EmployeeForm initial={editing} branches={branches} scopeIsStore={scopeIsStore} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`"${deleteTarget?.fullName}" will lose access immediately.`}
      />
    </div>
  );
}
