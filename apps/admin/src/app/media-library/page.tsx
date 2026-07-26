'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Copy, Check, Loader2, Image as ImageIcon, Search } from 'lucide-react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import { uploadsApi } from '@/lib/api';

export default function MediaLibraryPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['media', search],
    queryFn: () => uploadsApi.getAll({ search, limit: 60 }),
  });

  const media = data?.data?.data ?? data?.data ?? [];

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      await uploadsApi.uploadMulti(fd);
      qc.invalidateQueries({ queryKey: ['media'] });
    } catch { alert('Upload failed'); }
    finally { setUploading(false); }
  };

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => uploadsApi.delete(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AdminLayout title="Media Library">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`mb-5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
        }`}
      >
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => handleUpload(e.target.files)} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-indigo-600">
            <Loader2 size={22} className="animate-spin" />
            <span className="font-medium">Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">Drop images here or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 10MB each</p>
          </>
        )}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..." className="input !pl-8 !py-2 text-sm" />
        </div>
        {!isLoading && <span className="text-sm text-slate-500">{media.length} files</span>}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="card py-20 text-center">
          <ImageIcon size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No media files yet. Upload your first image.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((item: any) => (
            <div key={item.publicId ?? item.url} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <Image
                src={item.url} alt={item.filename ?? 'media'}
                fill className="object-cover"
                sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 16vw"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <button onClick={() => copyUrl(item.url)}
                  className="btn btn-xs gap-1 !bg-white !text-slate-800 w-full">
                  {copied === item.url ? <Check size={11} /> : <Copy size={11} />}
                  {copied === item.url ? 'Copied!' : 'Copy URL'}
                </button>
                <button
                  onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.publicId ?? item.url); }}
                  className="btn btn-xs gap-1 !bg-red-500 !text-white w-full">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
              <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-1 truncate
                opacity-0 group-hover:opacity-100 transition-opacity">
                {item.filename ?? item.publicId ?? 'image'}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
