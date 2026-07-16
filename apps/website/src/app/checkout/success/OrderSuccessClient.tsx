'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const { data } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId,
  });

  const order = data?.data?.data ?? data?.data;

  return (
    <div className="container-site py-16 max-w-lg text-center">
      <div className="card p-10">
        <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-5" />
        <h1 className="font-serif text-2xl font-bold text-black mb-2">Order Placed!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
        </p>

        {order && (
          <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order ID</span>
              <span className="font-medium text-gray-900">#{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">{formatPrice(Number(order.total))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-emerald-700 capitalize">{order.status?.toLowerCase().replace(/_/g, ' ')}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/orders" className="btn btn-primary gap-2">
            <Package size={15} /> View My Orders
          </Link>
          <Link href="/shop" className="btn btn-outline">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
