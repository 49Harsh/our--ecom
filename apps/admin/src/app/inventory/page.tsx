'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle, Save, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { inventoryApi } from '@/lib/api';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: lowData } = useQuery({
    queryKey: ['inventory-low'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-all', search],
    queryFn: () => inventoryApi.getAll({ search, limit: 50 }),
  });

  const items = data?.data?.data ?? [];
  const lowStockItems = lowData?.data?.data ?? [];
  const filtered = lowStockOnly ? items.filter((i: any) => i.stock <= i.lowStock) : items;
  const searchFiltered = search
    ? filtered.filter((i: any) =>
        i.product?.title?.toLowerCase().includes(search.toLowerCase()) ||
        i.sku?.toLowerCase().includes(search.toLowerCase()))
    : filtered;

  const updateMutation = useMutation({
    mutationFn: ({ variantId, stock }: { variantId: string; stock: number }) =>
      inventoryApi.update(variantId, stock),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-all'] }); setEditingId(null); },
  });

  return (
    <AdminLayout title="Inventory">
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-amber-800">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <p className="text-sm font-medium">
            {lowStockItems.length} variant{lowStockItems.length > 1 ? 's' : ''} running low on stock
          </p>
          <button onClick={() => setLowStockOnly(!lowStockOnly)}
            className="ml-auto text-xs font-semibold underline">
            {lowStockOnly ? 'Show All' : 'Show Low Stock'}
          </button>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU..." className="input !pl-8 !py-2 text-sm" />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant (Color / Size)</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Alert At</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-16" /></td>
                    ))}</tr>
                  ))
                : searchFiltered.length === 0
                  ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">No inventory records</td></tr>
                  : searchFiltered.map((item: any) => {
                      const available = (item.stock ?? 0) - (item.reserved ?? 0);
                      const isLow = available <= (item.lowStock ?? 5);
                      return (
                        <tr key={item.id}>
                          <td>
                            <p className="font-medium text-slate-800 truncate max-w-[180px]">
                              {item.variant?.product?.title ?? '—'}
                            </p>
                          </td>
                          <td className="text-sm text-slate-600">
                            {[item.variant?.color?.name, item.variant?.size?.name].filter(Boolean).join(' / ') || '—'}
                          </td>
                          <td className="font-mono text-xs text-slate-500">{item.variant?.sku ?? '—'}</td>
                          <td>
                            {editingId === item.id ? (
                              <input
                                type="number" value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input !py-1 !px-2 w-20 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                {item.stock ?? 0}
                              </span>
                            )}
                          </td>
                          <td className="text-slate-500">{item.reserved ?? 0}</td>
                          <td>
                            <span className={`badge ${isLow ? 'badge-red' : 'badge-green'}`}>
                              {available}
                            </span>
                          </td>
                          <td className="text-slate-500">{item.lowStock ?? 5}</td>
                          <td>
                            {editingId === item.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => updateMutation.mutate({ variantId: item.variantId, stock: Number(editValue) })}
                                  disabled={updateMutation.isPending}
                                  className="btn btn-primary btn-xs gap-1">
                                  {updateMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                  Save
                                </button>
                                <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-xs">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingId(item.id); setEditValue(String(item.stock ?? 0)); }}
                                className="btn btn-ghost btn-xs text-indigo-600">
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
