'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, FolderTree } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { categoriesApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoriesApi.getAll({ limit: 100 }),
  });
  const categories = data?.data?.data ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, sortOrder: 0 },
  });

  const openCreate = () => { setEditing(null); reset({ isActive: true, sortOrder: 0 }); setShowForm(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    reset({
      name: c.name,
      description: c.description ?? '',
      parentId: c.parentId ?? undefined,
      isActive: c.isActive,
      sortOrder: c.sortOrder ?? 0,
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? categoriesApi.update(editing.id, d) : categoriesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  const roots = categories.filter((c: any) => !c.parentId);
  const getChildren = (id: string) => categories.filter((c: any) => c.parentId === id);

  return (
    <AdminLayout title="Categories">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <FolderTree size={16} />
            <span className="text-sm font-medium">{categories.length} categories</span>
          </div>
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1">
            <Plus size={14} /> Add Category
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {roots.map((root: any) => (
              <div key={root.id}>
                <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${root.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="font-medium text-slate-800">{root.name}</p>
                      {root.description && <p className="text-xs text-slate-400 truncate max-w-[300px]">{root.description}</p>}
                    </div>
                    <span className="badge badge-gray text-[10px]">{getChildren(root.id).length} sub</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(root)} className="btn btn-ghost btn-xs"><Pencil size={13} /></button>
                    <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(root.id); }}
                      className="btn btn-ghost btn-xs text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
                {getChildren(root.id).map((child: any) => (
                  <div key={child.id} className="flex items-center justify-between px-5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center gap-3 pl-6">
                      <span className="text-slate-300 text-xs">└</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${child.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      <p className="text-sm text-slate-700">{child.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(child)} className="btn btn-ghost btn-xs"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(child.id); }}
                        className="btn btn-ghost btn-xs text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit((d) => {
                // Strip empty strings / undefined so backend validators don't reject them
                const payload: any = { ...d };
                if (!payload.parentId) delete payload.parentId;
                if (!payload.description) delete payload.description;
                saveMutation.mutate(payload);
              })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input {...register('name')} className="input" />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...register('description')} rows={2} className="input resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Category</label>
                <select {...register('parentId')} className="input">
                  <option value="">None (Top Level)</option>
                  {categories.filter((c: any) => !c.parentId && c.id !== editing?.id)
                    .map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                <input {...register('sortOrder', { valueAsNumber: true })} type="number" className="input" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="accent-indigo-600 w-4 h-4" />
                Active (visible on website)
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saveMutation.isPending}
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
