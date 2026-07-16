'use client';

import Link from 'next/link';
import { Instagram, Twitter, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const shopLinks = [
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Best Sellers', href: '/shop?filter=bestseller' },
  { label: 'Trending', href: '/shop?filter=trending' },
  { label: 'Sale', href: '/shop?status=SALE' },
  { label: 'Collections', href: '/shop' },
];

const helpLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Track Order', href: '/orders' },
  { label: 'Returns & Refunds', href: '/refund' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Refund Policy', href: '/refund' },
];

const socials = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter,   href: '#', label: 'Twitter' },
  { icon: Facebook,  href: '#', label: 'Facebook' },
  { icon: Youtube,   href: '#', label: 'Youtube' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      {/* Main */}
      <div className="container-site py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <p className="font-serif text-2xl font-bold text-white mb-3">R·ECOM</p>
          <p className="text-sm leading-relaxed text-gray-400 mb-5">
            Premium clothing crafted for the modern Indian wardrobe. Quality, style, and comfort in every stitch.
          </p>
          <div className="flex items-center gap-3">
            {socials.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Shop */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white mb-4">Shop</h3>
          <ul className="space-y-2.5">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Help */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white mb-4">Help</h3>
          <ul className="space-y-2.5">
            {helpLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white mb-4">Contact</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5 text-sm text-gray-400">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gray-500" />
              123 Main St, Mumbai, Maharashtra 400001
            </li>
            <li className="flex items-center gap-2.5 text-sm text-gray-400">
              <Phone size={15} className="shrink-0 text-gray-500" />
              +91-99999-99999
            </li>
            <li className="flex items-center gap-2.5 text-sm text-gray-400">
              <Mail size={15} className="shrink-0 text-gray-500" />
              support@recom.in
            </li>
          </ul>

          {/* Newsletter */}
          <div className="mt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Newsletter</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-gray-500"
              />
              <button type="submit" className="btn btn-primary !py-2 !px-3 text-xs shrink-0">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800 py-5">
        <div className="container-site flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} R·ECOM. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
