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

export default function NotificationComponent({
  currentLocation,
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

  function isNearbyLocation(prescriptionLocation: string, pharmacistLocation: string): boolean {
    if (!pharmacistLocation.trim()) return true;

    const prescriptionLoc = prescriptionLocation.toLowerCase().trim();
    const pharmacistLoc = pharmacistLocation.toLowerCase().trim();

    if (prescriptionLoc === pharmacistLoc) return true;
    return prescriptionLoc.includes(pharmacistLoc) || pharmacistLoc.includes(prescriptionLoc);
  }

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

          if (!isNearbyLocation(data.prescription.location, currentLocation)) {
            return;
          }

          setNotifications((prev) => {
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

            const unreadCount = Number(localStorage.getItem(STORAGE_UNREAD_KEY) || '0');
            localStorage.setItem(STORAGE_UNREAD_KEY, String(unreadCount + 1));
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
  }, [currentLocation, onNewPrescription]);

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

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm text-slate-300">{isConnected ? 'Live Updates Active' : 'Connecting...'}</span>
        </div>

        {notifications.length > 0 && (
          <button onClick={clearNotifications} className="text-sm text-cyan-200 hover:text-cyan-100">
            Clear All ({notifications.length})
          </button>
        )}
      </div>

      {showNotifications && notifications.length > 0 && (
        <div className="mb-4 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
          <p className="text-sm text-cyan-100">
            <strong>New prescription alert:</strong> {notifications[0].prescription.patientName} from{' '}
            {notifications[0].prescription.location}
          </p>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h3 className="mb-3 text-lg font-medium text-white">{title}</h3>
          <div className="space-y-3">
            {notifications.slice(0, maxItems).map((notification, index) => (
              <div key={index} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    New prescription from {notification.prescription.patientName}
                  </p>
                  <p className="text-sm text-slate-300">
                    Location: {notification.prescription.location} • {formatTime(notification.prescription.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-cyan-300/20 px-2.5 py-0.5 text-xs font-medium text-cyan-100">New</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
