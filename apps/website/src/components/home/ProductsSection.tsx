'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  filter: string;
  viewAllHref: string;
  dark?: boolean;
}

export default function ProductsSection({ title, filter, viewAllHref, dark }: Props) {
  const params = Object.fromEntries(new URLSearchParams(filter));

  const { data, isLoading } = useQuery({
    queryKey: ['products', filter],
    queryFn: () => productsApi.getAll({ ...params, limit: 8, status: 'ACTIVE' }),
    staleTime: 5 * 60_000,
  });

  const products = data?.data?.data ?? [];

  if (!isLoading && products.length === 0) return null;

  return (
    <section className={cn('section', dark && 'bg-gray-900')}>
      <div className="container-site">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className={cn('font-serif text-3xl font-bold', dark ? 'text-white' : 'text-black')}>
              {title}
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className={cn(
              'text-sm font-medium underline-offset-4 hover:underline transition-colors',
              dark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black',
            )}
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </div>
    </section>
  );
}
