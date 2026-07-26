'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import { heroBannerApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  image: z.string().url('Must be a valid URL'),
  mobileImage: z.string().optional(),
  link: z.string().optional(),
  ctaText: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function HeroBannerPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hero-banners-admin'],
    queryFn: () => heroBannerApi.getAll(),
  });
  const banners = data?.data?.data ?? data?.data ?? [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, sortOrder: 0, ctaText: 'Shop Now' },
  });

  const imageUrl = watch('image');

  const openCreate = () => { setEditing(null); reset({ isActive: true, sortOrder: 0, ctaText: 'Shop Now' }); setShowForm(true); };
  const openEdit = (b: any) => {
    setEditing(b);
    reset({ title: b.title, subtitle: b.subtitle ?? '', image: b.image, mobileImage: b.mobileImage ?? '',
      link: b.link ?? '', ctaText: b.ctaText ?? '', isActive: b.isActive, sortOrder: b.sortOrder,
      startDate: b.startDate?.slice(0,10) ?? '', endDate: b.endDate?.slice(0,10) ?? '' });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? heroBannerApi.update(editing.id, d) : heroBannerApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hero-banners-admin'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => heroBannerApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero-banners-admin'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      heroBannerApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero-banners-admin'] }),
  });

  return (
    <AdminLayout title="Hero Banners">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-medium text-slate-800">{banners.length} banners</p>
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1"><Plus size={14}/> Add Banner</button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-24 rounded-lg"/>)}</div>
        ) : banners.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No banners yet. Add your first hero banner.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {banners.map((banner: any) => (
              <div key={banner.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <GripVertical size={16} className="text-slate-300 shrink-0 cursor-grab" />
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative">
                  {banner.image && (
                    <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="80px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{banner.title}</p>
                  {banner.subtitle && <p className="text-xs text-slate-400 truncate">{banner.subtitle}</p>}
                  {banner.link && <p className="text-xs text-indigo-500 truncate">{banner.link}</p>}
                </div>
                <span className={`badge shrink-0 ${banner.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {banner.isActive ? 'Active' : 'Hidden'}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                    className="btn btn-ghost btn-xs">
                    {banner.isActive ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                  <button onClick={() => openEdit(banner)} className="btn btn-ghost btn-xs"><Pencil size={13}/></button>
                  <button onClick={() => { if(confirm('Delete banner?')) deleteMutation.mutate(banner.id); }}
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editing ? 'Edit Banner' : 'Add Banner'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              {/* Preview */}
              {imageUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                  <Image src={imageUrl} alt="Preview" fill className="object-cover" sizes="500px"
                    onError={() => {}} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input {...register('title')} className="input"/>
                {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
                <input {...register('subtitle')} className="input"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Desktop Image URL *</label>
                <input {...register('image')} className="input" placeholder="https://..."/>
                {errors.image && <p className="text-xs text-red-600 mt-1">{errors.image.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Image URL</label>
                <input {...register('mobileImage')} className="input" placeholder="https://... (optional)"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link URL</label>
                  <input {...register('link')} className="input" placeholder="/shop"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Button Text</label>
                  <input {...register('ctaText')} className="input"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input {...register('startDate')} type="date" className="input"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input {...register('endDate')} type="date" className="input"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                  <input {...register('sortOrder', { valueAsNumber: true })} type="number" className="input"/>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="accent-indigo-600 w-4 h-4"/>
                Active (visible on website)
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
