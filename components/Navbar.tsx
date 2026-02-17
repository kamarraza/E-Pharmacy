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

interface PharmacistNotificationPreview {
  prescription: {
    id: string;
    patientName: string;
    location: string;
    createdAt: string;
    status?: string;
    selectedPharmacyIds?: string[];
  };
}

interface PrescriptionApiItem {
  _id: string;
  patientName: string;
  location: string;
  createdAt: string;
  status?: string;
  pharmacyStatuses?: Array<{
    pharmacyId?: string;
    status?: string;
    assignedAt?: string | null;
    completedAt?: string | null;
  }>;
}

interface PatientNotificationPreview {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  actionType?: 'confirm_fulfillment';
  prescriptionId?: string;
  pharmacyId?: string;
}

interface PatientHistoryItem {
  _id: string;
  createdAt: string;
  pharmacyDetails?: Array<{
    pharmacyId?: string;
    name?: string;
    status?: string;
    assignedAt?: string | null;
    completedAt?: string | null;
  }>;
}

interface NavNotificationItem {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  actionType?: 'confirm_fulfillment';
  prescriptionId?: string;
  pharmacyId?: string;
}

interface ProfileMenuItem {
  href: string;
  label: string;
}

const STORAGE_NOTIFICATIONS_KEY = 'pharmacy_notifications';
const STORAGE_UNREAD_KEY = 'pharmacy_notifications_unread';
const STORAGE_PATIENT_NOTIFICATIONS_KEY = 'patient_notifications';
const STORAGE_PATIENT_UNREAD_KEY = 'patient_notifications_unread';
const STORAGE_THEME_KEY = 'pharmacy_theme';
const MAX_NOTIFICATION_ITEMS = 100;

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPreview, setNotificationPreview] = useState<NavNotificationItem[]>([]);
  const [confirmingNotificationId, setConfirmingNotificationId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      return savedTheme ? savedTheme === 'dark' : true;
    } catch {
      return true;
    }
  });
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      try {
        const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch {
        // Ignore storage/read issues and preserve current in-memory state.
      }
    };

    syncTheme();
    window.addEventListener('theme-updated', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('theme-updated', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const nextTheme = isDarkMode ? 'dark' : 'light';
    root.setAttribute('data-theme', nextTheme);
    localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
    window.dispatchEvent(new Event('theme-updated'));
  }, [isDarkMode]);

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
    if (!isProfileOpen) {
      return;
    }

    const handleClickOutsideProfile = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideProfile);
    return () => document.removeEventListener('mousedown', handleClickOutsideProfile);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isNotificationOpen) {
      return;
    }

    const handleClickOutsideNotification = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideNotification);
    return () => document.removeEventListener('mousedown', handleClickOutsideNotification);
  }, [isNotificationOpen]);

  useEffect(() => {
    const loadNotificationState = () => {
      try {
        if (user?.role === 'patient') {
          const unread = Number(localStorage.getItem(STORAGE_PATIENT_UNREAD_KEY) || '0');
          const raw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
          const parsed = raw ? (JSON.parse(raw) as PatientNotificationPreview[]) : [];
          const items = Array.isArray(parsed)
            ? parsed.slice(0, 5).map((item) => ({
                id: item.id || `${item.title}-${item.createdAt}`,
                title: item.title || 'Notification',
                subtitle: item.message || '',
                createdAt: item.createdAt || '',
                actionType: item.actionType,
                prescriptionId: item.prescriptionId,
                pharmacyId: item.pharmacyId,
              }))
            : [];
          setUnreadCount(Number.isNaN(unread) ? 0 : unread);
          setNotificationPreview(items);
          return;
        }

        const unread = Number(localStorage.getItem(STORAGE_UNREAD_KEY) || '0');
        const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
        const parsed = raw ? (JSON.parse(raw) as PharmacistNotificationPreview[]) : [];
        const items = Array.isArray(parsed)
          ? parsed.slice(0, 5).map((item) => ({
              id: `${item.prescription.id}-${item.prescription.createdAt}`,
              title: item.prescription.patientName,
              subtitle: `${(item.prescription.status || 'pending').replace('_', ' ')} • ${item.prescription.location}`,
              createdAt: item.prescription.createdAt,
            }))
          : [];
        setUnreadCount(Number.isNaN(unread) ? 0 : unread);
        setNotificationPreview(items);
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
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'pharmacist') return;
    if (pathname === '/dashboard' || pathname === '/notifications') return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PharmacistNotificationPreview & { type?: string };
          if (data.type !== 'new_prescription' || !data?.prescription?.id) return;

          const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
          const existing = raw ? (JSON.parse(raw) as PharmacistNotificationPreview[]) : [];
          const exists = existing.some(
            (item) =>
              item.prescription.id === data.prescription.id &&
              item.prescription.createdAt === data.prescription.createdAt
          );

          if (!exists) {
            const merged = [data, ...existing].slice(0, MAX_NOTIFICATION_ITEMS);
            localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(merged));
            const unreadCount = Number(localStorage.getItem(STORAGE_UNREAD_KEY) || '0');
            localStorage.setItem(STORAGE_UNREAD_KEY, String(unreadCount + 1));
            window.dispatchEvent(new Event('notification-updated'));
          }
        } catch (error) {
          console.error('Failed to process navbar notification stream event:', error);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, [pathname, user?.role]);

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
      setIsProfileOpen(false);
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

    return [
      ...common,
      { href: '/pharmacies', label: 'Nearby Pharmacies' },
      { href: '/subscribe', label: 'Plans' },
    ];
  }, [user?.role]);

  const profileMenuItems = useMemo<ProfileMenuItem[]>(
    () => [
      { href: '/profile', label: 'Profile Details' },
      { href: '/settings', label: 'Settings' },
    ],
    []
  );

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
      const unreadKey = user?.role === 'patient' ? STORAGE_PATIENT_UNREAD_KEY : STORAGE_UNREAD_KEY;
      localStorage.setItem(unreadKey, '0');
      setUnreadCount(0);
      window.dispatchEvent(new Event('notification-updated'));
    }
  };

  const handleConfirmFulfillmentFromNotification = async (item: NavNotificationItem) => {
    if (user?.role !== 'patient') return;
    if (item.actionType !== 'confirm_fulfillment' || !item.prescriptionId || !item.pharmacyId) return;

    try {
      setConfirmingNotificationId(item.id);
      const response = await fetch(`/api/prescriptions/${item.prescriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirm_fulfillment', pharmacyId: item.pharmacyId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to confirm fulfillment');
      }

      const nowIso = new Date().toISOString();
      const confirmationNotice: PatientNotificationPreview = {
        id: `${item.prescriptionId}-${item.pharmacyId}-fulfilled`,
        title: 'Fulfillment confirmed',
        message: 'Prescription status updated to fulfilled.',
        createdAt: nowIso,
      };
      const raw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
      const existing = raw ? (JSON.parse(raw) as PatientNotificationPreview[]) : [];
      const filtered = Array.isArray(existing)
        ? existing.filter(
            (entry) =>
              !(
                entry.actionType === 'confirm_fulfillment' &&
                entry.prescriptionId === item.prescriptionId &&
                entry.pharmacyId === item.pharmacyId
              ) && entry.id !== item.id
          )
        : [];
      const merged = [confirmationNotice, ...filtered].slice(0, MAX_NOTIFICATION_ITEMS);
      localStorage.setItem(STORAGE_PATIENT_NOTIFICATIONS_KEY, JSON.stringify(merged));

      const unreadCount = Number(localStorage.getItem(STORAGE_PATIENT_UNREAD_KEY) || '0');
      localStorage.setItem(STORAGE_PATIENT_UNREAD_KEY, String(unreadCount + 1));
      window.dispatchEvent(new Event('notification-updated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm fulfillment right now.';
      if (message.toLowerCase().includes('no pending fulfillment confirmation request')) {
        // Request already resolved earlier; replace action item with a non-action status item.
        const resolvedNotice: PatientNotificationPreview = {
          id: `${item.prescriptionId}-${item.pharmacyId}-fulfilled`,
          title: 'Fulfillment confirmed',
          message: 'Prescription status is already fulfilled.',
          createdAt: new Date().toISOString(),
        };
        const raw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
        const existing = raw ? (JSON.parse(raw) as PatientNotificationPreview[]) : [];
        const filtered = Array.isArray(existing)
          ? existing.filter(
              (entry) =>
                !(
                  entry.actionType === 'confirm_fulfillment' &&
                  entry.prescriptionId === item.prescriptionId &&
                  entry.pharmacyId === item.pharmacyId
                ) && entry.id !== item.id
            )
          : [];
        const merged = [resolvedNotice, ...filtered].slice(0, MAX_NOTIFICATION_ITEMS);
        localStorage.setItem(STORAGE_PATIENT_NOTIFICATIONS_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('notification-updated'));
        return;
      }

      const failNotice: PatientNotificationPreview = {
        id: `patient-confirm-failed-${Date.now()}`,
        title: 'Confirmation failed',
        message,
        createdAt: new Date().toISOString(),
      };
      const raw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
      const existing = raw ? (JSON.parse(raw) as PatientNotificationPreview[]) : [];
      const merged = [failNotice, ...(Array.isArray(existing) ? existing : [])].slice(0, MAX_NOTIFICATION_ITEMS);
      localStorage.setItem(STORAGE_PATIENT_NOTIFICATIONS_KEY, JSON.stringify(merged));
      const unreadCount = Number(localStorage.getItem(STORAGE_PATIENT_UNREAD_KEY) || '0');
      localStorage.setItem(STORAGE_PATIENT_UNREAD_KEY, String(unreadCount + 1));
      window.dispatchEvent(new Event('notification-updated'));
    } finally {
      setConfirmingNotificationId(null);
    }
  };

  useEffect(() => {
    if (user?.role !== 'pharmacist') return;

    const hydrateFromRecentActivity = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
        const existing = raw ? (JSON.parse(raw) as PharmacistNotificationPreview[]) : [];
        if (Array.isArray(existing) && existing.length > 0) return;

        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;
        const mePayload = await meRes.json();
        const location = typeof mePayload?.user?.location === 'string' ? mePayload.user.location : '';
        const pharmacyId = typeof mePayload?.user?.pharmacyId === 'string' ? mePayload.user.pharmacyId : '';
        if (!location || !pharmacyId) return;

        const rxRes = await fetch(`/api/prescriptions?location=${encodeURIComponent(location)}&status=all`);
        if (!rxRes.ok) return;
        const rxPayload = (await rxRes.json()) as PrescriptionApiItem[];
        if (!Array.isArray(rxPayload) || rxPayload.length === 0) return;

        const own = rxPayload
          .filter((item) =>
            item.pharmacyStatuses?.some((entry) => String(entry?.pharmacyId || '') === pharmacyId)
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_NOTIFICATION_ITEMS)
          .map((item) => ({
            prescription: {
              id: item._id,
              patientName: item.patientName,
              location: item.location,
              createdAt: item.createdAt,
              status:
                item.pharmacyStatuses?.find((entry) => String(entry?.pharmacyId || '') === pharmacyId)?.status ||
                item.status ||
                'pending',
            },
          }));

        if (own.length > 0) {
          localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(own));
          window.dispatchEvent(new Event('notification-updated'));
        }
      } catch {
        // Keep navbar functional if fallback hydration fails.
      }
    };

    hydrateFromRecentActivity();
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'patient') return;

    const hydratePatientNotificationsFromHistory = async () => {
      try {
        const response = await fetch('/api/patient/history');
        if (!response.ok) return;

        const prescriptions = (await response.json()) as PatientHistoryItem[];
        if (!Array.isArray(prescriptions) || prescriptions.length === 0) return;

        const mapped: PatientNotificationPreview[] = [];
        for (const prescription of prescriptions) {
          const pharmacyDetails = Array.isArray(prescription.pharmacyDetails) ? prescription.pharmacyDetails : [];
          for (const detail of pharmacyDetails) {
            const normalizedStatus = typeof detail?.status === 'string' ? detail.status : 'pending';
            if (!['accepted', 'fulfillment_requested', 'fulfilled', 'rejected'].includes(normalizedStatus)) continue;

            const statusLabel = normalizedStatus.replace('_', ' ');
            const timeSource = detail?.completedAt || detail?.assignedAt || prescription.createdAt || '';
            const isFulfillmentRequest = normalizedStatus === 'fulfillment_requested';
            mapped.push({
              id: `${prescription._id}-${detail?.pharmacyId || 'unknown'}-${normalizedStatus}`,
              title: `Prescription ${statusLabel}`,
              message: isFulfillmentRequest
                ? `${detail?.name || 'Pharmacy'} requested your fulfillment confirmation.`
                : `${detail?.name || 'Pharmacy'} updated your prescription status.`,
              createdAt: timeSource || new Date().toISOString(),
              actionType: isFulfillmentRequest ? 'confirm_fulfillment' : undefined,
              prescriptionId: isFulfillmentRequest ? prescription._id : undefined,
              pharmacyId: isFulfillmentRequest ? detail?.pharmacyId : undefined,
            });
          }
        }

        if (mapped.length === 0) return;

        mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const clipped = mapped.slice(0, MAX_NOTIFICATION_ITEMS);
        const existingRaw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
        const existing = existingRaw ? (JSON.parse(existingRaw) as PatientNotificationPreview[]) : [];
        const existingIds = new Set(Array.isArray(existing) ? existing.map((item) => item.id) : []);
        const hasNew = clipped.some((item) => !existingIds.has(item.id));

        localStorage.setItem(STORAGE_PATIENT_NOTIFICATIONS_KEY, JSON.stringify(clipped));
        if (hasNew) {
          const unreadCount = Number(localStorage.getItem(STORAGE_PATIENT_UNREAD_KEY) || '0');
          localStorage.setItem(STORAGE_PATIENT_UNREAD_KEY, String(unreadCount + 1));
        }
        window.dispatchEvent(new Event('notification-updated'));
      } catch {
        // Ignore hydration failures and keep navbar usable.
      }
    };

    hydratePatientNotificationsFromHistory();
  }, [user?.role]);

  const formatActivityTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
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
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
                />
              </svg>
            )}
          </button>
          {isLoading ? (
            <span className="text-sm text-slate-300">Checking session...</span>
          ) : user ? (
            <>
              {(user.role === 'pharmacist' || user.role === 'patient') && (
                <div ref={notificationRef} className="relative">
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
                        <p className="text-sm font-semibold text-white">Recent Activity</p>
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
                            <div key={item.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-2">
                              <p className="text-sm text-white">{item.title}</p>
                              {item.subtitle && <p className="text-xs text-slate-300">{item.subtitle}</p>}
                              <p className="mt-1 text-[11px] text-slate-400">{formatActivityTime(item.createdAt)}</p>
                              {user?.role === 'patient' && item.actionType === 'confirm_fulfillment' && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmFulfillmentFromNotification(item)}
                                  disabled={confirmingNotificationId === item.id}
                                  className="mt-2 rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {confirmingNotificationId === item.id ? 'Confirming...' : 'Confirm Fulfillment'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  aria-label="Open profile menu"
                  title="Profile"
                >
                  {user.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Profile</p>
                    <p className="mt-2 text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-300">{user.email}</p>
                    <p className="mt-1 text-xs text-cyan-100">{user.role}</p>
                    <div className="mt-4 space-y-2">
                      {profileMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsProfileOpen(false)}
                          className="block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="mt-4 w-full rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
                  />
                </svg>
              )}
            </button>
            {isLoading ? (
              <p className="text-sm text-slate-300">Checking session...</p>
            ) : user ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-300">Profile</p>
                  <p className="mt-1 font-semibold text-slate-100">{user.name}</p>
                  <p className="text-slate-300">{user.email}</p>
                  <p className="mt-1 text-cyan-100">{user.role}</p>
                </div>
                <div className="space-y-2">
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
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
