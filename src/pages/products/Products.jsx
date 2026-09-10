import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { PageHeader, Loader, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { ErrorNote } from '../../components/Layout';
import ImageUpload from '../../components/ImageUpload';
import { useWorkspace } from '../../store/workspaceContext';
import * as productsApi from '../../api/products';
import * as categoriesApi from '../../api/categories';
import { formatCurrency } from '../../lib/format';
import { toast } from '../../store/toastStore';

function ProductForm({ initial, categories, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    sku: initial?.sku || '',
    barcode: initial?.barcode || '',
    description: initial?.description || '',
    mrp: initial?.mrp ?? '',
    sellingPrice: initial?.sellingPrice ?? '',
    brand: initial?.brand || '',
    image: initial?.image || '',
    categoryId: initial?.category?.id || initial?.categoryId || categories[0]?.id || '',
    taxRatePercent: initial?.taxRatePercent ?? 5,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        mrp: Number(form.mrp),
        sellingPrice: Number(form.sellingPrice),
        categoryId: Number(form.categoryId),
        taxRatePercent: Number(form.taxRatePercent) || 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Product name" required className="col-span-2">
          <Input required value={form.name} onChange={update('name')} placeholder="Men's Cotton Casual Shirt" />
        </Field>
        <Field label="SKU" required>
          <Input required value={form.sku} onChange={update('sku')} placeholder="MW-SHIRT-BLU-M" />
        </Field>
        <Field label="Barcode">
          <Input value={form.barcode} onChange={update('barcode')} placeholder="Scan or type barcode" />
        </Field>
        <Field label="Brand">
          <Input value={form.brand} onChange={update('brand')} placeholder="Citi Style" />
        </Field>
        <Field label="Tax rate (%)" required>
          <Input required type="number" min="0" step="0.01" value={form.taxRatePercent} onChange={update('taxRatePercent')} placeholder="5" />
        </Field>
        <Field label="MRP (₹)" required>
          <Input required type="number" min="0" step="0.01" value={form.mrp} onChange={update('mrp')} />
        </Field>
        <Field label="Selling price (₹)" required>
          <Input required type="number" min="0" step="0.01" value={form.sellingPrice} onChange={update('sellingPrice')} />
        </Field>
        <Field label="Category" required className="col-span-2">
          <Select required value={form.categoryId} onChange={update('categoryId')}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Product photo" className="col-span-2">
          <ImageUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
        </Field>
        <Field label="Description" className="col-span-2">
          <Input value={form.description} onChange={update('description')} placeholder="Short description" />
        </Field>
      </div>
      <Button type="submit" className="w-full" loading={loading}>Save product</Button>
    </form>
  );
}

export default function Products() {
  const { store, loading: workspaceLoading } = useWorkspace();
   const [products, setProducts] = useState(null);
   const [categories, setCategories] = useState([]);
   const [loadError, setLoadError] = useState(false);
   const [query, setQuery] = useState('');
   const [modalOpen, setModalOpen] = useState(false);
   const [editing, setEditing] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [deleting, setDeleting] = useState(false);

   const load = () => {
     if (!store?.id) return;
     setLoadError(false);
     productsApi.getProductsByStoreId(store.id).then(setProducts).catch(() => { setProducts([]); setLoadError(true); });
     categoriesApi.getCategoriesByStore(store.id).then(setCategories).catch(() => { setCategories([]); setLoadError(true); });
   };

  useEffect(load, [store?.id]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!store?.id) return;
    if (!query.trim()) return load();
    const results = await productsApi.searchProducts(store.id, query.trim());
    setProducts(results);
  };

  const handleSubmit = async (form) => {
    if (editing) {
      await productsApi.updateProduct(editing.id, form);
      toast.success('Product updated.');
    } else {
      await productsApi.createProduct({ ...form, storeId: store.id });
      toast.success('Product added.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.deleteProduct(deleteTarget.id);
      toast.success('Product removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete this product.');
    } finally {
      setDeleting(false);
    }
  };

  if (workspaceLoading || products === null) return <Loader label="Loading products…" />;

  const canAdd = categories.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={store?.brand}
        title="Products"
        description="Your catalog, shared across every branch."
        actions={
          <Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }} disabled={!canAdd}>
            Add product
          </Button>
        }
      />
      {!canAdd && (
        <p className="text-sm text-brass-soft bg-brass-soft text-[#8a6a1c] border border-brass/30 rounded-sm px-3 py-2 mb-4">
          Add a category first — products need one to be sellable.
        </p>
      )}

      <form onSubmit={runSearch} className="mb-4 flex gap-2 max-w-sm">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, SKU, or brand…" />
        <Button type="submit" variant="outline" icon={Search}>Search</Button>
      </form>

      <DataTable
        rows={products}
        emptyMessage="No products yet."
        columns={[
          {
            key: 'image', header: '', render: (r) => (
              r.image
                ? <img src={r.image} alt={r.name} className="h-10 w-10 rounded-sm object-cover border border-brass/30" />
                : <div className="h-10 w-10 rounded-sm bg-ledger-bg border border-brass/30" />
            ),
          },
          { key: 'name', header: 'Product', render: (r) => (
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-ink-text-muted tabular">{r.sku}</p>
            </div>
          ) },
          { key: 'category', header: 'Category', render: (r) => r.category?.name || '—' },
          { key: 'brand', header: 'Brand', render: (r) => r.brand || '—' },
          { key: 'mrp', header: 'MRP', align: 'right', mono: true, render: (r) => formatCurrency(r.mrp) },
          { key: 'sellingPrice', header: 'Selling price', align: 'right', mono: true, render: (r) => formatCurrency(r.sellingPrice) },
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit product' : 'Add product'} width="max-w-xl">
        <ProductForm initial={editing} categories={categories} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`"${deleteTarget?.name}" will no longer be sellable at any branch.`}
      />
    </div>
  );
}