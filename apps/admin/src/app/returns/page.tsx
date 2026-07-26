'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, X, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { returnsApi } from '@/lib/api';
import { formatPrice, formatDate, RETURN_STATUS_MAP } from '@/lib/utils';

const RETURN_STATUSES = ['', 'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'INSPECTED', 'REFUNDED'];

export default function ReturnsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-returns', page, status],
    queryFn: () => returnsApi.getAll({ page, limit: 20, status: status || undefined }),
  });

  const returns = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => returnsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-returns'] }); setSelected(null); },
  });

  const cols = [
    { key: 'order', label: 'Order #', render: (r: any) => (
      <span className="font-semibold text-indigo-600">#{r.order?.orderNumber ?? '—'}</span>
    )},
    { key: 'user', label: 'Customer', render: (r: any) => (
      <div>
        <p className="font-medium text-slate-800">{r.user?.name ?? '—'}</p>
        <p className="text-xs text-slate-400">{r.user?.email}</p>
      </div>
    )},
    { key: 'reason', label: 'Reason', render: (r: any) => (
      <span className="text-sm text-slate-600 truncate max-w-[160px] block">{r.reason}</span>
    )},
    { key: 'status', label: 'Status', render: (r: any) => {
      const info = RETURN_STATUS_MAP[r.status] ?? { label: r.status, badge: 'badge-gray' };
      return <span className={`badge ${info.badge}`}>{info.label}</span>;
    }},
    { key: 'refundAmount', label: 'Refund Amt', render: (r: any) => (
      <span>{r.refundAmount ? formatPrice(r.refundAmount) : '—'}</span>
    )},
    { key: 'createdAt', label: 'Date', render: (r: any) => (
      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <button onClick={() => { setSelected(r); setNewStatus(r.status); setAdminNotes(r.adminNotes ?? ''); }}
        className="btn btn-ghost btn-xs gap-1"><Eye size={13} /> View</button>
    )},
  ];

  return (
    <AdminLayout title="Returns">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input !w-auto !py-2 text-sm">
            {RETURN_STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
          {total > 0 && <span className="text-sm text-slate-500 my-auto">{total} requests</span>}
        </div>
        <DataTable columns={cols} data={returns} loading={isLoading} />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Return Request</h2>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-sm mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Order</p>
                  <p className="font-semibold">#{selected.order?.orderNumber}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Customer</p>
                  <p className="font-semibold">{selected.user?.name}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Reason</p>
                <p className="text-slate-700">{selected.reason}</p>
                {selected.description && <p className="text-slate-500 text-xs mt-1">{selected.description}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Update Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                  {RETURN_STATUSES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notes</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2} className="input resize-none" placeholder="Internal notes..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Refund Amount (₹)</label>
                <input type="number" className="input" placeholder="Leave blank to use order total"
                  id="refundAmt" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                disabled={updateMutation.isPending}
                onClick={() => {
                  const refundInput = (document.getElementById('refundAmt') as HTMLInputElement)?.value;
                  updateMutation.mutate({
                    id: selected.id,
                    data: {
                      status: newStatus,
                      adminNotes,
                      refundAmount: refundInput ? Number(refundInput) : undefined,
                    },
                  });
                }}
                className="btn btn-primary gap-2 disabled:opacity-60">
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Update Return'}
              </button>
              <button onClick={() => setSelected(null)} className="btn btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
