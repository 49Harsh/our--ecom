'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchApi } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Popular' },
  { value: 'price_asc',  label: 'Price: Low–High' },
  { value: 'price_desc', label: 'Price: High–Low' },
  { value: 'rating',     label: 'Top Rated' },
];

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q    = searchParams.get('q') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const [input, setInput] = useState(q);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, sort],
    queryFn: () => searchApi.search(q, { sort, limit: 24 }),
    enabled: q.length > 0,
    staleTime: 60_000,
  });

  const results = data?.data?.data ?? data?.data?.hits ?? [];
  const total   = data?.data?.total ?? results.length;

  const updateUrl = (newQ?: string, newSort?: string) => {
    const params = new URLSearchParams();
    const finalQ    = newQ    !== undefined ? newQ    : q;
    const finalSort = newSort !== undefined ? newSort : sort;
    if (finalQ)    params.set('q', finalQ);
    if (finalSort) params.set('sort', finalSort);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="container-site py-8 lg:py-12">
      <form
        onSubmit={(e) => { e.preventDefault(); updateUrl(input); }}
        className="flex gap-3 max-w-xl mb-8"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search products..."
            className="input !pl-9"
          />
          {input && (
            <button
              type="button"
              onClick={() => { setInput(''); updateUrl(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary !px-5">Search</button>
      </form>

      {q && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-base font-medium text-gray-700">
            {isLoading ? 'Searching...' : `${total} results for `}
            {!isLoading && <span className="font-bold text-black">&quot;{q}&quot;</span>}
          </h1>
          <select
            value={sort}
            onChange={(e) => updateUrl(undefined, e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none bg-white"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {!q ? (
        <div className="text-center py-20">
          <Search size={56} className="text-gray-200 mx-auto mb-5" />
          <p className="text-gray-400 text-lg">Enter a search term to find products</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-2">No results for &quot;{q}&quot;</p>
          <p className="text-gray-400 text-sm">Try a different keyword or browse our shop.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
