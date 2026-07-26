'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, FileText } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { invoicesApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', page, search],
    queryFn: () => invoicesApi.getAll({ page, limit: 20, search }),
  });

  const invoices = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;

  const handleDownload = async (id: string, number: string) => {
    try {
      const res = await invoicesApi.download(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice-${number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  const cols = [
    { key: 'invoiceNumber', label: 'Invoice #', render: (r: any) => (
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-indigo-500 shrink-0" />
        <span className="font-mono font-medium text-slate-800">{r.invoiceNumber}</span>
      </div>
    )},
    { key: 'order', label: 'Order #', render: (r: any) => (
      <span className="text-indigo-600 font-medium">#{r.order?.orderNumber ?? '—'}</span>
    )},
    { key: 'customer', label: 'Customer', render: (r: any) => (
      <span className="text-sm">{r.order?.user?.name ?? '—'}</span>
    )},
    { key: 'grandTotal', label: 'Grand Total', render: (r: any) => (
      <span className="font-semibold">{formatPrice(r.grandTotal)}</span>
    )},
    { key: 'tax', label: 'Total Tax', render: (r: any) => (
      <span className="text-sm text-slate-500">{formatPrice(r.totalTax)}</span>
    )},
    { key: 'invoiceDate', label: 'Date', render: (r: any) => (
      <span className="text-xs text-slate-400">{formatDate(r.invoiceDate)}</span>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <button onClick={() => handleDownload(r.id, r.invoiceNumber)}
        className="btn btn-ghost btn-xs gap-1 text-indigo-600">
        <Download size={13} /> PDF
      </button>
    )},
  ];

  return (
    <AdminLayout title="Invoices">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search invoice #, order #..." className="input !pl-8 !py-2 text-sm" />
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
