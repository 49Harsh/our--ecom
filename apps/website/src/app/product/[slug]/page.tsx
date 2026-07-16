import type { Metadata } from 'next';
import ProductClient from './ProductClient';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: params.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export default function ProductPage({ params }: Props) {
  return <ProductClient slug={params.slug} />;
}
