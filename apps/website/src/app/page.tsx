import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'R·ECOM — Premium Clothing Store',
  description: 'Discover premium clothing for men, women, and kids. Shop new arrivals, trending styles, and exclusive collections.',
};

export default function HomePage() {
  return <HomeClient />;
}
