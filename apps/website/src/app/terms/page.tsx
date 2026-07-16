import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <div className="container-site py-16 max-w-3xl">
      <h1 className="font-serif text-4xl font-bold text-black mb-3">Terms & Conditions</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: January 2025</p>

      <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: '1. Acceptance of Terms', body: 'By accessing and using R·ECOM, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.' },
          { title: '2. User Accounts', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when registering.' },
          { title: '3. Products & Pricing', body: 'All prices are in Indian Rupees (INR) and inclusive of applicable taxes. We reserve the right to modify prices at any time without prior notice. Product images are for illustration purposes; actual colors may vary slightly.' },
          { title: '4. Order & Payment', body: 'Orders are confirmed only after successful payment verification. We accept UPI, cards, net banking, wallets, and Cash on Delivery. In case of payment failure, the order will not be processed.' },
          { title: '5. Shipping & Delivery', body: 'Delivery timelines are estimates and may vary based on location and external factors. We are not responsible for delays caused by shipping partners, natural events, or circumstances beyond our control.' },
          { title: '6. Returns & Refunds', body: 'Items can be returned within 15 days of delivery if unused, unwashed, and in original condition. Sale items, innerwear, and customized products are non-returnable. Refunds are processed within 5–7 business days.' },
          { title: '7. Intellectual Property', body: 'All content on this website including logos, images, text, and design is the intellectual property of R·ECOM and protected by copyright law. Unauthorized use is strictly prohibited.' },
          { title: '8. Governing Law', body: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.' },
        ].map(({ title, body }) => (
          <div key={title}>
            <h2 className="font-semibold text-base text-gray-900 mb-2">{title}</h2>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
