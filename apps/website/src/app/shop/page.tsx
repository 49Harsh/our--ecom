import type { Metadata } from 'next';
import { Suspense } from 'react';
import ShopClient from './ShopClient';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our complete clothing collection with filters by category, size, color, price and more.',
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container-site py-20 text-center text-gray-400">Loading...</div>}>
      <ShopClient />
    </Suspense>
  );
}
