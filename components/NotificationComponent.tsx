'use client';

import { useEffect, useState } from 'react';

interface NotificationData {
  type: 'new_prescription';
  prescription: {
    id: string;
    patientName: string;
    location: string;
    createdAt: string;
    status: string;
    selectedPharmacyIds?: string[];
  };
}

interface NotificationComponentProps {
  currentLocation: string;
  onNewPrescription?: () => void;
  maxItems?: number;
  title?: string;
}

const STORAGE_NOTIFICATIONS_KEY = 'pharmacy_notifications';
const STORAGE_UNREAD_KEY = 'pharmacy_notifications_unread';
const STORAGE_THEME_KEY = 'pharmacy_theme';

export default function NotificationComponent({
  currentLocation: _currentLocation,
  onNewPrescription = () => {},
  maxItems = 5,
  title = 'Recent Notifications',
}: NotificationComponentProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as NotificationData[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      return savedTheme ? savedTheme === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const syncTheme = () => {
      try {
        const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch {
        // Ignore storage parse/read issues and keep current in-memory theme.
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
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationData = JSON.parse(event.data);

          if (data.type !== 'new_prescription') {
            return;
          }

          setNotifications((prev) => {
            const existed = prev.some(
              (item) =>
                item.prescription.id === data.prescription.id &&
                item.prescription.createdAt === data.prescription.createdAt
            );
            const merged = [data, ...prev].filter(
              (item, index, arr) =>
                arr.findIndex(
                  (candidate) =>
                    candidate.prescription.id === item.prescription.id &&
                    candidate.prescription.createdAt === item.prescription.createdAt
                ) === index
            );
            const clipped = merged.slice(0, 100);
            localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(clipped));

            if (!existed) {
              const unreadCount = Number(localStorage.getItem(STORAGE_UNREAD_KEY) || '0');
              localStorage.setItem(STORAGE_UNREAD_KEY, String(unreadCount + 1));
            }
            window.dispatchEvent(new Event('notification-updated'));
            return clipped;
          });
          onNewPrescription();
          setShowNotifications(true);
          setTimeout(() => setShowNotifications(false), 5000);
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
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
  }, [_currentLocation, onNewPrescription]);

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
    localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify([]));
    localStorage.setItem(STORAGE_UNREAD_KEY, '0');
    window.dispatchEvent(new Event('notification-updated'));
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusTextClass = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const clearButtonClass = isDarkMode ? 'text-cyan-200 hover:text-cyan-100' : 'text-cyan-700 hover:text-cyan-800';
  const panelClass = isDarkMode
    ? 'rounded-2xl border border-white/10 bg-slate-950/70 p-4'
    : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
  const panelTitleClass = isDarkMode ? 'text-white' : 'text-slate-900';
  const itemClass = isDarkMode
    ? 'flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-3'
    : 'flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3';
  const itemTitleClass = isDarkMode ? 'text-white' : 'text-slate-900';
  const itemMetaClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className={`text-sm ${statusTextClass}`}>{isConnected ? 'Live Updates Active' : 'Connecting...'}</span>
        </div>

        {notifications.length > 0 && (
          <button onClick={clearNotifications} className={`text-sm ${clearButtonClass}`}>
            Clear All ({notifications.length})
          </button>
        )}
      </div>

      {showNotifications && notifications.length > 0 && (
        <div
          className={`mb-4 rounded-xl border p-4 ${
            isDarkMode ? 'border-cyan-300/30 bg-cyan-300/10' : 'border-cyan-300/50 bg-cyan-50'
          }`}
        >
          <p className={`text-sm ${isDarkMode ? 'text-cyan-100' : 'text-cyan-800'}`}>
            <strong>New prescription alert:</strong> {notifications[0].prescription.patientName} from{' '}
            {notifications[0].prescription.location}
          </p>
        </div>
      )}

      {notifications.length > 0 && (
        <div className={panelClass}>
          <h3 className={`mb-3 text-lg font-medium ${panelTitleClass}`}>{title}</h3>
          <div className="space-y-3">
            {notifications.slice(0, maxItems).map((notification, index) => (
              <div key={index} className={itemClass}>
                <div>
                  <p className={`text-sm font-medium ${itemTitleClass}`}>
                    New prescription from {notification.prescription.patientName}
                  </p>
                  <p className={`text-sm ${itemMetaClass}`}>
                    Location: {notification.prescription.location} • {formatTime(notification.prescription.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isDarkMode ? 'bg-cyan-300/20 text-cyan-100' : 'bg-cyan-100 text-cyan-800'
                  }`}
                >
                  New
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
