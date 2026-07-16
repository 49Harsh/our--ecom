'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { categoriesApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';

const categoryImages: Record<string, string> = {
  men:     'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=400&q=80',
  women:   'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
  kids:    'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&q=80',
  tops:    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&q=80',
  bottoms: 'https://images.unsplash.com/photo-1542060748-10c28b62716f?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
};

function getCategoryImage(slug: string, image?: string | null) {
  if (image) return image;
  for (const key of Object.keys(categoryImages)) {
    if (slug.toLowerCase().includes(key)) return categoryImages[key];
  }
  return categoryImages.default;
}

export default function CategoriesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories', 'home'],
    queryFn: () => categoriesApi.getAll({ limit: 6, isActive: true }),
    staleTime: 10 * 60_000,
  });

  const categories = data?.data?.data ?? [];

  return (
    <section className="section">
      <div className="container-site">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Browse By</p>
            <h2 className="font-serif text-3xl font-bold text-black">Categories</h2>
          </div>
          <Link href="/shop" className="text-sm font-medium text-gray-600 hover:text-black underline-offset-4 hover:underline transition-colors">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            : categories.map((cat: any, i: number) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link href={`/category/${cat.slug}`} className="group flex flex-col items-center gap-2">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                      <Image
                        src={getCategoryImage(cat.slug, cat.image)}
                        alt={cat.name}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-black transition-colors text-center">
                      {cat.name}
                    </p>
                  </Link>
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}
