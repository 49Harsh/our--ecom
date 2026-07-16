'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ShoppingBag, Star, Truck, RotateCcw,
  Shield, ChevronDown, ChevronUp, Share2, Minus, Plus,
  Pencil, Loader2, CheckCircle2,
} from 'lucide-react';
import { productsApi, cartApi, wishlistApi, reviewsApi } from '@/lib/api';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ProductCard from '@/components/ui/ProductCard';

interface Props { slug: string; }

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
        />
      ))}
    </div>
  );
}

function InfoAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full py-4 text-sm font-medium text-gray-900"
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
            <div className="pb-4 text-sm text-gray-600 leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductClient({ slug }: Props) {
  const qc = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug),
    staleTime: 5 * 60_000,
  });

  const product = data?.data?.data ?? data?.data;

  const cartMutation = useMutation({
    mutationFn: (variantId: string) =>
      cartApi.add({ variantId, quantity }),
    onSuccess: () => {
      setAddedToCart(true);
      qc.invalidateQueries({ queryKey: ['cart'] });
      setTimeout(() => setAddedToCart(false), 3000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to add to cart');
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: () => wishlistActive
      ? wishlistApi.remove(product?.id)
      : wishlistApi.add(product?.id),
    onSuccess: () => {
      setWishlistActive((w) => !w);
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const handleAddToCart = () => {
    setError('');
    if (!selectedSize) { setError('Please select a size'); return; }
    const variant = product?.variants?.find(
      (v: any) =>
        (!selectedColor || v.color?.name === selectedColor) &&
        (!selectedSize || v.size?.name === selectedSize)
    );
    if (!variant) { setError('Selected combination not available'); return; }
    if (!variant.inventory || variant.inventory.stock <= 0) { setError('Out of stock'); return; }
    cartMutation.mutate(variant.id);
  };

  const allImages = product
    ? [
        ...(product.thumbnail ? [{ url: product.thumbnail, altText: product.title }] : []),
        ...(product.images ?? []),
      ]
    : [];

  const uniqueColors = product?.variants
    ? [...new Map(
        product.variants
          .filter((v: any) => v.color)
          .map((v: any) => [v.color.name, v.color])
      ).values()]
    : [];

  const sizesForColor = product?.variants
    ? product.variants
        .filter((v: any) => !selectedColor || v.color?.name === selectedColor)
        .filter((v: any) => v.size)
        .map((v: any) => ({
          name: v.size.name,
          inStock: (v.inventory?.stock ?? 0) - (v.inventory?.reserved ?? 0) > 0,
        }))
    : [];

  const discount = product?.discountPrice && product?.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="container-site py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="skeleton aspect-[3/4] rounded-xl" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton aspect-square rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-6 rounded" style={{ width: `${80 - i * 8}%` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container-site py-20 text-center">
        <p className="text-gray-500 text-lg mb-4">Product not found</p>
        <Link href="/shop" className="btn btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-site py-8 lg:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-black transition-colors">Shop</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/category/${product.category.slug}`} className="hover:text-black transition-colors">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-600 truncate max-w-[180px]">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* ── Gallery ── */}
        <div>
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 mb-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <Image
                  src={allImages[selectedImage]?.url ?? 'https://placehold.co/600x800/f5f5f5/aaa?text=No+Image'}
                  alt={allImages[selectedImage]?.altText ?? product.title}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {discount > 0 && (
              <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-sm">
                -{discount}%
              </span>
            )}

            <button
              onClick={() => wishlistMutation.mutate()}
              className={cn(
                'absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-sm transition-all hover:scale-110',
                wishlistActive ? 'text-red-500' : 'text-gray-500',
              )}
              aria-label="Wishlist"
            >
              <Heart size={18} fill={wishlistActive ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {allImages.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    'aspect-square rounded-lg overflow-hidden border-2 transition-colors',
                    selectedImage === i ? 'border-black' : 'border-transparent',
                  )}
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? product.title}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="flex flex-col">
          {product.brand && (
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">{product.brand}</p>
          )}
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-black leading-tight mb-3">
            {product.title}
          </h1>

          {/* Rating */}
          {product.ratingAvg > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating value={product.ratingAvg} />
              <span className="text-sm text-gray-500">
                {Number(product.ratingAvg).toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-bold text-black">
              {formatPrice(Number(product.discountPrice ?? product.price))}
            </span>
            {product.discountPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(Number(product.price))}
              </span>
            )}
            {discount > 0 && (
              <span className="text-sm font-semibold text-red-600">({discount}% off)</span>
            )}
          </div>

          {/* Colors */}
          {uniqueColors.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Color: <span className="text-gray-900">{selectedColor ?? 'Select'}</span>
              </p>
              <div className="flex items-center gap-2">
                {uniqueColors.map((color: any) => (
                  <button
                    key={color.name}
                    onClick={() => {
                      setSelectedColor(color.name === selectedColor ? null : color.name);
                      setSelectedSize(null);
                    }}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                      selectedColor === color.name ? 'border-black scale-110' : 'border-transparent',
                    )}
                    title={color.name}
                    style={color.hexCode ? { backgroundColor: color.hexCode } : {}}
                  >
                    {!color.hexCode && (
                      <span className="text-[10px] text-gray-600">{color.name[0]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizesForColor.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  Size: <span className="text-gray-900">{selectedSize ?? 'Select'}</span>
                </p>
                <Link href="/faq" className="text-xs text-gray-500 underline hover:text-black transition-colors">
                  Size guide
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map(({ name, inStock }: { name: string; inStock: boolean }) => (
                  <button
                    key={name}
                    disabled={!inStock}
                    onClick={() => setSelectedSize(name === selectedSize ? null : name)}
                    className={cn(
                      'min-w-[44px] h-10 px-3 text-sm font-medium rounded-md border transition-all',
                      !inStock && 'opacity-40 cursor-not-allowed line-through',
                      selectedSize === name ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-700 hover:border-black',
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Quantity</p>
            <div className="flex items-center gap-0 border border-gray-300 rounded-md w-fit">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2.5 text-gray-600 hover:text-black transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="px-4 text-sm font-medium min-w-[40px] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="p-2.5 text-gray-600 hover:text-black transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddToCart}
              disabled={cartMutation.isPending}
              className={cn(
                'flex-1 btn gap-2 transition-all',
                addedToCart ? 'btn-primary !bg-emerald-600 !border-emerald-600' : 'btn-primary',
              )}
            >
              <ShoppingBag size={16} />
              {cartMutation.isPending ? 'Adding...' : addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
            </button>
            <button
              onClick={() => wishlistMutation.mutate()}
              className={cn('btn btn-outline !px-3', wishlistActive && '!bg-red-50 !border-red-300 text-red-500')}
              aria-label="Wishlist"
            >
              <Heart size={16} fill={wishlistActive ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) navigator.share({ title: product.title, url: window.location.href });
              }}
              className="btn btn-outline !px-3"
              aria-label="Share"
            >
              <Share2 size={16} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
            {[
              { icon: Truck,     text: 'Free shipping above ₹999' },
              { icon: RotateCcw, text: '15-day easy returns' },
              { icon: Shield,    text: 'Secure checkout' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <Icon size={18} className="text-gray-600" />
                <span className="text-[11px] text-gray-500 leading-tight">{text}</span>
              </div>
            ))}
          </div>

          {/* Accordions */}
          <div>
            {product.description && (
              <InfoAccordion title="Description">
                <p>{product.description}</p>
              </InfoAccordion>
            )}
            <InfoAccordion title="Shipping & Delivery">
              <p>Free shipping on orders above ₹999. Estimated delivery in 3-7 business days. Express shipping available at checkout.</p>
            </InfoAccordion>
            <InfoAccordion title="Returns & Exchange">
              <p>Easy 15-day returns on all orders. Items must be unused, unwashed, and in original packaging. Initiate a return from your orders page.</p>
            </InfoAccordion>
          </div>
        </div>
      </div>

      {/* ── Reviews ── */}
      <ReviewsSection productId={product.id} initialReviews={product.reviews ?? []} reviewCount={product.reviewCount ?? 0} />

      {/* ── Related Products ── */}
      {product.category && (
        <RelatedProducts categoryId={product.category.id} currentId={product.id} />
      )}
    </div>
  );
}

// ─── Reviews Section ─────────────────────────────────────────────────────────
function ReviewsSection({
  productId,
  initialReviews,
  reviewCount,
}: {
  productId: string;
  initialReviews: any[];
  reviewCount: number;
}) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isLoggedIn =
    typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  // Fetch fresh reviews (falls back to product.reviews if query not run yet)
  const { data } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => reviewsApi.getByProduct(productId, { limit: 12 }),
    initialData: undefined,
    staleTime: 2 * 60_000,
  });

  const reviews: any[] = data?.data?.data ?? initialReviews;

  const submitMutation = useMutation({
    mutationFn: () =>
      reviewsApi.create(productId, { rating, title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      setSubmitted(true);
      setShowForm(false);
      setRating(5);
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['reviews', productId] });
      qc.invalidateQueries({ queryKey: ['product'] });
    },
  });

  const avg = reviews.length
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r: any) => r.rating === star).length,
    pct: reviews.length
      ? Math.round((reviews.filter((r: any) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  return (
    <section className="mt-16 pt-10 border-t border-gray-200">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-black">
            Customer Reviews
            {reviews.length > 0 && (
              <span className="text-gray-400 font-sans text-base font-normal ml-2">
                ({reviewCount || reviews.length})
              </span>
            )}
          </h2>

          {reviews.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-4xl font-bold text-gray-900">{avg}</span>
              <div>
                <StarRating value={Number(avg)} />
                <p className="text-xs text-gray-500 mt-0.5">Based on {reviews.length} reviews</p>
              </div>
            </div>
          )}
        </div>

        {isLoggedIn && !submitted && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="btn btn-outline gap-2"
          >
            <Pencil size={14} /> Write a Review
          </button>
        )}
        {!isLoggedIn && (
          <Link href="/auth/login" className="btn btn-outline gap-2 text-sm">
            Sign in to review
          </Link>
        )}
      </div>

      {/* Rating distribution */}
      {reviews.length > 0 && (
        <div className="mb-8 space-y-1.5 max-w-xs">
          {dist.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-right text-gray-500">{star}</span>
              <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Submit review form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="card p-6 border-black/10">
              <h3 className="font-semibold text-gray-900 mb-4">Your Review</h3>

              {/* Star picker */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Rating *</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={cn(
                          'transition-colors',
                          s <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200',
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || rating]}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Review title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    maxLength={100}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Review <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Tell others what you think about this product..."
                    rows={4}
                    maxLength={1000}
                    className="input resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/1000</p>
                </div>
              </div>

              {submitMutation.isError && (
                <p className="text-sm text-red-600 mt-3">
                  {(submitMutation.error as any)?.response?.data?.message ?? 'Failed to submit review'}
                </p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="btn btn-primary gap-2 disabled:opacity-60"
                >
                  {submitMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                    : 'Submit Review'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="text-sm font-medium">
            Thank you! Your review has been submitted for moderation.
          </p>
        </motion.div>
      )}

      {/* Review cards */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star size={40} className="mx-auto mb-3 opacity-30" />
          <p>No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review: any) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {review.user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {review.user?.name ?? 'Customer'}
                    </p>
                    {review.isVerified && (
                      <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 size={9} /> Verified Purchase
                      </p>
                    )}
                  </div>
                </div>
                <StarRating value={review.rating} />
              </div>
              {review.title && (
                <p className="font-semibold text-sm text-gray-900 mb-1">{review.title}</p>
              )}
              {review.body && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">{review.body}</p>
              )}
              <p className="text-[10px] text-gray-300 mt-3">
                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function RelatedProducts({ categoryId, currentId }: { categoryId: string; currentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['related', categoryId],
    queryFn: () => productsApi.getAll({ category: categoryId, limit: 5, status: 'ACTIVE' }),
    staleTime: 5 * 60_000,
  });

  const products = (data?.data?.data ?? []).filter((p: any) => p.id !== currentId).slice(0, 4);
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-gray-200">
      <h2 className="font-serif text-2xl font-bold text-black mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((p: any) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
