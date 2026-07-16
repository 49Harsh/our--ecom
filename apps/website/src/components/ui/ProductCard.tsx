'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistApi, cartApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  thumbnail?: string | null;
  ratingAvg?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  brand?: string | null;
  gender?: string;
  variants?: { id: string; color?: { name: string; hexCode?: string } | null }[];
}

interface Props {
  product: ProductCardData;
  className?: string;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function ProductCard({ product, className }: Props) {
  const qc = useQueryClient();
  const [wishlisted, setWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const isLoggedIn = () =>
    typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  const discount = product.discountPrice && product.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const wishlistMutation = useMutation({
    mutationFn: () => wishlisted
      ? wishlistApi.remove(product.id)
      : wishlistApi.add(product.id),
    onSuccess: () => {
      setWishlisted((w) => !w);
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const cartMutation = useMutation({
    mutationFn: () => cartApi.add({ variantId: product.variants?.[0]?.id, quantity: 1 }),
    onSuccess: () => {
      setAddedToCart(true);
      qc.invalidateQueries({ queryKey: ['cart'] });
      setTimeout(() => setAddedToCart(false), 2000);
    },
  });

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn()) {
      // Show brief login prompt — don't redirect
      setNeedsLogin(true);
      setTimeout(() => setNeedsLogin(false), 2000);
      return;
    }
    wishlistMutation.mutate();
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    cartMutation.mutate(); // Cart works for guests too
  };

  const badge = product.isNewArrival ? 'New'
    : product.isTrending ? 'Trending'
    : product.isBestSeller ? 'Best Seller'
    : discount > 0 ? `-${discount}%`
    : null;

  const badgeColor = product.isNewArrival ? 'bg-black text-white'
    : product.isTrending ? 'bg-amber-500 text-white'
    : product.isBestSeller ? 'bg-emerald-600 text-white'
    : 'bg-red-600 text-white';

  return (
    <motion.div
      className={cn('card group relative', className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image */}
      <Link href={`/product/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300">
            <ShoppingBag size={40} />
          </div>
        )}

        {/* Badge */}
        {badge && (
          <span className={cn('absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm', badgeColor)}>
            {badge}
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm transition-all',
            'opacity-0 group-hover:opacity-100 hover:scale-110',
            wishlisted ? 'text-red-500' : 'text-gray-500 hover:text-red-500',
          )}
          aria-label="Add to wishlist"
        >
          <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        {/* Login nudge */}
        {needsLogin && (
          <div className="absolute top-2 right-10 bg-black text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap">
            Sign in to wishlist
          </div>
        )}

        {/* Quick add — works for guests */}
        {product.variants && product.variants.length > 0 && (
          <button
            onClick={handleAddToCart}
            className={cn(
              'absolute bottom-0 left-0 right-0 py-2.5 text-xs font-medium uppercase tracking-wider transition-all',
              'translate-y-full group-hover:translate-y-0',
              addedToCart ? 'bg-emerald-600 text-white' : 'bg-black/90 text-white hover:bg-black',
            )}
          >
            {addedToCart ? '✓ Added' : 'Quick Add'}
          </button>
        )}
      </Link>

      {/* Info */}
      <div className="p-3">
        {product.brand && (
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">{product.brand}</p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-black transition-colors leading-snug">
            {product.title}
          </h3>
        </Link>

        {/* Rating */}
        {(product.ratingAvg ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-xs text-gray-500">
              {Number(product.ratingAvg).toFixed(1)}
              {product.reviewCount ? ` (${product.reviewCount})` : ''}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-semibold text-gray-900">
            {formatPrice(Number(product.discountPrice ?? product.price))}
          </span>
          {product.discountPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(Number(product.price))}
            </span>
          )}
        </div>

        {/* Color dots */}
        {product.variants && product.variants.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {product.variants.slice(0, 5).map((v) =>
              v.color?.hexCode ? (
                <span
                  key={v.id}
                  className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: v.color.hexCode }}
                  title={v.color.name}
                />
              ) : null
            )}
            {product.variants.length > 5 && (
              <span className="text-[10px] text-gray-400">+{product.variants.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
