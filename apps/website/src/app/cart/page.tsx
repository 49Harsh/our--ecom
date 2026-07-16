'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Minus, Plus, ShoppingBag, Tag, X, Loader2 } from 'lucide-react';
import { cartApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CartPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    staleTime: 30_000,
    retry: false,
  });

  const cart = data?.data?.data ?? data?.data;
  const items: any[] = cart?.items ?? [];
  const totals = cart?.totals ?? {};

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateItem(itemId, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const couponMutation = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      setCouponError('');
    },
    onError: (err: any) => setCouponError(err?.response?.data?.message ?? 'Invalid coupon code'),
  });

  const removeCouponMutation = useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (isLoading) {
    return (
      <div className="container-site py-10">
        <div className="skeleton h-8 w-32 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-site py-20 text-center">
        <ShoppingBag size={60} className="text-gray-200 mx-auto mb-6" />
        <h1 className="font-serif text-2xl font-bold text-black mb-3">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/shop" className="btn btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-site py-8 lg:py-12">
      <h1 className="font-serif text-2xl font-bold text-black mb-8">
        Shopping Cart <span className="text-gray-400 font-sans text-base font-normal">({items.length} items)</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: any) => {
            const variant = item.variant;
            const product = variant?.product;
            const imageUrl = variant?.images?.[0] ?? product?.thumbnail;
            const price = Number(variant?.discountPrice ?? variant?.price ?? product?.discountPrice ?? product?.price ?? 0);

            return (
              <div key={item.id} className="card p-4 flex gap-4">
                {/* Image */}
                <Link href={`/product/${product?.slug}`} className="shrink-0">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden bg-gray-100 relative">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={product?.title ?? 'Product'} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/product/${product?.slug}`} className="text-sm font-medium text-gray-900 hover:text-black line-clamp-2">
                        {product?.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        {variant?.color && (
                          <span className="text-xs text-gray-500">{variant.color.name}</span>
                        )}
                        {variant?.size && (
                          <span className="text-xs text-gray-500">Size: {variant.size.name}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Qty */}
                    <div className="flex items-center gap-0 border border-gray-200 rounded-md">
                      <button
                        onClick={() => item.quantity > 1
                          ? updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                          : removeMutation.mutate(item.id)
                        }
                        className="p-1.5 text-gray-500 hover:text-black transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-3 text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                        className="p-1.5 text-gray-500 hover:text-black transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <p className="font-semibold text-gray-900">{formatPrice(price * item.quantity)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag size={15} /> Apply Coupon
            </h3>
            {cart?.coupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                <span className="text-sm font-medium text-emerald-800">{cart.coupon.code}</span>
                <button
                  onClick={() => removeCouponMutation.mutate()}
                  className="text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); couponMutation.mutate(couponCode); }} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="input flex-1 !py-2 text-sm uppercase"
                />
                <button type="submit" disabled={!couponCode || couponMutation.isPending} className="btn btn-outline !py-2 !px-4 text-xs">
                  {couponMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                </button>
              </form>
            )}
            {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
          </div>

          {/* Order summary */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({items.length} items)</span>
                <span>{formatPrice(Number(totals.subtotal ?? 0))}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(Number(totals.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-emerald-600">
                  {totals.shipping > 0 ? formatPrice(Number(totals.shipping)) : 'Free'}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(Number(totals.total ?? 0))}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/checkout')}
              className="btn btn-primary w-full mt-5 gap-2"
            >
              Proceed to Checkout →
            </button>

            <Link href="/shop" className="block text-center text-xs text-gray-400 hover:text-gray-700 transition-colors mt-3">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
