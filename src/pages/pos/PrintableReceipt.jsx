import { formatCurrency, formatDateTime } from '../../lib/format';

export default function PrintableReceipt({ order, store, branch }) {
  if (!order) return null;

  return (
    <div id="print-receipt" className="hidden print:block font-mono text-black text-xs p-4 w-[280px]">
      <div className="text-center mb-3">
        <p className="font-semibold text-sm">{store?.brand || 'Store'}</p>
        <p>{branch?.name}</p>
        <p>{branch?.address}</p>
      </div>
      <div className="border-t border-b border-dashed border-black py-1 mb-2">
        <div className="flex justify-between"><span>Order #{order.id}</span><span>{formatDateTime(order.createdAt)}</span></div>
        <div className="flex justify-between"><span>Cashier</span><span>{order.cashier?.fullName || '—'}</span></div>
        <div className="flex justify-between"><span>Customer</span><span>{order.customer?.fullName || 'Walk-in'}</span></div>
      </div>
      {order.items?.map((i) => (
        <div key={i.id} className="flex justify-between py-0.5">
          <span>{i.quantity} × {i.product?.name}</span>
          <span>{formatCurrency(i.price * i.quantity)}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-black mt-2 pt-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span></div>
        )}
        <div className="flex justify-between"><span>Tax ({order.taxRatePercent}%)</span><span>{formatCurrency(order.taxAmount)}</span></div>
        <div className="flex justify-between font-semibold text-sm border-t border-black mt-1 pt-1">
          <span>Total</span><span>{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="flex justify-between mt-1"><span>Paid via</span><span>{order.paymentType}</span></div>
      </div>
      <p className="text-center mt-3">Thank you for shopping with us!</p>
    </div>
  );
}