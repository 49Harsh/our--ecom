'use client';

import HeroSection from '@/components/home/HeroSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import ProductsSection from '@/components/home/ProductsSection';
import NewsletterSection from '@/components/home/NewsletterSection';

export default function HomeClient() {
  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <ProductsSection title="New Arrivals" filter="isNewArrival=true" viewAllHref="/shop?filter=newarrival" />
      <ProductsSection title="Trending Now" filter="isTrending=true" viewAllHref="/shop?filter=trending" dark />
      <ProductsSection title="Best Sellers" filter="isBestSeller=true" viewAllHref="/shop?filter=bestseller" />
      <NewsletterSection />
    </>
  );
}
