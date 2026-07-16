'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const faqs = [
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 3–7 business days. Express shipping (1–2 days) is available at checkout for select pin codes.' },
      { q: 'Is there free shipping?', a: 'Yes! We offer free shipping on all orders above ₹999.' },
      { q: 'Can I track my order?', a: 'Yes. Once your order is shipped, you\'ll receive a tracking link via email and SMS. You can also track from My Orders page.' },
      { q: 'Can I change or cancel my order?', a: 'Orders can be cancelled or modified within 1 hour of placing them. After that, the order moves to fulfillment and cannot be changed.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We offer hassle-free 15-day returns on all orders. Items must be unused, unwashed, and in original packaging with tags intact.' },
      { q: 'How do I initiate a return?', a: 'Go to My Orders, select the item, and click "Return". Our team will schedule a free pickup within 48 hours.' },
      { q: 'When will I get my refund?', a: 'Refunds are processed within 3–5 business days after we receive and inspect the returned item.' },
    ],
  },
  {
    category: 'Sizing & Fit',
    items: [
      { q: 'How do I find my size?', a: 'Check our size guide on each product page. We recommend measuring your chest, waist, and hips and comparing to our size chart.' },
      { q: 'What if the product doesn\'t fit?', a: 'No worries — you can easily exchange for a different size within 15 days. Initiate an exchange from My Orders.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept UPI, credit/debit cards, net banking, wallets (via Razorpay), and Cash on Delivery.' },
      { q: 'Is it safe to pay online?', a: 'Absolutely. All transactions are secured by 256-bit SSL encryption and processed through Razorpay, India\'s leading payment gateway.' },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="container-site py-16 max-w-3xl">
      <h1 className="font-serif text-4xl font-bold text-black mb-3">Frequently Asked Questions</h1>
      <p className="text-gray-500 mb-12">Can&apos;t find what you&apos;re looking for? <a href="/contact" className="text-black underline">Contact us</a></p>

      <div className="space-y-8">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="font-semibold text-sm uppercase tracking-widest text-gray-400 mb-3">{section.category}</h2>
            <div className="card overflow-hidden px-5">
              {section.items.map((item) => <FaqItem key={item.q} {...item} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
