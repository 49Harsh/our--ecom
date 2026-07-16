'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { wishlistApi } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

export default function WishlistPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.get(),
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
  });

  const items: any[] = data?.data?.data ?? data?.data ?? [];

  return (
    <div className="container-site py-8 lg:py-12">
      <h1 className="font-serif text-2xl font-bold text-black mb-8">
        Wishlist <span className="text-gray-400 font-sans text-base font-normal">({items.length})</span>
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={56} className="text-gray-200 mx-auto mb-5" />
          <h2 className="font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 text-sm mb-6">Save items you love by clicking the heart icon.</p>
          <Link href="/shop" className="btn btn-primary">Explore Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item: any) => (
            <ProductCard key={item.id} product={item.product ?? item} />
          ))}
        </div>
      )}
    </div>
  );
}
