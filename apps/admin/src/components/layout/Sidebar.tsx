'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, BarChart2,
  MessageSquare, RotateCcw, Layers, Image, LayoutGrid, Archive,
  FileText, Settings, Shield, Activity, Truck, Star, LogOut,
  ChevronRight, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

const nav = [
  { label: 'Dashboard',        href: '/dashboard',         icon: LayoutDashboard },
  { label: 'Orders',           href: '/orders',             icon: ShoppingBag },
  { label: 'Products',         href: '/products',           icon: Package },
  { label: 'Categories',       href: '/categories',         icon: Layers },
  { label: 'Inventory',        href: '/inventory',          icon: Archive },
  { label: 'Customers',        href: '/customers',          icon: Users },
  { label: 'Reviews',          href: '/reviews',            icon: Star },
  { label: 'Returns',          href: '/returns',            icon: RotateCcw },
  { label: 'Coupons',          href: '/coupons',            icon: Tag },
  { label: 'Invoices',         href: '/invoices',           icon: FileText },
  { label: 'Shipping',         href: '/shipping',           icon: Truck },
  { label: 'Hero Banners',     href: '/hero-banner',        icon: Image },
  { label: 'Homepage Builder', href: '/homepage-builder',   icon: LayoutGrid },
  { label: 'Analytics',        href: '/analytics',          icon: BarChart2 },
  { label: 'Reports',          href: '/reports',            icon: BarChart2 },
  { label: 'Admins',           href: '/admins',             icon: Shield },
  { label: 'Permissions',      href: '/permissions',        icon: Shield },
  { label: 'Settings',         href: '/settings',           icon: Settings },
  { label: 'Activity Logs',    href: '/logs',               icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const rt = localStorage.getItem('adminRefreshToken');
    if (rt) { try { await authApi.logout(rt); } catch {} }
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    router.push('/auth/login');
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-40"
      style={{ width: 'var(--sidebar-width, 240px)', background: '#0f172a' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">R·ECOM</p>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {active && <ChevronRight size={12} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
