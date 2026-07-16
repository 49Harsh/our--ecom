import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Refund & Return Policy' };

export default function RefundPage() {
  return (
    <div className="container-site py-16 max-w-3xl">
      <h1 className="font-serif text-4xl font-bold text-black mb-3">Refund & Return Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: January 2025</p>

      <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
        <div className="card p-5 bg-emerald-50 border-emerald-200">
          <p className="font-semibold text-emerald-800 text-base mb-1">15-Day Easy Returns</p>
          <p className="text-emerald-700">
            We offer a hassle-free 15-day return window on all eligible orders. No questions asked.
          </p>
        </div>

        {[
          {
            title: 'Eligible for Returns',
            body: 'Items are eligible for return within 15 days of delivery if: unused and unwashed, in original packaging with tags attached, not altered or damaged by customer.',
          },
          {
            title: 'Non-Returnable Items',
            body: 'The following items cannot be returned: innerwear and swimwear (hygiene reasons), customized or personalized items, sale items marked as "Final Sale", items without original tags or packaging.',
          },
          {
            title: 'How to Initiate a Return',
            body: 'Log in to your account → Go to My Orders → Select the order and item → Click "Return Item" → Choose a reason → Schedule a free pickup. Our courier partner will collect within 48 hours.',
          },
          {
            title: 'Refund Timeline',
            body: 'Once we receive and inspect the returned item (1–3 days after pickup), refunds are processed within 3–5 business days to your original payment method. For UPI and cards, it may take 1–2 additional banking days.',
          },
          {
            title: 'Exchanges',
            body: 'To exchange for a different size or color, initiate a return and place a new order. We do not currently support direct exchanges.',
          },
          {
            title: 'Damaged or Wrong Items',
            body: 'If you received a damaged, defective, or wrong item, please contact us at support@recom.in within 48 hours of delivery with photos. We will arrange an immediate replacement or full refund.',
          },
        ].map(({ title, body }) => (
          <div key={title}>
            <h2 className="font-semibold text-base text-gray-900 mb-2">{title}</h2>
            <p>{body}</p>
          </div>
        ))}

        <p>
          For any queries, <Link href="/contact" className="text-black underline">contact our support team</Link>.
        </p>
      </div>
    </div>
  );
}
