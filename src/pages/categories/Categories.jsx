import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import { useWorkspace } from '../../store/workspaceContext';
import * as categoriesApi from '../../api/categories';
import { toast } from '../../store/toastStore';

function CategoryForm({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Category name" required>
        <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Beverages" />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>Save category</Button>
    </form>
  );
}

export default function Categories() {
  const { store, loading: workspaceLoading } = useWorkspace();
    const [categories, setCategories] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const load = () => {
      if (!store?.id) return;
      setLoadError(false);
      categoriesApi.getCategoriesByStore(store.id).then(setCategories).catch(() => { setCategories([]); setLoadError(true); });
    };

    useEffect(load, [store?.id]);

  const handleSubmit = async (name) => {
    if (editing) {
      await categoriesApi.updateCategory(editing.id, { name, storeId: store.id });
      toast.success('Category updated.');
    } else {
      await categoriesApi.createCategory({ name, storeId: store.id });
      toast.success('Category added.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await categoriesApi.deleteCategory(deleteTarget.id, { ...deleteTarget });
      toast.success('Category removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete this category.');
    } finally {
      setDeleting(false);
    }
  };

  if (workspaceLoading || categories === null) return <Loader label="Loading categories…" />;

  return (
    <div>
      <PageHeader
        eyebrow={store?.brand}
        title="Categories"
        description="Group products so cashiers can find them fast at the till."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>Add category</Button>}
      />
      <DataTable
        rows={categories}
        emptyMessage="No categories yet. Products need at least one to appear on the POS grid."
        columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit category' : 'Add category'}>
        <CategoryForm initial={editing} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`Products in "${deleteTarget?.name}" will lose their category.`}
      />
    </div>
  );
}
