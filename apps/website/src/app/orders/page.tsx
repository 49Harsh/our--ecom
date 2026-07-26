'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(order.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', 'my'] }),
  });

  return (
    <div className="card overflow-visible">
      <div
        className="p-5 cursor-pointer flex items-center justify-between gap-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Package size={18} className="text-gray-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)} · {order.items?.length ?? 0} items</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
            {getOrderStatusLabel(order.status)}
          </span>
          <p className="text-sm font-bold text-gray-900 hidden sm:block">{formatPrice(Number(order.total))}</p>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">SKU: {item.sku} · Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-gray-900 shrink-0">{formatPrice(Number(item.total))}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              Total: {formatPrice(Number(order.total))}
            </p>
            <div className="flex items-center gap-2">
              {order.shipment?.trackingUrl && (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline !py-1.5 !px-3 text-xs gap-1.5"
                >
                  <ExternalLink size={12} /> Track
                </a>
              )}
              {['PENDING', 'CONFIRMED'].includes(order.status) && (
                <button
                  onClick={() => {
                    if (confirm('Cancel this order?')) cancelMutation.mutate();
                  }}
                  disabled={cancelMutation.isPending}
                  className="btn btn-outline !py-1.5 !px-3 text-xs text-red-600 !border-red-200 hover:!bg-red-50 disabled:opacity-50"
                >
                  {cancelMutation.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'my'],
    queryFn: () => ordersApi.getMyOrders({ limit: 20 }),
    retry: false,
    enabled: mounted && !!token,
  });

  const orders = data?.data?.data ?? data?.data ?? [];

  if (!mounted) {
    return (
      <div className="container-site py-8 lg:py-12 max-w-3xl">
        <h1 className="font-serif text-2xl font-bold text-black mb-8">My Orders</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container-site py-8 lg:py-12 max-w-3xl">
      <h1 className="font-serif text-2xl font-bold text-black mb-8">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={56} className="text-gray-200 mx-auto mb-5" />
          <h2 className="font-semibold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-500 text-sm mb-6">When you place an order, it will appear here.</p>
          <Link href="/shop" className="btn btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
}
