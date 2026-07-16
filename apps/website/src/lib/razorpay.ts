declare global {
  interface Window {
    Razorpay: any;
  }
}

/** Dynamically loads the Razorpay checkout.js script */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface RazorpayOptions {
  key: string;
  amount: number;       // in paise
  currency: string;
  name: string;
  description?: string;
  order_id: string;     // Razorpay order ID from backend
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

export function openRazorpay(options: RazorpayOptions) {
  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
}
