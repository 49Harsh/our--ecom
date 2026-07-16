'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { productsApi, categoriesApi } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'popular',    label: 'Most Popular' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Top Rated' },
];

const GENDERS = ['MALE', 'FEMALE', 'UNISEX', 'KIDS'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', 'Free Size'];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-sm font-semibold text-gray-900 mb-3"
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShopClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Derived state from URL
  const sort     = searchParams.get('sort')     ?? 'newest';
  const category = searchParams.get('category') ?? '';
  const gender   = searchParams.get('gender')   ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const size     = searchParams.get('size')     ?? '';
  const page     = Number(searchParams.get('page') ?? '1');
  const filter   = searchParams.get('filter')   ?? '';

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/shop?${params.toString()}`);
  }, [searchParams, router]);

  const buildQuery = () => {
    const q: Record<string, any> = { sort, page, limit: 16, status: 'ACTIVE' };
    if (category) q.category = category;
    if (gender)   q.gender = gender;
    if (minPrice) q.minPrice = minPrice;
    if (maxPrice) q.maxPrice = maxPrice;
    if (size)     q.size = size;
    if (filter === 'newarrival')  q.isNewArrival = true;
    if (filter === 'trending')    q.isTrending = true;
    if (filter === 'bestseller')  q.isBestSeller = true;
    if (filter === 'featured')    q.isFeatured = true;
    return q;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['shop', sort, category, gender, minPrice, maxPrice, size, page, filter],
    queryFn: () => productsApi.getAll(buildQuery()),
    staleTime: 60_000,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => categoriesApi.getAll({ limit: 50 }),
    staleTime: 10 * 60_000,
  });

  const products   = data?.data?.data ?? [];
  const total      = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;
  const categories = catsData?.data?.data ?? [];

  const hasFilters = !!(category || gender || minPrice || maxPrice || size || filter);

  const clearFilters = () => router.push('/shop');

  const SidebarFilters = () => (
    <div className="space-y-0">
      {/* Categories */}
      <FilterSection title="Category">
        <ul className="space-y-1.5">
          {categories.map((cat: any) => (
            <li key={cat.id}>
              <button
                onClick={() => setParam('category', category === cat.slug ? '' : cat.slug)}
                className={cn(
                  'text-sm w-full text-left px-2 py-1 rounded-md transition-colors',
                  category === cat.slug ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      {/* Gender */}
      <FilterSection title="Gender">
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              onClick={() => setParam('gender', gender === g ? '' : g)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                gender === g ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:border-black',
              )}
            >
              {g[0] + g.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Size */}
      <FilterSection title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setParam('size', size === s ? '' : s)}
              className={cn(
                'w-10 h-10 text-xs font-medium rounded-md border transition-colors',
                size === s ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:border-black',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection title="Price (₹)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setParam('minPrice', e.target.value)}
            className="input !py-1.5 text-sm"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setParam('maxPrice', e.target.value)}
            className="input !py-1.5 text-sm"
          />
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="container-site py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black">
            {filter === 'newarrival' ? 'New Arrivals'
              : filter === 'trending' ? 'Trending Now'
              : filter === 'bestseller' ? 'Best Sellers'
              : category ? categories.find((c: any) => c.slug === category)?.name ?? 'Shop'
              : 'All Products'}
          </h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} {total === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              <X size={13} /> Clear filters
            </button>
          )}

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none bg-white text-gray-700 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 btn btn-outline !py-2"
          >
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <SidebarFilters />
        </aside>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="overlay lg:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-xl overflow-y-auto p-5 lg:hidden"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-gray-900">Filters</h2>
                  <button onClick={() => setFiltersOpen(false)} className="p-1.5 rounded-md hover:bg-gray-100">
                    <X size={18} />
                  </button>
                </div>
                <SidebarFilters />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 16 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">No products found</p>
              <button onClick={clearFilters} className="btn btn-outline">Clear Filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
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
                  <span className="text-sm text-gray-500 px-2">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
