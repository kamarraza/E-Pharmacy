'use client';

import NotificationComponent from '@/components/NotificationComponent';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NotificationsPage() {
  const [location, setLocation] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        if (data?.user?.role !== 'pharmacist') {
          router.push('/');
          return;
        }

        setLocation(data?.user?.location || '');
      } catch (error) {
        console.error('Failed to verify pharmacist session:', error);
        router.push('/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-300">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-900/80 p-8">
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Live Feed
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Notifications</h1>
          <p className="mt-2 text-slate-300">
            Real-time prescription alerts from patients that match your pharmacy profile.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-slate-200">Filter by location (City/ZIP)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your service location"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
          </div>

          <NotificationComponent
            currentLocation={location}
            maxItems={20}
            title="Incoming Prescription Alerts"
          />
        </div>
      </div>
    </div>
  );
}
