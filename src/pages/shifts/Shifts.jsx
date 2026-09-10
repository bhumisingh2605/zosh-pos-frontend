import { useEffect, useState } from 'react';
import { PageHeader, Loader, Ledger, LoadError } from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import Modal from '../../components/Modal';
import { useWorkspace } from '../../store/workspaceContext';
import * as shiftsApi from '../../api/shifts';
import { formatCurrency, formatDateTime } from '../../lib/format';

export default function Shifts() {
  const { activeBranch, loading: workspaceLoading } = useWorkspace();
    const [shifts, setShifts] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [selected, setSelected] = useState(null);

    const load = () => {
      if (!activeBranch?.id) return;
      setLoadError(false);
      shiftsApi.getShiftReportsByBranch(activeBranch.id).then(setShifts).catch(() => { setShifts([]); setLoadError(true); });
    };

    useEffect(load, [activeBranch?.id]);

  if (workspaceLoading || shifts === null) return <Loader label="Loading shift reports…" />;

  return (
    <div>
      <PageHeader eyebrow={activeBranch?.name} title="Shift reports" description="A ledger of every cashier shift at this branch." />
      <DataTable
        rows={shifts}
        emptyMessage="No shifts recorded yet."
        onRowClick={setSelected}
        columns={[
          { key: 'cashier', header: 'Cashier', render: (r) => r.cashier?.fullName || '—' },
          { key: 'shiftStart', header: 'Started', render: (r) => formatDateTime(r.shiftStart) },
          { key: 'shiftEnd', header: 'Ended', render: (r) => r.shiftEnd ? formatDateTime(r.shiftEnd) : <StatusPill tone="brass">Open</StatusPill> },
          { key: 'totalOrders', header: 'Orders', align: 'right', mono: true },
          { key: 'totalSales', header: 'Sales', align: 'right', mono: true, render: (r) => formatCurrency(r.totalSales) },
          { key: 'netSale', header: 'Net', align: 'right', mono: true, render: (r) => formatCurrency(r.netSale) },
        ]}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Shift summary" width="max-w-xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Ledger className="!p-3 text-center">
                <p className="text-xs text-ink-text-muted mb-1">Orders</p>
                <p className="text-lg font-semibold tabular">{selected.totalOrders}</p>
              </Ledger>
              <Ledger className="!p-3 text-center">
                <p className="text-xs text-ink-text-muted mb-1">Sales</p>
                <p className="text-lg font-semibold tabular text-ledger">{formatCurrency(selected.totalSales)}</p>
              </Ledger>
              <Ledger className="!p-3 text-center">
                <p className="text-xs text-ink-text-muted mb-1">Refunds</p>
                <p className="text-lg font-semibold tabular text-receipt-red">{formatCurrency(selected.totalRefunds)}</p>
              </Ledger>
            </div>

            {selected.paymentSummaries?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-text-muted mb-2">Payment breakdown</p>
                <div className="border border-hairline rounded-sm divide-y divide-hairline-soft">
                  {selected.paymentSummaries.map((p, idx) => (
                    <div key={idx} className="flex justify-between px-3 py-2 text-sm">
                      <span>{p.type}</span>
                      <span className="tabular">{formatCurrency(p.totalAmount)} · {p.transactionCount} txns</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.topSellingProducts?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-text-muted mb-2">Top sellers</p>
                <div className="border border-hairline rounded-sm divide-y divide-hairline-soft">
                  {selected.topSellingProducts.map((p) => (
                    <div key={p.id} className="flex justify-between px-3 py-2 text-sm">
                      <span>{p.name}</span>
                      <span className="tabular text-ink-text-muted">{formatCurrency(p.sellingPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
