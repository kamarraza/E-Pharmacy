'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface NavItem {
  href: string;
  label: string;
}

interface NotificationPreview {
  prescription: {
    id: string;
    patientName: string;
    location: string;
    createdAt: string;
  };
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPreview, setNotificationPreview] = useState<NotificationPreview[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const loadNotificationState = () => {
      try {
        const unread = Number(localStorage.getItem('pharmacy_notifications_unread') || '0');
        const raw = localStorage.getItem('pharmacy_notifications');
        const parsed = raw ? (JSON.parse(raw) as NotificationPreview[]) : [];
        setUnreadCount(Number.isNaN(unread) ? 0 : unread);
        setNotificationPreview(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
      } catch (error) {
        console.error('Failed to read notification badge state:', error);
      }
    };

    loadNotificationState();
    window.addEventListener('notification-updated', loadNotificationState);
    window.addEventListener('storage', loadNotificationState);

    return () => {
      window.removeEventListener('notification-updated', loadNotificationState);
      window.removeEventListener('storage', loadNotificationState);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch {
      // Guest state is valid.
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setIsMobileMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = useMemo(() => {
    const common: NavItem[] = [{ href: '/', label: 'Home' }];

    if (user?.role === 'patient') {
      return [
        ...common,
        { href: '/pharmacies', label: 'Nearby Pharmacies' },
        { href: '/upload', label: 'Upload' },
        { href: '/history', label: 'History' },
      ];
    }

    if (user?.role === 'pharmacist') {
      return [
        ...common,
        { href: '/pharmacies', label: 'Nearby Pharmacies' },
        { href: '/subscribe', label: 'Plans' },
        { href: '/dashboard', label: 'Dashboard' },
      ];
    }

    return [...common, { href: '/pharmacies', label: 'Nearby Pharmacies' }];
  }, [user?.role]);

  const navLinkClass = (href: string) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      pathname === href
        ? 'bg-white text-slate-900'
        : 'text-slate-200 hover:bg-white/10 hover:text-white'
    }`;

  const mobileNavLinkClass = (href: string) =>
    `block rounded-xl px-4 py-3 text-sm font-medium transition ${
      pathname === href
        ? 'bg-cyan-300 text-slate-900'
        : 'text-slate-200 hover:bg-white/10 hover:text-white'
    }`;

  const handleNotificationToggle = () => {
    const next = !isNotificationOpen;
    setIsNotificationOpen(next);
    if (next) {
      localStorage.setItem('pharmacy_notifications_unread', '0');
      setUnreadCount(0);
      window.dispatchEvent(new Event('notification-updated'));
    }
  };

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/20 text-cyan-100">
            ✚
          </span>
          <div>
            <p className="text-sm font-semibold text-white">E-Pharmacy</p>
            <p className="text-[11px] text-slate-300">Patient & Pharmacy Network</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <span className="text-sm text-slate-300">Checking session...</span>
          ) : user ? (
            <>
              {user.role === 'pharmacist' && (
                <div className="relative">
                  <button
                    onClick={handleNotificationToggle}
                    className="relative rounded-full border border-white/15 bg-white/5 p-2 text-slate-100 hover:bg-white/10"
                    aria-label="Toggle notifications"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
                      />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Notifications</p>
                        <button
                          onClick={() => setIsNotificationOpen(false)}
                          className="text-xs text-slate-300 hover:text-white"
                        >
                          Close
                        </button>
                      </div>
                      {notificationPreview.length === 0 ? (
                        <p className="text-sm text-slate-300">No recent notifications.</p>
                      ) : (
                        <div className="space-y-2">
                          {notificationPreview.map((item) => (
                            <div key={`${item.prescription.id}-${item.prescription.createdAt}`} className="rounded-lg border border-white/10 bg-slate-900/70 p-2">
                              <p className="text-sm text-white">{item.prescription.patientName}</p>
                              <p className="text-xs text-slate-300">
                                {item.prescription.location} • {new Date(item.prescription.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {user.role}: {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-rose-300/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="rounded-lg border border-white/15 p-2 text-slate-200 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 pb-4 pt-3 md:hidden">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileNavLinkClass(item.href)}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            {isLoading ? (
              <p className="text-sm text-slate-300">Checking session...</p>
            ) : user ? (
              <div className="space-y-2">
                <p className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-slate-200">
                  {user.role}: {user.name}
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-rose-300/30 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-slate-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-slate-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
