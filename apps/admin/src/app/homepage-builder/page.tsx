'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, Eye, EyeOff, GripVertical } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { homepageApi } from '@/lib/api';
import { useForm } from 'react-hook-form';

const SECTION_TYPES = [
  'HERO', 'FEATURED_PRODUCTS', 'NEW_ARRIVALS', 'TRENDING',
  'BEST_SELLERS', 'CATEGORIES', 'COLLECTIONS', 'NEWSLETTER', 'REVIEWS', 'CUSTOM',
];

export default function HomepageBuilderPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['homepage-sections'],
    queryFn: () => homepageApi.getSections(),
  });
  const sections = (data?.data?.data ?? data?.data ?? []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { type: 'NEW_ARRIVALS', title: '', sortOrder: 0, isActive: true, dataRaw: '{}' },
  });

  const openCreate = () => { setEditing(null); reset({ type: 'NEW_ARRIVALS', title: '', sortOrder: sections.length, isActive: true, dataRaw: '{}' }); setShowForm(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    reset({ type: s.type, title: s.title ?? '', sortOrder: s.sortOrder, isActive: s.isActive, dataRaw: JSON.stringify(s.data ?? {}, null, 2) });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (d: any) => {
      const payload = { ...d, data: (() => { try { return JSON.parse(d.dataRaw); } catch { return {}; } })() };
      delete payload.dataRaw;
      return editing ? homepageApi.update(editing.id, payload) : homepageApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homepage-sections'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => homepageApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homepage-sections'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      homepageApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homepage-sections'] }),
  });

  const SECTION_ICONS: Record<string, string> = {
    HERO: '🖼️', FEATURED_PRODUCTS: '⭐', NEW_ARRIVALS: '🆕', TRENDING: '🔥',
    BEST_SELLERS: '🏆', CATEGORIES: '📂', COLLECTIONS: '🗂️', NEWSLETTER: '📧', REVIEWS: '⭐', CUSTOM: '🔧',
  };

  return (
    <AdminLayout title="Homepage Builder">
      <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800">
        Drag to reorder sections. Toggle visibility without deleting. Changes reflect immediately on the website.
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-medium text-slate-800">{sections.length} sections</p>
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1"><Plus size={14}/> Add Section</button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-16 rounded-lg"/>)}</div>
        ) : sections.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No homepage sections. Start building your layout.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sections.map((s: any, i: number) => (
              <div key={s.id} className={`flex items-center gap-4 p-4 transition-colors ${s.isActive ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-60'}`}>
                <GripVertical size={16} className="text-slate-300 shrink-0 cursor-grab"/>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg shrink-0">
                  {SECTION_ICONS[s.type] ?? '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{s.title ?? s.type.replace(/_/g, ' ')}</p>
                    <span className="badge badge-purple text-[10px]">{s.type}</span>
                  </div>
                  <p className="text-xs text-slate-400">Sort order: {s.sortOrder}</p>
                </div>
                <span className={`badge shrink-0 ${s.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {s.isActive ? 'Visible' : 'Hidden'}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                    className="btn btn-ghost btn-xs" title={s.isActive ? 'Hide' : 'Show'}>
                    {s.isActive ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                  <button onClick={() => openEdit(s)} className="btn btn-ghost btn-xs"><Pencil size={13}/></button>
                  <button onClick={() => { if(confirm('Delete section?')) deleteMutation.mutate(s.id); }}
                    className="btn btn-ghost btn-xs text-red-500"><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)}/>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editing ? 'Edit Section' : 'Add Section'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section Type *</label>
                <select {...register('type')} className="input">
                  {SECTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Title</label>
                <input {...register('title')} className="input" placeholder="New Arrivals"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                <input {...register('sortOrder', { valueAsNumber: true })} type="number" className="input"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Section Data (JSON)
                  <span className="text-slate-400 font-normal ml-1">— product IDs, config, etc.</span>
                </label>
                <textarea {...register('dataRaw')} rows={4} className="input resize-none font-mono text-xs"/>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="accent-indigo-600 w-4 h-4"/>
                Visible on website
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary gap-2 disabled:opacity-60">
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : editing ? 'Update' : 'Create'}
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
