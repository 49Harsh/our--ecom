'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, Tag } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/DataTable';
import { couponsApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(3).toUpperCase(),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.number().positive(),
  minOrderAmount: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().optional(),
  usageLimitPerUser: z.number().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponsApi.getAll({ limit: 50 }),
  });
  const coupons = data?.data?.data ?? [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PERCENTAGE', isActive: true },
  });

  const type = watch('type');

  const openCreate = () => { setEditing(null); reset({ type: 'PERCENTAGE', isActive: true }); setShowForm(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    reset({
      code: c.code, description: c.description ?? '', type: c.type,
      value: Number(c.value), minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : undefined,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : undefined,
      usageLimit: c.usageLimit ?? undefined, usageLimitPerUser: c.usageLimitPerUser ?? undefined,
      isActive: c.isActive,
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? couponsApi.update(editing.id, d) : couponsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const cols = [
    { key: 'code', label: 'Code', render: (r: any) => (
      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-sm">{r.code}</span>
    )},
    { key: 'type', label: 'Type', render: (r: any) => (
      <span className="badge badge-purple">{r.type}</span>
    )},
    { key: 'value', label: 'Value', render: (r: any) => (
      <span className="font-semibold">
        {r.type === 'PERCENTAGE' ? `${r.value}%` : r.type === 'FIXED' ? formatPrice(r.value) : 'Free Ship'}
      </span>
    )},
    { key: 'usage', label: 'Used / Limit', render: (r: any) => (
      <span className="text-sm">{r.usedCount} / {r.usageLimit ?? '∞'}</span>
    )},
    { key: 'isActive', label: 'Status', render: (r: any) => (
      <span className={`badge ${r.isActive ? 'badge-green' : 'badge-gray'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    )},
    { key: 'endDate', label: 'Expires', render: (r: any) => (
      <span className="text-xs text-slate-400">{r.endDate ? formatDate(r.endDate) : '—'}</span>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="btn btn-ghost btn-xs"><Pencil size={13} /></button>
        <button onClick={() => { if (confirm('Delete coupon?')) deleteMutation.mutate(r.id); }}
          className="btn btn-ghost btn-xs text-red-500"><Trash2 size={13} /></button>
      </div>
    )},
  ];

  return (
    <AdminLayout title="Coupons">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600"><Tag size={16} /><span className="text-sm">{coupons.length} coupons</span></div>
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1"><Plus size={14} /> Create Coupon</button>
        </div>
        <DataTable columns={cols} data={coupons} loading={isLoading} />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editing ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit((d) => {
                const payload: any = {};
                // Required fields
                payload.code        = d.code;
                payload.type        = d.type;
                payload.value       = d.value;
                payload.isActive    = d.isActive ?? true;
                // Optional — only include if valid (not empty, not NaN)
                if (d.description)                        payload.description       = d.description;
                if (d.minOrderAmount && !isNaN(d.minOrderAmount)) payload.minOrderAmount = d.minOrderAmount;
                if (d.maxDiscount    && !isNaN(d.maxDiscount))    payload.maxDiscount    = d.maxDiscount;
                if (d.usageLimit     && !isNaN(d.usageLimit))     payload.usageLimit     = d.usageLimit;
                if (d.usageLimitPerUser && !isNaN(d.usageLimitPerUser)) payload.usageLimitPerUser = d.usageLimitPerUser;
                // Dates — convert string → ISO Date, skip if empty
                if (d.startDate) payload.startDate = new Date(d.startDate).toISOString();
                if (d.endDate)   payload.endDate   = new Date(d.endDate).toISOString();
                saveMutation.mutate(payload);
              })} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                  <input {...register('code')} className="input uppercase" placeholder="SAVE20" />
                  {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select {...register('type')} className="input">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Value * {type === 'PERCENTAGE' ? '(%)' : type === 'FIXED' ? '(₹)' : ''}
                  </label>
                  <input {...register('value', { valueAsNumber: true })} type="number" className="input" />
                  {errors.value && <p className="text-xs text-red-600 mt-1">{errors.value.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Order Amount (₹)</label>
                  <input {...register('minOrderAmount', { valueAsNumber: true })} type="number" className="input" />
                </div>
                {type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Discount (₹)</label>
                    <input {...register('maxDiscount', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Usage Limit</label>
                  <input {...register('usageLimit', { valueAsNumber: true })} type="number" className="input" placeholder="Unlimited" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Per User Limit</label>
                  <input {...register('usageLimitPerUser', { valueAsNumber: true })} type="number" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input {...register('startDate')} type="date" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input {...register('endDate')} type="date" className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input {...register('description')} className="input" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...register('isActive')} className="accent-indigo-600 w-4 h-4" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary gap-2 disabled:opacity-60">
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
