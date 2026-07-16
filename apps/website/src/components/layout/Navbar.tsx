'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingBag, Heart, User, Menu, X,
  ChevronDown, LogOut, Package, MapPin, Settings,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, cartApi, usersApi } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

// ─── Nav Links ─────────────────────────────────────────────────────────────
const staticNav = [
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Shop',         href: '/shop' },
  { label: 'Sale',         href: '/shop?status=SALE' },
];

// ─── Announcement Bar ───────────────────────────────────────────────────────
function AnnouncementBar() {
  const msgs = [
    'Free Shipping on orders above ₹999',
    'New collection just dropped — Shop Now',
    'Easy 15-day returns on all orders',
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % msgs.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-black text-white text-xs tracking-widest uppercase text-center py-2 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {msgs[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ─── Search Overlay ─────────────────────────────────────────────────────────
function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white/98 backdrop-blur-sm flex items-start justify-center pt-24 px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products, brands, categories..."
            className="w-full pl-12 pr-14 py-4 text-lg border-b-2 border-gray-900 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X size={20} />
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-400 tracking-wider uppercase">
          Press Enter to search · Esc to close
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Mobile Drawer ──────────────────────────────────────────────────────────
function MobileDrawer({
  open,
  onClose,
  categories,
  user,
  cartCount,
  wishlistCount,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  user: any;
  cartCount: number;
  wishlistCount: number;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[300px] bg-white shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <Link href="/" className="font-serif text-xl font-bold tracking-tight text-black">
                R·ECOM
              </Link>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4">
              {staticNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-black transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              {categories.length > 0 && (
                <>
                  <div className="px-5 pt-4 pb-2">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                      Categories
                    </span>
                  </div>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              {user ? (
                <>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    <User size={16} /> My Profile
                  </Link>
                  <Link href="/orders" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    <Package size={16} /> My Orders
                  </Link>
                  <Link href="/wishlist" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    <Heart size={16} /> Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                  </Link>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/auth/login" className="btn btn-primary text-center">Sign In</Link>
                  <Link href="/auth/register" className="btn btn-outline text-center">Create Account</Link>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── User Dropdown ──────────────────────────────────────────────────────────
function UserDropdown({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 hover:text-black"
        aria-expanded={open}
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
          {user.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <span className="hidden lg:block max-w-[80px] truncate">{user.name?.split(' ')[0]}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          >
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            {[
              { href: '/profile',   icon: User,     label: 'My Profile' },
              { href: '/orders',    icon: Package,  label: 'My Orders' },
              { href: '/wishlist',  icon: Heart,    label: 'Wishlist' },
              { href: '/addresses', icon: MapPin,   label: 'Addresses' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
              >
                <Icon size={14} className="text-gray-400" /> {label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-1" />
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Navbar ────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load user from localStorage
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      usersApi.getMe()
        .then((res) => setUser(res.data))
        .catch(() => setUser(null));
    }
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Lock body scroll when search open
  useEffect(() => {
    document.body.style.overflow = searchOpen ? 'hidden' : '';
  }, [searchOpen]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'nav'],
    queryFn: () => categoriesApi.getAll({ limit: 12 }),
    staleTime: 5 * 60 * 1000,
  });
  const categories: Category[] = categoriesData?.data?.data ?? [];

  // Fetch cart count
  const { data: cartData } = useQuery({
    queryKey: ['cart', 'count'],
    queryFn: () => cartApi.get(),
    staleTime: 30_000,
    retry: false,
  });
  const cartCount: number = cartData?.data?.totals?.itemCount ?? 0;

  // Logout
  const handleLogout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await import('@/lib/api').then((m) => m.authApi.logout(refreshToken)); } catch {}
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);

  // Keyboard shortcut: Cmd+K / Ctrl+K for search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '?');

  return (
    <>
      <AnnouncementBar />

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'var(--navbar-bg)',
          borderBottom: `1px solid ${scrolled ? 'var(--color-border)' : 'transparent'}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
          height: 'var(--navbar-height)',
        }}
      >
        <div className="container-site h-full flex items-center gap-6">
          {/* ── Hamburger (mobile) ── */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* ── Logo ── */}
          <Link
            href="/"
            className="font-serif text-2xl font-bold tracking-tight text-black shrink-0"
          >
            R·ECOM
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {staticNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${isActive(item.href)
                    ? 'text-black'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-black rounded-full"
                  />
                )}
              </Link>
            ))}

            {/* Categories mega dropdown */}
            {categories.length > 0 && (
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-md transition-colors">
                  Categories
                  <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 mt-1 hidden group-hover:grid grid-cols-3 gap-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
                  {categories.slice(0, 9).map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-black rounded-md transition-colors truncate"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-black hover:bg-gray-100 transition-colors relative group"
              aria-label="Search (Ctrl+K)"
            >
              <Search size={20} />
              <span className="hidden lg:block absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                ⌘K
              </span>
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="p-2 rounded-md text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
              aria-label="Wishlist"
            >
              <Heart size={20} />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 rounded-md text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
              aria-label={`Cart (${cartCount} items)`}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="badge absolute -top-0.5 -right-0.5 text-[10px]"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </motion.span>
              )}
            </Link>

            {/* User */}
            {user ? (
              <UserDropdown user={user} onLogout={handleLogout} />
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-md transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="btn btn-primary !py-1.5 !px-4 text-xs"
                >
                  Register
                </Link>
              </div>
            )}
            {/* Mobile user icon */}
            {!user && (
              <Link href="/auth/login" className="md:hidden p-2 rounded-md text-gray-600 hover:text-black hover:bg-gray-100">
                <User size={20} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        user={user}
        cartCount={cartCount}
        wishlistCount={0}
        onLogout={handleLogout}
      />
    </>
  );
}
