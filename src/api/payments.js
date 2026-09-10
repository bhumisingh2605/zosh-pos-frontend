import client from './client';

export const createRazorpayOrder = (amount) =>
  client.post('/api/payments/razorpay/create-order', { amount }).then((r) => r.data);

export const verifyRazorpayPayment = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) =>
  client
    .post('/api/payments/razorpay/verify', { razorpayOrderId, razorpayPaymentId, razorpaySignature })
    .then((r) => r.data);

// Loads the Razorpay Checkout script once and reuses it on repeat calls,
// instead of adding a <script> tag to index.html.
let razorpayScriptPromise = null;

export const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};

// Opens Razorpay Checkout and resolves with the payment fields once the
// customer completes payment, or rejects if they cancel/it fails.
export const openRazorpayCheckout = ({ razorpayOrderId, amount, currency, keyId, customerName }) =>
  new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount,
      currency,
      name: 'Zosh POS',
      description: 'Point of sale payment',
      prefill: customerName ? { name: customerName } : undefined,
      handler: (response) => {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.on('payment.failed', () => reject(new Error('Payment failed')));
    rzp.open();
  });