'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserX, Shield, Eye, X } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: () => usersApi.getAll({ page, limit: 20, search, role: 'CUSTOMER' }),
  });

  const customers = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customers'] }); setSelected(null); },
  });

  const cols = [
    { key: 'name', label: 'Customer', render: (r: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
          {r.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-800">{r.name}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      </div>
    )},
    { key: 'phone', label: 'Phone', render: (r: any) => <span className="text-sm">{r.phone ?? '—'}</span> },
    { key: 'isVerified', label: 'Verified', render: (r: any) => (
      <span className={`badge ${r.isVerified ? 'badge-green' : 'badge-yellow'}`}>
        {r.isVerified ? 'Yes' : 'No'}
      </span>
    )},
    { key: 'isActive', label: 'Status', render: (r: any) => (
      <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>
        {r.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { key: 'createdAt', label: 'Joined', render: (r: any) => (
      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <button onClick={() => setSelected(r)} className="btn btn-ghost btn-xs gap-1">
        <Eye size={13} /> View
      </button>
    )},
  ];

  return (
    <AdminLayout title="Customers">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, email..." className="input !pl-8 !py-2 text-sm" />
          </div>
          {total > 0 && <span className="text-sm text-slate-500 ml-auto">{total} customers</span>}
        </div>
        <DataTable columns={cols} data={customers} loading={isLoading} />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Customer Details</h2>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold">
                {selected.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900">{selected.name}</p>
                <p className="text-sm text-slate-500">{selected.email}</p>
                <p className="text-xs text-slate-400">{selected.phone ?? 'No phone'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Joined</p>
                <p className="font-medium">{formatDate(selected.createdAt)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Role</p>
                <p className="font-medium">{selected.role}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Verified</p>
                <p className="font-medium">{selected.isVerified ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <p className={`font-medium ${selected.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {selected.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            {selected.isActive && (
              <button
                onClick={() => { if (confirm('Deactivate this account?')) deactivateMutation.mutate(selected.id); }}
                className="btn btn-danger btn-sm w-full gap-1">
                <UserX size={14} /> Deactivate Account
              </button>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
