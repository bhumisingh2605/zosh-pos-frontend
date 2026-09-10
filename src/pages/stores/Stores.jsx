import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { PageHeader, Loader, Ledger, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Select } from '../../components/Field';
import StoreForm from './StoreForm';
import { useAuthStore } from '../../store/authStore';
import { useWorkspace } from '../../store/workspaceContext';
import * as storesApi from '../../api/stores';
import { formatDate } from '../../lib/format';
import { toast } from '../../store/toastStore';

export default function Stores() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'ROLE_ADMIN') return <AllStoresView />;
  return <MyStoreView />;
}

function AllStoresView() {
  const { setActiveStoreId } = useWorkspace();
    const [stores, setStores] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [moderatingId, setModeratingId] = useState(null);

    const load = () => {
      setLoadError(false);
      storesApi.getAllStores().then(setStores).catch(() => { setStores([]); setLoadError(true); });
    };
    useEffect(() => { load(); }, []);

  const moderate = async (id, status) => {
    setModeratingId(id);
    try {
      await storesApi.moderateStore(id, status);
      toast.success(`Store marked ${status.toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update store status.');
    } finally {
      setModeratingId(null);
    }
  };

  if (!stores) return <Loader label="Loading stores…" />;

  return (
    <div>
      <PageHeader eyebrow="Platform" title="All stores" description="Review and moderate every store on the platform." />
      <DataTable
        rows={stores}
        emptyMessage="No stores registered yet."
        onRowClick={(r) => setActiveStoreId(r.id)}
        columns={[
          { key: 'brand', header: 'Store', render: (r) => <span className="font-medium">{r.brand}</span> },
          { key: 'storeType', header: 'Type' },
          { key: 'admin', header: 'Admin', render: (r) => r.storeAdmin?.fullName || '—' },
          { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) },
          { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (r) => (
              <div onClick={(e) => e.stopPropagation()} className="inline-flex">
                <Select
                  value={r.status}
                  disabled={moderatingId === r.id}
                  onChange={(e) => moderate(r.id, e.target.value)}
                  className="!py-1 !text-xs w-32"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="BLOCKED">Blocked</option>
                </Select>
              </div>
            ),
          },
        ]}
      />
      <p className="text-xs text-ink-text-muted mt-3">Click a row to switch your working store context for other pages.</p>
    </div>
  );
}

function MyStoreView() {
  const { store, refresh, loading } = useWorkspace();
  const [editing, setEditing] = useState(false);

  const handleCreate = async (payload) => {
    await storesApi.createStore(payload);
    toast.success('Store created.');
    await refresh();
  };

  const handleUpdate = async (payload) => {
    await storesApi.updateStore(store.id, { ...store, ...payload });
    toast.success('Store details updated.');
    setEditing(false);
    await refresh();
  };

  if (loading) return <Loader label="Loading your store…" />;

  if (!store) {
    return (
      <div>
        <PageHeader eyebrow="Setup" title="Set up your store" description="This is a one-time setup — add branches and staff after." />
        <div className="max-w-lg">
          <Ledger>
            <StoreForm onSubmit={handleCreate} submitLabel="Create store" />
          </Ledger>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Your store"
        title={store.brand}
        description={store.description}
        actions={<Button variant="outline" icon={Pencil} onClick={() => setEditing(true)}>Edit details</Button>}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Ledger>
          <p className="text-xs text-ink-text-muted mb-1">Status</p>
          <StatusPill>{store.status}</StatusPill>
          <p className="text-xs text-ink-text-muted mt-4 mb-1">Store type</p>
          <p className="text-sm">{store.storeType || '—'}</p>
          <p className="text-xs text-ink-text-muted mt-4 mb-1">Store admin</p>
          <p className="text-sm">{store.storeAdmin?.fullName || '—'}</p>
        </Ledger>
        <Ledger>
          <p className="text-xs text-ink-text-muted mb-1">Address</p>
          <p className="text-sm">{store.contact?.address || '—'}</p>
          <p className="text-xs text-ink-text-muted mt-4 mb-1">Phone</p>
          <p className="text-sm tabular">{store.contact?.phone || '—'}</p>
          <p className="text-xs text-ink-text-muted mt-4 mb-1">Contact email</p>
          <p className="text-sm">{store.contact?.email || '—'}</p>
        </Ledger>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit store details">
        <StoreForm initial={store} onSubmit={handleUpdate} submitLabel="Save changes" />
      </Modal>
    </div>
  );
}
