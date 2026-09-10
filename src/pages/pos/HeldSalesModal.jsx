import { Play, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { formatCurrency, formatTime } from '../../lib/format';

export default function HeldSalesModal({ open, onClose, heldSales, onResume, onDiscard }) {
  return (
    <Modal open={open} onClose={onClose} title="Held sales" width="max-w-md">
      {heldSales.length === 0 ? (
        <p className="text-sm text-ink-text-muted text-center py-8">No sales on hold.</p>
      ) : (
        <div className="space-y-3">
          {heldSales.map((h) => {
            const total = h.cart.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
            return (
              <div key={h.id} className="border border-hairline rounded-sm p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{h.customerName}</p>
                  <p className="text-xs text-ink-text-muted">
                    {h.cart.length} item{h.cart.length === 1 ? '' : 's'} · {formatCurrency(total)} · held at {formatTime(h.heldAt)}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => onResume(h.id)}
                    className="p-1.5 text-ledger hover:bg-ledger-soft rounded-sm"
                    title="Resume this sale"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => onDiscard(h.id)}
                    className="p-1.5 text-receipt-red hover:bg-receipt-red-soft rounded-sm"
                    title="Discard this sale"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}