'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, RefreshCw, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { ordersApi, paymentsApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusBadge } from '@/lib/utils';

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];

export default function OrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, status],
    queryFn: () => ordersApi.getAll({ page, limit: 20, search, status: status || undefined }),
  });

  const orders = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelected(null);
    },
  });

  const refundMutation = useMutation({
    mutationFn: (orderId: string) => paymentsApi.refund(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const cols = [
    { key: 'orderNumber', label: 'Order #', render: (r: any) => (
      <button onClick={() => { setSelected(r); setNewStatus(r.status); }}
        className="font-semibold text-indigo-600 hover:underline">
        #{r.orderNumber}
      </button>
    )},
    { key: 'user', label: 'Customer', render: (r: any) => (
      <div>
        <p className="font-medium text-slate-800">{r.user?.name ?? '—'}</p>
        <p className="text-xs text-slate-400">{r.user?.email}</p>
      </div>
    )},
    { key: 'total', label: 'Amount', render: (r: any) => (
      <span className="font-semibold">{formatPrice(r.total)}</span>
    )},
    { key: 'status', label: 'Status', render: (r: any) => {
      const { label, badge } = getOrderStatusBadge(r.status);
      return <span className={`badge ${badge}`}>{label}</span>;
    }},
    { key: 'payment', label: 'Payment', render: (r: any) => (
      <span className={`badge ${r.payment?.status === 'CAPTURED' ? 'badge-green' : r.payment?.status === 'PENDING' ? 'badge-yellow' : 'badge-gray'}`}>
        {r.payment?.status ?? 'N/A'}
      </span>
    )},
    { key: 'createdAt', label: 'Date', render: (r: any) => (
      <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <button onClick={() => { setSelected(r); setNewStatus(r.status); }}
        className="btn btn-ghost btn-xs gap-1"><Eye size={13} /> View</button>
    )},
  ];

  return (
    <AdminLayout title="Orders">
      <div className="card">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search order #, customer..." className="input !pl-8 !py-2 text-sm" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input !w-auto !py-2 text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-orders'] })}
            className="btn btn-ghost btn-sm gap-1"><RefreshCw size={13} /> Refresh</button>
        </div>

        <DataTable columns={cols} data={orders} loading={isLoading} />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 z-10">
            <h2 className="font-bold text-lg mb-1">Order #{selected.orderNumber}</h2>
            <p className="text-sm text-slate-500 mb-5">{formatDate(selected.createdAt)} · {selected.user?.name}</p>

            <div className="space-y-2 mb-5">
              {selected.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-slate-700 truncate max-w-[260px]">{item.title} × {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.total)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span><span>{formatPrice(selected.total)}</span>
              </div>
            </div>

            {/* Delivery address */}
            {selected.address && (
              <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm text-slate-600">
                <p className="font-medium mb-1">Delivery Address</p>
                <p>{selected.address.fullName} · {selected.address.phone}</p>
                <p>{[selected.address.line1, selected.address.line2, selected.address.city, selected.address.state, selected.address.pincode].filter(Boolean).join(', ')}</p>
              </div>
            )}

            {/* Update status */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Update Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="input !py-2 text-sm">
                  {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <button
                disabled={newStatus === selected.status || updateStatusMutation.isPending}
                onClick={() => updateStatusMutation.mutate({ id: selected.id, status: newStatus })}
                className="btn btn-primary btn-sm gap-1 disabled:opacity-50">
                {updateStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Update'}
              </button>
            </div>

            {['DELIVERED', 'RETURNED'].includes(selected.status) && (
              <button
                onClick={() => { if (confirm('Issue refund?')) refundMutation.mutate(selected.id); }}
                disabled={refundMutation.isPending}
                className="btn btn-danger btn-sm mt-3 w-full gap-1">
                {refundMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Issue Refund'}
              </button>
            )}

            <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm w-full mt-3">Close</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
