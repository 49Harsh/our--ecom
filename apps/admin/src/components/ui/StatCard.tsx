import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  change?: number | string | null;       // percent change e.g. 12.5 or -3.2 or "12.5%"
  loading?: boolean;
}

export default function StatCard({ title, value, sub, icon: Icon, iconColor = 'bg-indigo-100 text-indigo-600', change, loading }: Props) {
  const numericChange = typeof change === 'number' ? change : (typeof change === 'string' ? parseFloat(change) : null);
  const isPositive = numericChange !== null ? numericChange >= 0 : true;

  return (
    <div className="card p-5">
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-3 w-20" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {Icon && (
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0', iconColor)}>
                <Icon size={18} />
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <div className="flex items-center gap-2 mt-1">
            {change !== undefined && change !== null && (
              <span className={cn('flex items-center gap-0.5 text-xs font-semibold', isPositive ? 'text-emerald-600' : 'text-red-500')}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {numericChange !== null ? `${Math.abs(numericChange)}%` : String(change)}
              </span>
            )}
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
          </div>
        </>
      )}
    </div>
  );
}

