import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Receipt, ArrowLeft, LogOut, PlayCircle, StopCircle,
  UserPlus, CheckCircle2, Banknote, Smartphone, CreditCard, ImageOff, PauseCircle, ScanBarcode
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspace } from '../../store/workspaceContext';
import * as productsApi from '../../api/products';
import * as categoriesApi from '../../api/categories';
import * as inventoryApi from '../../api/inventory';
import * as customersApi from '../../api/customers';
import * as ordersApi from '../../api/orders';
import * as shiftsApi from '../../api/shifts';
import * as couponsApi from '../../api/coupons';
import { formatCurrency } from '../../lib/format';
import { computeBilling, DISCOUNT_TYPES, TAX_RATE_PERCENT } from '../../lib/billing';
import { toast } from '../../store/toastStore';
import { LoadError } from '../../components/Layout';
import CartLine from './CartLine';
import PrintableReceipt from './PrintableReceipt';
import HeldSalesModal from './HeldSalesModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import Modal from '../../components/Modal';
import { Field, Input, Select } from '../../components/Field';
import Button from '../../components/Button';
import { Printer } from 'lucide-react';
import * as paymentsApi from '../../api/payments';

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CARD', label: 'Card', icon: CreditCard },
];

const HELD_SALES_STORAGE_KEY = 'zosh_held_sales';
const HELD_SALE_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers/insecure contexts without crypto.randomUUID.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadHeldSalesFromStorage() {
  try {
    const raw = localStorage.getItem(HELD_SALES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const cutoff = Date.now() - HELD_SALE_EXPIRY_MS;
    return parsed
      .map((h) => ({ ...h, heldAt: new Date(h.heldAt) }))
      .filter((h) => h.heldAt.getTime() >= cutoff);
  } catch {
    return [];
  }
}

function makePaymentId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function POS() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { store, activeBranch, branches, setActiveBranchId, isBranchScoped, loading: workspaceLoading } = useWorkspace();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [customers, setCustomers] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('');
  // Split payments: an array of { id, type, amount } instead of one paymentType string.
  const [payments, setPayments] = useState([{ id: makePaymentId(), type: 'CASH', amount: '' }]);
  const [splitMode, setSplitMode] = useState(false);
  const [discountType, setDiscountType] = useState(DISCOUNT_TYPES.NONE);
  const [discountValue, setDiscountValue] = useState('');
  const [shift, setShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [heldSales, setHeldSales] = useState(() => loadHeldSalesFromStorage());
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const scanBufferRef = useRef('');
  const scanLastKeyTimeRef = useRef(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountAmount }

  const submitLockRef = useRef(false);
  const idempotencyKeyRef = useRef(makeIdempotencyKey());

  const loadCatalog = () => {
    if (!store?.id) return;
    setCatalogError(false);
    productsApi.getProductsByStoreId(store.id).then(setProducts).catch(() => { setProducts([]); setCatalogError(true); });
    categoriesApi.getCategoriesByStore(store.id).then(setCategories).catch(() => { setCategories([]); setCatalogError(true); });
  };

  useEffect(loadCatalog, [store?.id]);

  useEffect(() => {
    if (!activeBranch?.id) return;
    inventoryApi.getInventoryByBranch(activeBranch.id).then((rows) => {
      const map = {};
      (rows || []).forEach((r) => { map[r.product?.id] = r.quantity; });
      setStockMap(map);
    }).catch(() => setStockMap({}));
  }, [activeBranch?.id]);

  useEffect(() => {
    customersApi.getAllCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    shiftsApi.getCurrentShift().then(setShift).catch(() => setShift(null));
  }, []);

  // If the cart changes after a coupon was applied, the previously-previewed
  // discount is no longer trustworthy against the new total — clear it so the
  // cashier has to re-apply before checkout.
  useEffect(() => {
    setAppliedCoupon(null);
  }, [cart]);

  // Persist held sales so a refresh (or the browser crashing) doesn't lose them.
  // Also drop any that have expired past HELD_SALE_EXPIRY_MS.
  useEffect(() => {
    const cutoff = Date.now() - HELD_SALE_EXPIRY_MS;
    const fresh = heldSales.filter((h) => new Date(h.heldAt).getTime() >= cutoff);
    if (fresh.length !== heldSales.length) {
      setHeldSales(fresh);
      return; // effect re-runs with the filtered list; it'll persist below next pass
    }
    try {
      localStorage.setItem(HELD_SALES_STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // localStorage can throw in private-browsing/quota-exceeded situations — non-fatal.
    }
  }, [heldSales]);

  // Barcode scanner support: scanners type fast (well under 50ms between keystrokes)
  // and send Enter at the end, unlike a human typing in the search box.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      // Don't hijack typing inside the search box or any other text input/select.
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const now = Date.now();
      const gap = now - scanLastKeyTimeRef.current;
      scanLastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        if (code.length >= 3) handleBarcodeScan(code);
        return;
      }
      if (e.key.length === 1) {
        // Reset the buffer if too much time passed since the last keystroke —
        // that means it's regular human typing, not a scanner burst.
        if (gap > 60) scanBufferRef.current = '';
        scanBufferRef.current += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, stockMap]);

  const handleBarcodeScan = (code) => {
    const product = products.find((p) => p.barcode && p.barcode === code);
    if (!product) {
      toast.error(`No product found for barcode ${code}.`);
      return;
    }
    addToCart(product);
    toast.success(`${product.name} added.`);
  };

// Used by the camera scanner modal — same lookup as the keyboard-wedge path
  // above, but also closes the modal once a product is found so the cashier
  // doesn't have to dismiss it manually after every scan.
 const handleCameraDetected = (code) => {
    const product = products.find((p) => p.barcode && p.barcode === code);
   if (!product) {
     toast.error(`No product found for barcode ${code}.`);
      return;
   }
   addToCart(product);
    toast.success(`${product.name} added.`);
   setCameraScanOpen(false);
     };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') list = list.filter((p) => p.category?.id === activeCategory);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, query]);

  const addToCart = (product) => {
    const stock = stockMap[product.id];
    if (stock === 0) {
      toast.error(`${product.name} is out of stock at this branch.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (stock !== undefined && existing.quantity + 1 > stock) {
          toast.error(`Only ${stock} left in stock.`);
          return prev;
        }
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        quantity: 1,
        taxRatePercent: product.taxRatePercent ?? TAX_RATE_PERCENT,
        discountType: DISCOUNT_TYPES.NONE,
        discountValue: '',
      }];
    });
  };

  const updateQty = (productId, qty) => {
    const stock = stockMap[productId];
    if (stock !== undefined && qty > stock) {
      toast.error(`Only ${stock} left in stock.`);
      return;
    }
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const updateItemDiscount = (productId, { discountType: dt, discountValue: dv }) => {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, discountType: dt, discountValue: dv } : i)));
  };

  const holdSale = () => {
    if (!cart.length) return;
    const customerName = customers.find((c) => String(c.id) === String(customerId))?.fullName || 'Walk-in customer';
    setHeldSales((prev) => [
      ...prev,
      { id: Date.now(), cart, customerId, customerName, discountType, discountValue, payments, heldAt: new Date() },
    ]);
    setCart([]);
    setCustomerId('');
    setDiscountType(DISCOUNT_TYPES.NONE);
    setDiscountValue('');
    setCouponCode('');
    setAppliedCoupon(null);
    setPayments([{ id: makePaymentId(), type: 'CASH', amount: '' }]);
    setSplitMode(false);
    toast.info('Sale held. Start a new one or resume it from "Held" anytime.');
  };

  const resumeSale = (heldId) => {
    if (cart.length) {
      toast.error('Complete or hold the current sale before resuming another.');
      return;
    }
    const held = heldSales.find((h) => h.id === heldId);
    if (!held) return;
    setCart(held.cart);
    setCustomerId(held.customerId);
    setDiscountType(held.discountType);
    setDiscountValue(held.discountValue);
    setPayments(held.payments && held.payments.length ? held.payments : [{ id: makePaymentId(), type: 'CASH', amount: '' }]);
    setSplitMode((held.payments || []).length > 1);
    setHeldSales((prev) => prev.filter((h) => h.id !== heldId));
    setHeldModalOpen(false);
  };

  const discardHeldSale = (heldId) => {
    setHeldSales((prev) => prev.filter((h) => h.id !== heldId));
    toast.info('Held sale discarded.');
  };

  const billing = useMemo(
    () => computeBilling({ items: cart, discountType, discountValue, taxRatePercent: TAX_RATE_PERCENT }),
    [cart, discountType, discountValue]
  );

  // Coupon discount is applied on top of the manual discount + tax total.
  const couponDiscountAmount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, billing.total - couponDiscountAmount);

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentsRemaining = round2(grandTotal - paymentsTotal);

  const addPaymentLine = () => {
    const usedTypes = new Set(payments.map((p) => p.type));
    const nextType = PAYMENT_OPTIONS.find((o) => !usedTypes.has(o.value))?.value || 'CASH';
    setPayments((prev) => [...prev, { id: makePaymentId(), type: nextType, amount: paymentsRemaining > 0 ? paymentsRemaining : '' }]);
  };

  const removePaymentLine = (id) => setPayments((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const updatePaymentLine = (id, patch) =>
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // Selecting a single method (non-split mode) always fills the full total into that one line.
  const selectSingleMethod = (type) => {
    setSplitMode(false);
    setPayments([{ id: makePaymentId(), type, amount: grandTotal }]);
  };

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // In single-method mode, keep that one payment line's amount pinned to the
  // grand total as the cart changes (so the cashier doesn't have to re-type it).
  useEffect(() => {
    if (splitMode) return;
    setPayments((prev) => (prev.length === 1 ? [{ ...prev[0], amount: grandTotal }] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal, splitMode]);

  const handleApplyCoupon = async () => {
    if (!cart.length) {
      toast.error('Add an item to the cart before applying a coupon.');
      return;
    }
    if (!couponCode.trim()) {
      toast.error('Type a coupon code first.');
      return;
    }
    setCouponApplying(true);
    try {
      const result = await couponsApi.validateCoupon(couponCode.trim(), store.id, billing.total);
      setAppliedCoupon({ code: couponCode.trim(), discountAmount: result.discountAmount });
      toast.success(`Coupon applied — you save ${formatCurrency(result.discountAmount)}.`);
    } catch (err) {
      setAppliedCoupon(null);
      toast.error(err.response?.data?.message || 'Invalid coupon code.');
    } finally {
      setCouponApplying(false);
    }
  };

  const handleStartShift = async () => {
    setShiftLoading(true);
    try {
      setShift(await shiftsApi.startShift());
      toast.success('Shift started.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the shift.');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleEndShift = async () => {
    setShiftLoading(true);
    try {
      await shiftsApi.endShift();
      setShift(null);
      toast.success('Shift closed out.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not end the shift.');
    } finally {
      setShiftLoading(false);
    }
  };

  const completeSale = async () => {
    if (!cart.length) return;
    if (!activeBranch?.id) {
      toast.error('Select a branch before selling.');
      return;
    }
    if (Math.abs(paymentsRemaining) > 0.01) {
      toast.error(
        paymentsRemaining > 0
          ? `${formatCurrency(paymentsRemaining)} still uncollected.`
          : `Payments exceed the total by ${formatCurrency(-paymentsRemaining)}.`
      );
      return;
    }
    if (payments.some((p) => !p.type || Number(p.amount) <= 0)) {
      toast.error('Every payment line needs a method and an amount greater than 0.');
      return;
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setPlacing(true);
       try {
         const couponToSend = appliedCoupon?.code === couponCode.trim() ? appliedCoupon.code : null;
         const primaryPaymentType = [...payments].sort((a, b) => Number(b.amount) - Number(a.amount))[0]?.type;

         let razorpayFields = {};

         if (primaryPaymentType !== 'CASH') {
           const scriptLoaded = await paymentsApi.loadRazorpayScript();
           if (!scriptLoaded) {
             toast.error('Could not load Razorpay. Check your connection and try again.');
             submitLockRef.current = false;
             setPlacing(false);
             return;
           }

           const razorpayOrder = await paymentsApi.createRazorpayOrder(billing.total);

           try {
             razorpayFields = await paymentsApi.openRazorpayCheckout({
               razorpayOrderId: razorpayOrder.razorpayOrderId,
               amount: razorpayOrder.amount,
               currency: razorpayOrder.currency,
               keyId: razorpayOrder.keyId,
             });
           } catch (paymentErr) {
             toast.error(paymentErr.message || 'Payment was not completed.');
             submitLockRef.current = false;
             setPlacing(false);
             return;
           }
         }

         const order = await ordersApi.createOrder({
           branchId: activeBranch.id,
           customerId: customerId ? Number(customerId) : null,
           // paymentType kept for backends that haven't added multi-payment support yet —
           // it's just the largest single payment line as a best-effort fallback.
           paymentType: primaryPaymentType,
           ...razorpayFields,
           payments: payments.map((p) => ({ type: p.type, amount: Number(p.amount) })),
        couponCode: couponToSend,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.sellingPrice,
          discountType: i.discountType,
          discountValue: Number(i.discountValue) || 0,
          taxRatePercent: i.taxRatePercent,
        })),
        subtotal: billing.subtotal,
        discountType,
        discountAmount: billing.discountAmount,
        lineDiscountAmount: billing.lineDiscountAmount,
        taxBreakdown: billing.taxBreakdown,
        taxRatePercent: billing.taxRatePercent,
        taxAmount: billing.taxAmount,
        totalAmount: billing.total,
      });

      // The backend's own `discountAmount` field reflects the coupon discount
      // it actually applied (source of truth). Keep it separate from the
      // manual discount so the two don't overwrite each other on the receipt.
      const backendCouponDiscount = order.discountAmount || 0;

      setReceipt({
        ...order,
        subtotal: order.subtotal ?? billing.subtotal,
        discountAmount: billing.discountAmount,
        lineDiscountAmount: billing.lineDiscountAmount,
        couponCode: couponToSend,
        couponDiscountAmount: backendCouponDiscount,
        taxRatePercent: order.taxRatePercent ?? billing.taxRatePercent,
        taxAmount: order.taxAmount ?? billing.taxAmount,
        taxBreakdown: order.taxBreakdown ?? billing.taxBreakdown,
        payments: order.payments ?? payments.map((p) => ({ type: p.type, amount: Number(p.amount) })),
        totalAmount: Math.max(0, (order.totalAmount ?? billing.total) - backendCouponDiscount),
      });

      setCart([]);
      setCustomerId('');
      setDiscountType(DISCOUNT_TYPES.NONE);
      setDiscountValue('');
      setCouponCode('');
      setAppliedCoupon(null);
      setPayments([{ id: makePaymentId(), type: 'CASH', amount: '' }]);
      setSplitMode(false);
      idempotencyKeyRef.current = makeIdempotencyKey();

      inventoryApi.getInventoryByBranch(activeBranch.id).then((rows) => {
        const map = {};
        (rows || []).forEach((r) => { map[r.product?.id] = r.quantity; });
        setStockMap(map);
      }).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete the sale.');
    } finally {
      submitLockRef.current = false;
      setPlacing(false);
    }
  };

  if (workspaceLoading) {
    return <div className="min-h-screen bg-ink flex items-center justify-center text-paper/60 text-sm">Loading terminal…</div>;
  }

  if (!activeBranch) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Receipt size={28} className="text-brass mx-auto mb-3" />
          <p className="text-paper text-sm mb-4">Select or create a branch before opening the terminal.</p>
          <Link to="/branches"><Button variant="dark">Go to branches</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-ink flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-line shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-paper/50 hover:text-paper"><ArrowLeft size={18} /></Link>
          <div>
            <p className="text-sm text-paper font-medium leading-tight">{store?.brand}</p>
            <p className="text-xs text-paper/40 leading-tight">{activeBranch.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isBranchScoped && branches.length > 1 && (
                      <select
                        value={activeBranch.id}
                        onChange={(e) => setActiveBranchId(Number(e.target.value))}
                        className="bg-ink-soft border border-ink-line text-paper text-xs rounded-sm px-2 py-1.5"
                        style={{ colorScheme: 'dark' }}
                      >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {heldSales.length > 0 && (
            <button
              onClick={() => setHeldModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-paper/70 hover:text-brass border border-ink-line rounded-sm px-2.5 py-1.5"
            >
              <PauseCircle size={14} /> Held ({heldSales.length})
            </button>
          )}
          {shift ? (
            <Button size="sm" variant="danger" icon={StopCircle} onClick={handleEndShift} loading={shiftLoading}>End shift</Button>
          ) : (
            <Button size="sm" variant="primary" icon={PlayCircle} onClick={handleStartShift} loading={shiftLoading}>Start shift</Button>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-ink-line">
            <span className="text-xs text-paper/50">{user?.fullName}</span>
            <button onClick={logout} className="text-paper/40 hover:text-receipt-red"><LogOut size={15} /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Product grid */}
        <div className="flex-1 min-w-0 flex flex-col p-5">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-ink-soft border border-ink-line rounded-sm pl-9 pr-3 py-2 text-sm text-paper placeholder:text-paper/30 focus:outline-none focus:border-brass"
              />
            </div>
            <button
                          onClick={() => setCameraScanOpen(true)}
                          title="Scan a barcode with your camera"
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs border border-ink-line text-paper/70 hover:border-brass hover:text-brass"
                        >
                         <ScanBarcode size={15} /> Scan
                       </button>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto shrink-0 pb-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${activeCategory === 'all' ? 'bg-brass text-ink border-brass' : 'bg-transparent text-paper/60 border-ink-line'}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${activeCategory === c.id ? 'bg-brass text-ink border-brass' : 'bg-transparent text-paper/60 border-ink-line'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto dark-scroll">
            {catalogError && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-receipt-red">Couldn't load products. This isn't an empty catalog — it's a connection problem.</p>
                <button
                  onClick={loadCatalog}
                  className="text-sm text-brass border border-ink-line rounded-sm px-3 py-1.5 hover:border-brass"
                >
                  Try again
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
              {!catalogError && filteredProducts.map((p) => {
                const stock = stockMap[p.id];
                const outOfStock = stock === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`text-left bg-ink-soft border border-ink-line rounded-sm p-3 hover:border-brass transition-colors ${outOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <ProductThumb src={p.image} alt={p.name} />
                    <p className="text-sm text-paper leading-snug mb-1 line-clamp-2">{p.name}</p>
                    <p className="text-xs text-paper/40 mb-2 tabular">{p.sku}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-brass tabular font-medium">{formatCurrency(p.sellingPrice)}</span>
                      {stock !== undefined && <span className="text-[10px] text-paper/40">{stock} left</span>}
                    </div>
                  </button>
                );
              })}
              {!catalogError && !filteredProducts.length && (
                <p className="col-span-full text-center text-paper/40 text-sm py-16">No products match.</p>
              )}
            </div>
          </div>
        </div>

        {/* Receipt / cart */}
        <div className="w-[380px] shrink-0 bg-ink-soft border-l border-ink-line flex flex-col">
          <div className="px-5 py-4 border-b border-ink-line shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={16} className="text-brass" />
              <p className="text-sm text-paper font-medium">Current sale</p>
            </div>
            <div className="flex gap-2">
                           <Select
                             value={customerId}
                             onChange={(e) => setCustomerId(e.target.value)}
                             className="!bg-ink !border-ink-line !text-paper flex-1 !py-1.5 !text-xs"
                             style={{ colorScheme: 'dark' }}
                           >
                <option value="">Walk-in customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </Select>
              <button onClick={() => setQuickAddOpen(true)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-sm bg-ink border border-ink-line text-paper/60 hover:text-brass">
                <UserPlus size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto dark-scroll px-5">
            {cart.length === 0 ? (
              <p className="text-center text-paper/30 text-sm py-16">Tap a product to add it to the sale.</p>
            ) : (
              cart.map((item) => (
                <CartLine
                  key={item.productId}
                  item={item}
                  onQtyChange={(q) => updateQty(item.productId, q)}
                  onRemove={() => removeItem(item.productId)}
                  onDiscountChange={(patch) => updateItemDiscount(item.productId, patch)}
                />
              ))
            )}
          </div>

          <div className="px-5 py-4 border-t border-dashed border-ink-line shrink-0">
            <div className="flex gap-2 mb-3">
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="!bg-ink !border-ink-line !text-paper !py-1.5 !text-xs w-32"
                style={{ colorScheme: 'dark' }}
              >
                <option value={DISCOUNT_TYPES.NONE}>No discount</option>
                <option value={DISCOUNT_TYPES.PERCENT}>% off</option>
                <option value={DISCOUNT_TYPES.FLAT}>₹ off</option>
              </Select>
              {discountType !== DISCOUNT_TYPES.NONE && (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === DISCOUNT_TYPES.PERCENT ? 'e.g. 10' : 'e.g. 50'}
                  className="!bg-ink !border-paper/25 focus:!border-brass !text-paper !py-1.5 !text-xs flex-1"
                />
              )}
            </div>

            <div className="flex gap-2 mb-1.5">
              <Input
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setAppliedCoupon(null); }}
                placeholder="Coupon code (optional)"
                className="!bg-ink !border-paper/25 focus:!border-brass !text-paper flex-1 !py-1.5 !text-xs"
              />
              <Button
                size="sm"
                variant="dark"
                loading={couponApplying}
                onClick={handleApplyCoupon}
              >
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <p className="text-xs text-sky-400 mb-3">
                "{appliedCoupon.code}" applied — you save {formatCurrency(appliedCoupon.discountAmount)}.
              </p>
            )}

            <div className="space-y-1 mb-3 text-sm">
              <div className="flex justify-between text-paper/60">
                <span>Subtotal</span>
                <span className="tabular">{formatCurrency(billing.subtotal)}</span>
              </div>
              {billing.lineDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Item discounts</span>
                  <span className="tabular">-{formatCurrency(billing.lineDiscountAmount)}</span>
                </div>
              )}
              {billing.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span className="tabular">-{formatCurrency(billing.discountAmount)}</span>
                </div>
              )}
              {billing.taxBreakdown.map((t) => (
                <div key={t.ratePercent} className="flex justify-between text-paper/60">
                  <span>Tax ({t.ratePercent}%)</span>
                  <span className="tabular">{formatCurrency(t.taxAmount)}</span>
                </div>
              ))}
              {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-sky-400 font-medium">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span className="tabular">-{formatCurrency(couponDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-ink-line">
                <span className="text-sm text-paper/60">Total</span>
                <span className="text-2xl text-paper font-semibold tabular">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {!splitMode ? (
              <div className="mb-3">
                <div className="grid grid-cols-3 gap-2 mb-1.5">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => selectSingleMethod(opt.value)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-sm border text-xs ${
                        payments[0]?.type === opt.value ? 'bg-brass text-ink border-brass' : 'bg-ink border-ink-line text-paper/60'
                      }`}
                    >
                      <opt.icon size={15} />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSplitMode(true)}
                  className="text-[11px] text-paper/40 hover:text-brass underline"
                >
                  Split across multiple payment methods
                </button>
              </div>
            ) : (
              <div className="mb-3 space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <select
                      value={p.type}
                      onChange={(e) => updatePaymentLine(p.id, { type: e.target.value })}
                      className="bg-ink border border-ink-line text-paper text-xs rounded-sm px-2 py-1.5 w-24"
                      style={{ colorScheme: 'dark' }}
                    >
                      {PAYMENT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.amount}
                      onChange={(e) => updatePaymentLine(p.id, { amount: e.target.value })}
                      placeholder="0.00"
                      className="!bg-ink !border-ink-line !text-paper flex-1 !py-1.5 !text-xs"
                    />
                    <button
                      onClick={() => removePaymentLine(p.id)}
                      disabled={payments.length === 1}
                      className="text-paper/30 hover:text-receipt-red disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-0.5">
                  <button onClick={addPaymentLine} className="text-[11px] text-brass hover:underline">
                    + Add payment method
                  </button>
                  <span className={`text-[11px] tabular ${Math.abs(paymentsRemaining) > 0.01 ? 'text-receipt-red' : 'text-emerald-400'}`}>
                    {Math.abs(paymentsRemaining) > 0.01
                      ? `${formatCurrency(Math.abs(paymentsRemaining))} ${paymentsRemaining > 0 ? 'remaining' : 'over'}`
                      : 'Fully covered'}
                  </span>
                </div>
                <button
                  onClick={() => { setSplitMode(false); setPayments([{ id: makePaymentId(), type: 'CASH', amount: grandTotal }]); }}
                  className="text-[11px] text-paper/40 hover:text-brass underline"
                >
                  Use a single payment method instead
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="dark"
                size="lg"
                icon={PauseCircle}
                disabled={!cart.length}
                onClick={holdSale}
                className="!border-paper/25"
              >
                Hold
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!cart.length || Math.abs(paymentsRemaining) > 0.01}
                loading={placing}
                onClick={completeSale}
              >
                Complete sale
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick add customer */}
      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Add customer" width="max-w-sm">
        <QuickAddCustomer
          onSaved={(c) => {
            setCustomers((prev) => [...prev, c]);
            setCustomerId(String(c.id));
            setQuickAddOpen(false);
          }}
        />
      </Modal>

      {/* Receipt confirmation */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale complete" width="max-w-sm">
        {receipt && (
          <div>
            <div className="flex items-center gap-2 text-ledger mb-4">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">Order #{receipt.id} placed</p>
            </div>
            <div className="border border-dashed border-hairline rounded-sm p-4 mb-4">
              {receipt.items?.map((i) => (
                <div key={i.id} className="flex justify-between text-sm py-1 tabular">
                  <span className="text-ink-text-muted">{i.quantity} × {i.product?.name}</span>
                  <span>{formatCurrency(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-hairline space-y-1">
                <div className="flex justify-between text-sm text-ink-text-muted tabular">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium tabular">
                    <span>Discount</span>
                    <span>-{formatCurrency(receipt.discountAmount)}</span>
                  </div>
                )}
                {(receipt.taxBreakdown || []).map((t) => (
                  <div key={t.ratePercent} className="flex justify-between text-sm text-ink-text-muted tabular">
                    <span>Tax ({t.ratePercent}%)</span>
                    <span>{formatCurrency(t.taxAmount)}</span>
                  </div>
                ))}
                {receipt.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-sky-600 font-medium tabular">
                    <span>Coupon ({receipt.couponCode})</span>
                    <span>-{formatCurrency(receipt.couponDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-1 mt-1 border-t border-hairline tabular">
                  <span>Total</span>
                  <span>{formatCurrency(receipt.totalAmount)}</span>
                </div>
                {(receipt.payments || []).length > 0 && (
                  <div className="pt-1 mt-1 border-t border-dashed border-hairline space-y-0.5">
                    {receipt.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-ink-text-muted tabular">
                        <span>Paid via {p.type}</span>
                        <span>{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" icon={Printer} onClick={() => window.print()}>Print</Button>
              <Button className="flex-1" onClick={() => setReceipt(null)}>New sale</Button>
            </div>
          </div>
        )}
      </Modal>

      <HeldSalesModal
        open={heldModalOpen}
        onClose={() => setHeldModalOpen(false)}
        heldSales={heldSales}
        onResume={resumeSale}
        onDiscard={discardHeldSale}
      />
      <BarcodeScannerModal
             open={cameraScanOpen}
            onClose={() => setCameraScanOpen(false)}
              onDetected={handleCameraDetected}
            />

      <PrintableReceipt order={receipt} store={store} branch={activeBranch} />
    </div>
  );
}

function QuickAddCustomer({ onSaved }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const c = await customersApi.createCustomer(form);
      onSaved(c);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Full name" required>
        <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>Add customer</Button>
    </form>
  );
}

function ProductThumb({ src, alt }) {
  const [error, setError] = useState(false);
  const cleanSrc = typeof src === 'string' ? src.trim() : '';

  useEffect(() => {
    setError(false);
  }, [cleanSrc]);

  if (!cleanSrc || error) {
    return (
      <div className="mb-2 flex h-16 w-full items-center justify-center rounded-sm bg-ink border border-ink-line">
        <ImageOff size={16} className="text-paper/20" />
      </div>
    );
  }

  return (
    <div className="mb-2 h-16 w-full overflow-hidden rounded-sm bg-ink border border-ink-line">
      <img
        src={cleanSrc}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    </div>
  );
}