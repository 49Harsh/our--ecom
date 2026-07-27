'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Loader2, X, GripVertical, Eye, EyeOff,
  Upload, ImageIcon, Link2, CloudUpload, CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import { heroBannerApi, uploadsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  title:       z.string().min(2, 'Title is required'),
  subtitle:    z.string().optional(),
  image:       z.string().min(1, 'Image is required'),
  mobileImage: z.string().optional(),
  link:        z.string().optional(),
  ctaText:     z.string().optional(),
  isActive:    z.boolean().optional(),
  sortOrder:   z.number().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Image Upload Zone ────────────────────────────────────────────────────────
function ImageUploadZone({
  value,
  onChange,
  label,
  folder = 'banners',
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  folder?: string;
}) {
  const [tab, setTab]         = useState<'upload' | 'url'>(value ? 'url' : 'upload');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [urlInput, setUrlInput]   = useState(value ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadError('Only image files allowed'); return; }
    if (file.size > 10 * 1024 * 1024)   { setUploadError('Image must be under 10MB'); return; }
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadsApi.upload(formData);
      const url = res?.data?.data?.url ?? res?.data?.url ?? '';
      if (url) { onChange(url); setUrlInput(url); }
      else setUploadError('Upload failed — no URL returned');
    } catch (e: any) {
      setUploadError(e?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const onUrlBlur = () => {
    if (urlInput.startsWith('http')) onChange(urlInput);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'upload', label: 'Upload', icon: Upload },
          { key: 'url',    label: 'URL',    icon: Link2 },
        ].map(({ key, label: lbl, icon: Icon }) => (
          <button key={key} type="button"
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={12} /> {lbl}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer select-none ${
            dragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
          }`}
        >
          <input
            ref={fileRef} type="file" accept="image/*"
            className="hidden" onChange={onFileChange}
          />

          {value && !uploading ? (
            /* Preview with overlay */
            <div className="relative w-full h-40 rounded-xl overflow-hidden">
              <Image src={value} alt="Preview" fill className="object-cover" sizes="500px" />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                <CloudUpload size={24} className="text-white" />
                <p className="text-white text-xs font-medium">Click or drop to replace</p>
              </div>
              <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                <CheckCircle2 size={14} />
              </div>
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500">Uploading to Cloudinary…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <ImageIcon size={20} className="text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Drag & drop or <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP · Max 10 MB</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={onUrlBlur}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onUrlBlur())}
              placeholder="https://res.cloudinary.com/..."
              className="input flex-1 text-sm"
            />
            <button type="button" onClick={onUrlBlur}
              className="btn btn-outline btn-sm px-3">
              Apply
            </button>
          </div>
          {/* URL preview */}
          {value && value.startsWith('http') && (
            <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100">
              <Image src={value} alt="Preview" fill className="object-cover" sizes="500px"
                onError={() => {}} />
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <X size={11} /> {uploadError}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HeroBannerPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hero-banners-admin'],
    queryFn:  () => heroBannerApi.getAll(),
  });
  const banners: any[] = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data) ? data.data : [];

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, sortOrder: 0, ctaText: 'Shop Now' },
  });

  const imageValue       = watch('image')       ?? '';
  const mobileImageValue = watch('mobileImage') ?? '';

  const openCreate = () => {
    setEditing(null);
    reset({ isActive: true, sortOrder: 0, ctaText: 'Shop Now' });
    setShowForm(true);
  };
  const openEdit = (b: any) => {
    setEditing(b);
    reset({
      title: b.title, subtitle: b.subtitle ?? '', image: b.image,
      mobileImage: b.mobileImage ?? '', link: b.link ?? '',
      ctaText: b.ctaText ?? 'Shop Now', isActive: b.isActive,
      sortOrder: b.sortOrder ?? 0,
      startDate: b.startDate?.slice(0, 10) ?? '',
      endDate:   b.endDate?.slice(0, 10) ?? '',
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (d: any) => {
      const payload: any = { ...d };
      if (!payload.subtitle)    delete payload.subtitle;
      if (!payload.mobileImage) delete payload.mobileImage;
      if (!payload.link)        delete payload.link;
      if (!payload.startDate)   delete payload.startDate;
      if (!payload.endDate)     delete payload.endDate;
      if (payload.startDate)    payload.startDate = new Date(payload.startDate).toISOString();
      if (payload.endDate)      payload.endDate   = new Date(payload.endDate).toISOString();
      return editing ? heroBannerApi.update(editing.id, payload) : heroBannerApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hero-banners-admin'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => heroBannerApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['hero-banners-admin'] }),
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
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1">
            <Plus size={14} /> Add Banner
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p>No banners yet. Add your first hero banner.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {banners.map((banner: any) => (
              <div key={banner.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <GripVertical size={16} className="text-slate-300 shrink-0 cursor-grab" />
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative">
                  {banner.image && (
                    <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="80px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{banner.title}</p>
                  {banner.subtitle && <p className="text-xs text-slate-400 truncate">{banner.subtitle}</p>}
                  {banner.link    && <p className="text-xs text-indigo-500 truncate">{banner.link}</p>}
                </div>
                <span className={`badge shrink-0 ${banner.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {banner.isActive ? 'Active' : 'Hidden'}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                    className="btn btn-ghost btn-xs">
                    {banner.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button onClick={() => openEdit(banner)} className="btn btn-ghost btn-xs">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { if (confirm('Delete banner?')) deleteMutation.mutate(banner.id); }}
                    className="btn btn-ghost btn-xs text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between px-6 py-4 z-10 rounded-t-2xl">
              <h2 className="font-bold text-lg text-slate-800">
                {editing ? 'Edit Banner' : 'Add Hero Banner'}
              </h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-5">
              {/* Desktop Image Upload */}
              <ImageUploadZone
                label="Desktop Image *"
                value={imageValue}
                onChange={(url) => setValue('image', url, { shouldValidate: true })}
                folder="banners"
              />
              {errors.image && (
                <p className="text-xs text-red-600 -mt-3">{errors.image.message}</p>
              )}

              {/* Mobile Image Upload */}
              <ImageUploadZone
                label="Mobile Image (optional)"
                value={mobileImageValue}
                onChange={(url) => setValue('mobileImage', url)}
                folder="banners"
              />

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input {...register('title')} className="input" placeholder="Summer Sale — Up to 50% Off" />
                {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
                <input {...register('subtitle')} className="input" placeholder="Explore the new collection" />
              </div>

              {/* Link + CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link URL</label>
                  <input {...register('link')} className="input" placeholder="/shop" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Button Text</label>
                  <input {...register('ctaText')} className="input" placeholder="Shop Now" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input {...register('startDate')} type="date" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input {...register('endDate')} type="date" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                  <input {...register('sortOrder', { valueAsNumber: true })} type="number" className="input" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" {...register('isActive')} className="accent-indigo-600 w-4 h-4" />
                Active (visible on website)
              </label>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="submit" disabled={saveMutation.isPending}
                  className="btn btn-primary gap-2 disabled:opacity-60">
                  {saveMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : editing ? 'Update Banner' : 'Create Banner'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
