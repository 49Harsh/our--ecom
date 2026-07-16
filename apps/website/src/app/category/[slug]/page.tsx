'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { categoriesApi, productsApi } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'popular',    label: 'Most Popular' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Top Rated' },
];

function CategoryContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1');

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, value);
    if (key !== 'page') p.set('page', '1');
    router.push(`/category/${slug}?${p.toString()}`);
  };

  const { data: catData } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesApi.getBySlug(slug),
    staleTime: 10 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'category', slug, sort, page],
    queryFn: () => productsApi.getAll({ category: slug, limit: 20, status: 'ACTIVE', sort, page }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  const category   = catData?.data?.data ?? catData?.data;
  const products   = data?.data?.data ?? [];
  const total      = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  return (
    <div className="container-site py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-black transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-gray-700">{category?.name ?? slug}</span>
      </nav>

      {/* Category header with optional image */}
      {category?.image && (
        <div className="relative h-40 sm:h-56 rounded-xl overflow-hidden mb-8 bg-gray-100">
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40 flex items-end p-6">
            <h1 className="font-serif text-3xl font-bold text-white">{category.name}</h1>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          {!category?.image && (
            <h1 className="font-serif text-3xl font-bold text-black">{category?.name ?? slug}</h1>
          )}
          {category?.description && (
            <p className="text-gray-500 mt-1 text-sm max-w-2xl">{category.description}</p>
          )}
          {!isLoading && (
            <p className="text-sm text-gray-400 mt-1">{total} products</p>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none bg-white text-gray-700"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.length === 0
            ? (
              <div className="col-span-full text-center py-20">
                <p className="text-gray-400 text-lg mb-4">No products in this category yet</p>
                <Link href="/shop" className="btn btn-primary">Browse All Products</Link>
              </div>
            )
            : products.map((p: any) => <ProductCard key={p.id} product={p} />)
        }
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            disabled={page <= 1}
            onClick={() => setParam('page', String(page - 1))}
            className="btn btn-outline !py-2 !px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setParam('page', String(page + 1))}
            className="btn btn-outline !py-2 !px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="container-site py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <CategoryContent />
    </Suspense>
  );
}
