'use client';

import { useState, useEffect } from 'react';

interface NotificationData {
  type: 'new_prescription';
  prescription: {
    id: string;
    patientName: string;
    location: string;
    createdAt: string;
    status: string;
  };
}

interface NotificationComponentProps {
  currentLocation: string;
  onNewPrescription: () => void;
}

export default function NotificationComponent({ currentLocation, onNewPrescription }: NotificationComponentProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    connectToNotifications();
  }, []);

  const connectToNotifications = () => {
    try {
      const eventSource = new EventSource('/api/notifications/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationData = JSON.parse(event.data);

          if (data.type === 'new_prescription') {
            // Check if prescription is from nearby location
            if (isNearbyLocation(data.prescription.location, currentLocation)) {
              setNotifications(prev => [data, ...prev]);

              // Auto-refresh prescriptions
              onNewPrescription();

              // Show notification for 5 seconds
              setShowNotifications(true);
              setTimeout(() => setShowNotifications(false), 5000);
            }
          }
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        // Try to reconnect after 5 seconds
        setTimeout(connectToNotifications, 5000);
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      console.error('Failed to connect to notifications:', error);
    }
  };

  const isNearbyLocation = (prescriptionLocation: string, pharmacistLocation: string): boolean => {
    if (!pharmacistLocation) return true; // Show all if no location set

    // Simple location matching - you can enhance this with proper geocoding
    const prescriptionLoc = prescriptionLocation.toLowerCase().trim();
    const pharmacistLoc = pharmacistLocation.toLowerCase().trim();

    // Exact match
    if (prescriptionLoc === pharmacistLoc) return true;

    // Partial match (city names, zip codes)
    if (prescriptionLoc.includes(pharmacistLoc) || pharmacistLoc.includes(prescriptionLoc)) return true;

    // For demo purposes, show all notifications if location is set
    return true;
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="mb-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live Updates Active' : 'Connecting...'}
          </span>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All ({notifications.length})
          </button>
        )}
      </div>

      {/* Notification Banner */}
      {showNotifications && notifications.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>New prescription alert!</strong> {notifications[0].prescription.patientName} from {notifications[0].prescription.location}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex bg-blue-50 rounded-md p-1.5 text-blue-500 hover:bg-blue-100"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification List */}
      {notifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      New prescription from {notification.prescription.patientName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Location: {notification.prescription.location} • {formatTime(notification.prescription.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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