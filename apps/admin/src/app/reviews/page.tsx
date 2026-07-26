'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Trash2, Star, Loader2, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import Pagination from '@/components/ui/Pagination';
import { reviewsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={12}
          className={s <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page],
    queryFn: () => reviewsApi.getPending({ page, limit: 20 }),
  });

  const reviews = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;

  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  return (
    <AdminLayout title="Reviews">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Pending Reviews</p>
            <p className="text-xs text-slate-400 mt-0.5">{total} reviews awaiting moderation</p>
          </div>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-reviews'] })}
            className="btn btn-ghost btn-sm gap-1"><RefreshCw size={13} /> Refresh</button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">All caught up!</p>
            <p className="text-sm text-slate-400 mt-1">No pending reviews</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((r: any) => (
              <div key={r.id} className="p-5 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {r.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{r.user?.name ?? 'Anonymous'}</p>
                        <p className="text-xs text-slate-400">{r.user?.email}</p>
                      </div>
                      <Stars value={r.rating} />
                      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                      {r.isVerified && (
                        <span className="badge badge-green text-[10px]">Verified Purchase</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700 truncate">{r.product?.title ?? '—'}</p>
                    {r.title && <p className="text-sm font-semibold text-slate-800 mt-1">{r.title}</p>}
                    {r.body && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{r.body}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(r.id)}
                      disabled={approveMutation.isPending}
                      className="btn btn-primary btn-sm gap-1">
                      {approveMutation.isPending
                        ? <Loader2 size={12} className="animate-spin" />
                        : <CheckCircle2 size={12} />}
                      Approve
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete review?')) deleteMutation.mutate(r.id); }}
                      disabled={deleteMutation.isPending}
                      className="btn btn-danger btn-sm gap-1">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>
    </AdminLayout>
  );
}
