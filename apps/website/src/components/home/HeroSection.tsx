'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  ctaText?: string;
}

const fallbackSlides: HeroBanner[] = [
  {
    id: '1',
    title: 'New Season Collection',
    subtitle: 'Discover the finest pieces crafted for the modern wardrobe',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
    link: '/shop?sort=newest',
    ctaText: 'Shop New Arrivals',
  },
  {
    id: '2',
    title: 'Trending Styles',
    subtitle: 'What everyone is wearing this season',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80',
    link: '/shop?filter=trending',
    ctaText: 'Shop Trending',
  },
  {
    id: '3',
    title: 'Exclusive Sale',
    subtitle: 'Up to 50% off on selected styles',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80',
    link: '/shop?status=SALE',
    ctaText: 'Shop Sale',
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const { data } = useQuery({
    queryKey: ['hero-banners'],
    queryFn: () => api.get('/hero-banners').then((r) => r.data?.data),
    staleTime: 5 * 60_000,
  });

  const slides: HeroBanner[] = (data && data.length > 0) ? data : fallbackSlides;

  const go = useCallback((idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => go((current + 1) % slides.length), [current, go, slides.length]);
  const prev = useCallback(() => go((current - 1 + slides.length) % slides.length), [current, go, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, slides.length]);

  const slide = slides[current];

  return (
    <section className="relative h-[70vh] min-h-[500px] max-h-[750px] overflow-hidden bg-gray-900">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={slide.id}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', duration: 0.6 }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 container-site h-full flex items-center">
        <motion.div
          key={`content-${slide.id}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-lg"
        >
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-gray-200 text-base sm:text-lg mb-8 leading-relaxed">
              {slide.subtitle}
            </p>
          )}
          <div className="flex items-center gap-3">
            {slide.link && (
              <Link href={slide.link} className="btn btn-primary !bg-white !text-black !border-white hover:!bg-gray-100">
                {slide.ctaText ?? 'Shop Now'}
              </Link>
            )}
            <Link href="/shop" className="btn btn-outline !border-white/60 !text-white hover:!bg-white/10">
              View All
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
