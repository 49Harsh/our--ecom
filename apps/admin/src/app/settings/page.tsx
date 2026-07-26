'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { settingsApi, searchApi } from '@/lib/api';

const GROUPS = ['general', 'payment', 'shipping', 'email', 'seo'];

function SettingRow({ setting, onSave }: { setting: any; onSave: (key: string, value: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(
    typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : String(setting.value ?? '')
  );

  const handleSave = () => {
    let parsed: any = localVal;
    try { parsed = JSON.parse(localVal); } catch { /* not JSON, use as string */ }
    onSave(setting.key, parsed);
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-medium text-slate-700">{setting.key}</p>
        {!editing && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value ?? '—')}
          </p>
        )}
        {editing && (
          <div className="mt-2">
            {typeof setting.value === 'object' ? (
              <textarea value={localVal} onChange={e => setLocalVal(e.target.value)}
                rows={3} className="input resize-none font-mono text-xs w-full"/>
            ) : (
              <input value={localVal} onChange={e => setLocalVal(e.target.value)} className="input"/>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-1 shrink-0 mt-0.5">
        {editing ? (
          <>
            <button onClick={handleSave} className="btn btn-primary btn-xs gap-1"><Save size={11}/> Save</button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-xs">✕</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="btn btn-outline btn-xs">Edit</button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [activeGroup, setActiveGroup] = useState('general');
  const [reindexing, setReindexing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings', activeGroup],
    queryFn: () => settingsApi.getAll(activeGroup),
  });

  const settings = data?.data?.data ?? data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => settingsApi.update(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const handleReindex = async () => {
    setReindexing(true);
    try { await searchApi.reindex(); alert('Reindex started successfully'); }
    catch { alert('Reindex failed — check Meilisearch is running'); }
    finally { setReindexing(false); }
  };

  return (
    <AdminLayout title="Settings">
      {/* Group tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              activeGroup === g ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {g}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-slate-800 mb-4 capitalize">{activeGroup} Settings</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-12 rounded-lg"/>)}</div>
          ) : settings.length === 0 ? (
            <div className="py-10 text-center text-slate-400">No settings in this group</div>
          ) : (
            <div>
              {settings.map((s: any) => (
                <SettingRow key={s.id ?? s.key} setting={s}
                  onSave={(key, value) => updateMutation.mutate({ key, value })}/>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Search Index</h3>
            <p className="text-sm text-slate-500 mb-4">
              Sync all active products to Meilisearch. Run this after bulk imports or if search results are stale.
            </p>
            <button onClick={handleReindex} disabled={reindexing}
              className="btn btn-outline w-full gap-2 disabled:opacity-60">
              {reindexing
                ? <><Loader2 size={14} className="animate-spin"/> Reindexing...</>
                : <><RefreshCw size={14}/> Reindex Products</>}
            </button>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Business Info</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="text-slate-400">Company:</span> R·ECOM Store</p>
              <p><span className="text-slate-400">GST:</span> Configured in .env</p>
              <p><span className="text-slate-400">Currency:</span> INR ₹</p>
              <p><span className="text-slate-400">Timezone:</span> Asia/Kolkata</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
