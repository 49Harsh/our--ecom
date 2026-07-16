import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About Us' };

export default function AboutPage() {
  return (
    <div className="container-site py-16 max-w-3xl">
      <h1 className="font-serif text-4xl font-bold text-black mb-6">About R·ECOM</h1>
      <div className="prose prose-gray max-w-none space-y-5 text-gray-600 leading-relaxed">
        <p className="text-lg text-gray-800">
          We are a premium clothing brand crafting modern, comfortable, and stylish pieces for the Indian wardrobe.
        </p>
        <p>
          Founded with a passion for quality and design, R·ECOM brings together contemporary fashion with the rich textile heritage of India. Every piece in our collection is thoughtfully designed and crafted using premium fabrics sourced responsibly.
        </p>
        <p>
          Our mission is simple — to make high-quality clothing accessible to everyone while maintaining the highest standards of craftsmanship, comfort, and style.
        </p>
        <h2 className="font-serif text-2xl font-bold text-black mt-8 mb-3">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
          {[
            { title: 'Quality First', desc: 'Premium fabrics and meticulous craftsmanship in every garment.' },
            { title: 'Sustainability', desc: 'Responsible sourcing and eco-conscious manufacturing practices.' },
            { title: 'Accessibility', desc: 'Premium fashion at fair prices, for everyone.' },
          ].map((v) => (
            <div key={v.title} className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-2">{v.title}</h3>
              <p className="text-sm text-gray-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 flex gap-4">
        <Link href="/shop" className="btn btn-primary">Shop Now</Link>
        <Link href="/contact" className="btn btn-outline">Contact Us</Link>
      </div>
    </div>
  );
}
