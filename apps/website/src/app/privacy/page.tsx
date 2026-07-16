import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="container-site py-16 max-w-3xl">
      <h1 className="font-serif text-4xl font-bold text-black mb-3">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: January 2025</p>

      <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: '1. Information We Collect', body: 'We collect information you provide directly to us, such as your name, email address, phone number, and delivery addresses when you create an account or place an order. We also automatically collect usage data, device information, and cookies when you visit our website.' },
          { title: '2. How We Use Your Information', body: 'We use your information to process orders, send order updates, provide customer support, send promotional communications (with your consent), improve our services, and comply with legal obligations.' },
          { title: '3. Information Sharing', body: 'We do not sell your personal information. We share data with service providers (payment processors, shipping partners, email providers) only as necessary to operate our services. All partners are contractually bound to protect your data.' },
          { title: '4. Data Security', body: 'We implement industry-standard security measures including SSL encryption, secure payment processing via Razorpay, and regular security audits to protect your personal information.' },
          { title: '5. Cookies', body: 'We use cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser, though disabling cookies may affect site functionality.' },
          { title: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data. You can update your profile information from your account page or contact us at support@recom.in to request data deletion.' },
          { title: '7. Contact Us', body: 'If you have questions about this Privacy Policy, please contact us at support@recom.in or write to us at 123 Main St, Mumbai, Maharashtra, 400001.' },
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
