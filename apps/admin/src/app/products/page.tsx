'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { productsApi, categoriesApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  discountPrice: z.number().optional(),
  categoryId: z.string().min(1, 'Select a category'),
  brand: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNISEX', 'KIDS']),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  tags: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, status],
    queryFn: () => productsApi.getAll({ page, limit: 20, search, status: status || undefined }),
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoriesApi.getAll({ limit: 100 }),
  });

  const products = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;
  const totalPages = data?.data?.meta?.totalPages ?? 1;
  const categories = catsData?.data?.data ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'UNISEX', status: 'DRAFT' },
  });

  const openCreate = () => { setEditing(null); reset({ gender: 'UNISEX', status: 'DRAFT' }); setShowForm(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    reset({
      title: p.title, description: p.description, price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
      categoryId: p.categoryId, brand: p.brand ?? '', gender: p.gender,
      status: p.status, isFeatured: p.isFeatured, isTrending: p.isTrending,
      isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller,
      tags: p.tags?.join(', ') ?? '',
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? productsApi.update(editing.id, data)
      : productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    saveMutation.mutate(payload);
  };

  const cols = [
    { key: 'thumbnail', label: '', render: (r: any) => (
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        {r.thumbnail ? <Image src={r.thumbnail} alt={r.title} width={40} height={40} className="object-cover w-full h-full" /> : null}
      </div>
    )},
    { key: 'title', label: 'Product', render: (r: any) => (
      <div>
        <p className="font-medium text-slate-800 truncate max-w-[200px]">{r.title}</p>
        <p className="text-xs text-slate-400">{r.category?.name} · {r.brand ?? '—'}</p>
      </div>
    )},
    { key: 'price', label: 'Price', render: (r: any) => (
      <div>
        <p className="font-semibold">{formatPrice(r.discountPrice ?? r.price)}</p>
        {r.discountPrice && <p className="text-xs text-slate-400 line-through">{formatPrice(r.price)}</p>}
      </div>
    )},
    { key: 'status', label: 'Status', render: (r: any) => (
      <span className={`badge ${r.status === 'ACTIVE' ? 'badge-green' : r.status === 'DRAFT' ? 'badge-yellow' : 'badge-gray'}`}>
        {r.status}
      </span>
    )},
    { key: 'stock', label: 'Variants', render: (r: any) => (
      <span className="text-sm text-slate-600">{r.variants?.length ?? 0}</span>
    )},
    { key: 'createdAt', label: 'Created', render: (r: any) => (
      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="btn btn-ghost btn-xs"><Pencil size={13} /></button>
        <button onClick={() => { if (confirm('Delete product?')) deleteMutation.mutate(r.id); }}
          disabled={deleteMutation.isPending}
          className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
      </div>
    )},
  ];

  return (
    <AdminLayout title="Products">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products..." className="input !pl-8 !py-2 text-sm" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input !w-auto !py-2 text-sm">
            <option value="">All Status</option>
            {['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1 ml-auto">
            <Plus size={14} /> Add Product
          </button>
        </div>
        <DataTable columns={cols} data={products} loading={isLoading} />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input {...register('title')} className="input" />
                  {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <textarea {...register('description')} rows={3} className="input resize-none" />
                  {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹) *</label>
                  <input {...register('price', { valueAsNumber: true })} type="number" className="input" />
                  {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount Price (₹)</label>
                  <input {...register('discountPrice', { valueAsNumber: true })} type="number" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select {...register('categoryId')} className="input">
                    <option value="">Select category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.categoryId && <p className="text-xs text-red-600 mt-1">{errors.categoryId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input {...register('brand')} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select {...register('gender')} className="input">
                    {['MALE', 'FEMALE', 'UNISEX', 'KIDS'].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select {...register('status')} className="input">
                    {['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                  <input {...register('tags')} className="input" placeholder="summer, casual, trending" />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-4">
                  {[
                    { name: 'isFeatured', label: 'Featured' },
                    { name: 'isTrending', label: 'Trending' },
                    { name: 'isNewArrival', label: 'New Arrival' },
                    { name: 'isBestSeller', label: 'Best Seller' },
                  ].map(({ name, label }) => (
                    <label key={name} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" {...register(name as any)} className="accent-indigo-600 w-4 h-4" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-red-600">{(saveMutation.error as any)?.response?.data?.message ?? 'Save failed'}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting || saveMutation.isPending}
                  className="btn btn-primary gap-2 disabled:opacity-60">
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
