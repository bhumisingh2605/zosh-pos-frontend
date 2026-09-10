import { useState } from 'react';
import { Minus, Plus, X, Percent } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { DISCOUNT_TYPES } from '../../lib/billing';

export default function CartLine({ item, onQtyChange, onRemove, onDiscountChange }) {
  const [discountOpen, setDiscountOpen] = useState(false);
  const hasDiscount = item.discountType && item.discountType !== DISCOUNT_TYPES.NONE && Number(item.discountValue) > 0;

  const lineGross = item.sellingPrice * item.quantity;
  const lineDiscount = hasDiscount
    ? item.discountType === DISCOUNT_TYPES.PERCENT
      ? lineGross * (Math.min(Number(item.discountValue), 100) / 100)
      : Math.min(Number(item.discountValue), lineGross)
    : 0;

  return (
    <div className="py-2.5 border-b border-dashed border-ink-line">
      <div className="flex items-start gap-3">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-9 h-9 rounded-sm object-cover shrink-0 border border-ink-line"
          />
        ) : (
          <div className="w-9 h-9 rounded-sm bg-ink-line shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-paper truncate">{item.name}</p>
          <p className="text-xs text-paper/40 tabular mt-0.5">{formatCurrency(item.sellingPrice)} each</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onQtyChange(Math.max(1, item.quantity - 1))}
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-ink-line text-paper hover:bg-ink-soft"
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center text-sm tabular text-paper">{item.quantity}</span>
          <button
            onClick={() => onQtyChange(item.quantity + 1)}
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-ink-line text-paper hover:bg-ink-soft"
          >
            <Plus size={12} />
          </button>
        </div>
        <p className="w-20 text-right text-sm tabular text-paper shrink-0">
          {formatCurrency(lineGross - lineDiscount)}
        </p>
        {onDiscountChange && (
          <button
            onClick={() => setDiscountOpen((v) => !v)}
            className={`shrink-0 ${hasDiscount ? 'text-emerald-400' : 'text-paper/30 hover:text-brass'}`}
            title="Item discount"
          >
            <Percent size={13} />
          </button>
        )}
        <button onClick={onRemove} className="text-paper/30 hover:text-receipt-red shrink-0">
          <X size={14} />
        </button>
      </div>

      {hasDiscount && !discountOpen && (
        <p className="text-[11px] text-emerald-400 mt-1 ml-12">
          -{formatCurrency(lineDiscount)} item discount
        </p>
      )}

      {discountOpen && onDiscountChange && (
        <div className="flex items-center gap-1.5 mt-2 ml-12">
          <select
            value={item.discountType || DISCOUNT_TYPES.NONE}
            onChange={(e) => onDiscountChange({ discountType: e.target.value, discountValue: item.discountValue })}
            className="bg-ink border border-ink-line text-paper text-[11px] rounded-sm px-1.5 py-1"
            style={{ colorScheme: 'dark' }}
          >
            <option value={DISCOUNT_TYPES.NONE}>No item discount</option>
            <option value={DISCOUNT_TYPES.PERCENT}>% off</option>
            <option value={DISCOUNT_TYPES.FLAT}>₹ off</option>
          </select>
          {item.discountType && item.discountType !== DISCOUNT_TYPES.NONE && (
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.discountValue || ''}
              onChange={(e) => onDiscountChange({ discountType: item.discountType, discountValue: e.target.value })}
              className="w-16 bg-ink border border-ink-line text-paper text-[11px] rounded-sm px-1.5 py-1"
              placeholder="0"
            />
          )}
        </div>
      )}
    </div>
  );
}