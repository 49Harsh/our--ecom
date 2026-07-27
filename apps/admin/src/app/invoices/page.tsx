'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { invoicesApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusBadge } from '@/lib/utils';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', page, search],
    queryFn: () => invoicesApi.getAll({ page, limit: 20, search }),
  });

  // orders/admin returns paginated orders — treat each order as an invoice record
  const rawOrders  = data?.data?.data ?? data?.data ?? [];
  const invoices   = Array.isArray(rawOrders) ? rawOrders : [];
  const total      = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;

  const cols = [
    { key: 'orderNumber', label: 'Invoice / Order #', render: (r: any) => (
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-indigo-500 shrink-0" />
        <span className="font-mono font-medium text-slate-800">#{r.orderNumber}</span>
      </div>
    )},
    { key: 'customer', label: 'Customer', render: (r: any) => (
      <div>
        <p className="text-sm font-medium text-slate-700">{r.user?.name ?? '—'}</p>
        <p className="text-xs text-slate-400">{r.user?.email ?? ''}</p>
      </div>
    )},
    { key: 'total', label: 'Grand Total', render: (r: any) => (
      <span className="font-semibold">{formatPrice(r.total)}</span>
    )},
    { key: 'tax', label: 'Tax', render: (r: any) => (
      <span className="text-sm text-slate-500">{formatPrice(r.taxAmount ?? 0)}</span>
    )},
    { key: 'status', label: 'Status', render: (r: any) => {
      const { label, badge } = getOrderStatusBadge(r.status);
      return <span className={`badge ${badge}`}>{label}</span>;
    }},
    { key: 'createdAt', label: 'Date', render: (r: any) => (
      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
    )},
  ];

  return (
    <AdminLayout title="Invoices">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search order #..." className="input !pl-8 !py-2 text-sm" />
          </div>
          {total > 0 && <span className="text-sm text-slate-500 my-auto">{total} invoices</span>}
        </div>
        <DataTable columns={cols} data={invoices} loading={isLoading} />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>
    </AdminLayout>
  );
}
