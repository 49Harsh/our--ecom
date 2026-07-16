import { Suspense } from 'react';
import OrderSuccessClient from './OrderSuccessClient';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="container-site py-20 text-center text-gray-400">Loading...</div>}>
      <OrderSuccessClient />
    </Suspense>
  );
}
