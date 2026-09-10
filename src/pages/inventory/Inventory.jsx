import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, PackageX } from 'lucide-react';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import { useWorkspace } from '../../store/workspaceContext';
import * as inventoryApi from '../../api/inventory';
import * as productsApi from '../../api/products';
import { formatDateTime } from '../../lib/format';
import { toast } from '../../store/toastStore';

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

function getStoredThreshold() {
  const saved = Number(localStorage.getItem('lowStockThreshold'));
  return saved > 0 ? saved : DEFAULT_LOW_STOCK_THRESHOLD;
}

function InventoryForm({ initial, products, onSubmit }) {
  const [form, setForm] = useState({
    productId: initial?.product?.id || '',
    quantity: initial?.quantity ?? '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ productId: Number(form.productId), quantity: Number(form.quantity) });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save inventory.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Product" required>
        <Select
          required
          disabled={!!initial}
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        >
          <option value="" disabled>Select a product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </Select>
      </Field>
      <Field label="Quantity in stock" required>
        <Input required type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>Save stock level</Button>
    </form>
  );
}

export default function Inventory() {
  const { store, activeBranch, branches, loading: workspaceLoading } = useWorkspace();
  const [inventory, setInventory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [threshold, setThreshold] = useState(getStoredThreshold);

  const load = () => {
    if (!activeBranch?.id) return;
    setLoadError(false);
    inventoryApi.getInventoryByBranch(activeBranch.id).then(setInventory).catch(() => { setInventory([]); setLoadError(true); });
  };

  useEffect(load, [activeBranch?.id]);
  useEffect(() => {
    if (store?.id) productsApi.getProductsByStoreId(store.id).then(setProducts).catch(() => setProducts([]));
  }, [store?.id]);

  const handleSubmit = async (form) => {
    if (editing) {
      await inventoryApi.updateInventory(editing.id, { ...form, branchId: activeBranch.id });
      toast.success('Stock level updated.');
    } else {
      await inventoryApi.createInventory({ ...form, branchId: activeBranch.id });
      toast.success('Product added to inventory.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await inventoryApi.deleteInventory(deleteTarget.id);
      toast.success('Removed from inventory.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove this record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleThresholdChange = (value) => {
    const num = Number(value) || DEFAULT_LOW_STOCK_THRESHOLD;
    setThreshold(num);
    localStorage.setItem('lowStockThreshold', String(num));
  };

  if (workspaceLoading || (!branches.length && !workspaceLoading)) {
    return workspaceLoading ? <Loader label="Loading inventory…" /> : (
      <div>
        <PageHeader title="Inventory" description="Add a branch first to start tracking stock." />
      </div>
    );
  }
  if (inventory === null) return <Loader label="Loading inventory…" />;

  const lowStockItems = inventory.filter((r) => r.quantity <= threshold);

  return (
    <div>
      <PageHeader
        eyebrow={activeBranch?.name}
        title="Inventory"
        description="Stock on hand for the selected branch."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>Add stock</Button>}
      />

      {loadError && <LoadError message="Could not load inventory for this branch." onRetry={load} />}

      {lowStockItems.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brass/40 bg-brass/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink-text">
            <PackageX size={16} className="text-brass shrink-0" />
            <span>
              <strong>{lowStockItems.length}</strong> product{lowStockItems.length > 1 ? 's are' : ' is'} at or below the low-stock threshold
              {': '}
              {lowStockItems.slice(0, 3).map((r) => r.product?.name).join(', ')}
              {lowStockItems.length > 3 ? `, +${lowStockItems.length - 3} more` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-ink-text-muted">Alert below</label>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => handleThresholdChange(e.target.value)}
              className="w-16 rounded border border-brass/40 bg-white px-2 py-1 text-sm"
            />
          </div>
        </div>
      )}

      <DataTable
        rows={inventory}
        emptyMessage="No products stocked at this branch yet."
        columns={[
          { key: 'product', header: 'Product', render: (r) => (
            <div>
              <p className="font-medium">{r.product?.name}</p>
              <p className="text-xs text-ink-text-muted tabular">{r.product?.sku}</p>
            </div>
          ) },
          { key: 'quantity', header: 'Quantity', mono: true, render: (r) => (
            <span className="inline-flex items-center gap-1.5">
              {r.quantity}
              {r.quantity <= threshold && <AlertTriangle size={13} className="text-brass" />}
            </span>
          ) },
          { key: 'lastUpdate', header: 'Last updated', render: (r) => formatDateTime(r.lastUpdate) },
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Adjust stock' : 'Add stock'}>
        <InventoryForm initial={editing} products={products} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`"${deleteTarget?.product?.name}" will no longer show as stocked here.`}
      />
    </div>
  );
}