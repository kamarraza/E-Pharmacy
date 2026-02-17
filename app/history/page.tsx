'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Prescription {
  _id: string;
  prescriptionImages: string[];
  notes: string;
  status: 'pending' | 'assigned' | 'fulfilled';
  location: string;
  createdAt: string;
  pharmacyDetails?: PharmacyDetail[];
}

interface PharmacyDetail {
  pharmacyId: string;
  name: string;
  address: string;
  location: string;
  status: 'pending' | 'accepted' | 'rejected' | 'fulfilled' | 'fulfillment_requested';
  assignedAt?: string | null;
  completedAt?: string | null;
}

const STORAGE_PATIENT_NOTIFICATIONS_KEY = 'patient_notifications';
const STORAGE_PATIENT_UNREAD_KEY = 'patient_notifications_unread';

export default function HistoryPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const authResponse = await fetch('/api/auth/me');
      if (!authResponse.ok) {
        router.push('/login');
        return;
      }

      const userData = await authResponse.json();
      if (userData.user.role !== 'patient') {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/patient/history');

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data);
      } else {
        setError('Failed to load prescription history');
      }
    } catch {
      setError('Failed to load prescription history');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-300/20 text-amber-100 border-amber-300/30';
      case 'assigned':
        return 'bg-cyan-300/20 text-cyan-100 border-cyan-300/30';
      case 'fulfilled':
        return 'bg-emerald-300/20 text-emerald-100 border-emerald-300/30';
      default:
        return 'bg-white/10 text-slate-200 border-white/20';
    }
  };

  const getPharmacyStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-cyan-300/20 text-cyan-100 border-cyan-300/30';
      case 'rejected':
        return 'bg-rose-300/20 text-rose-100 border-rose-300/30';
      case 'fulfilled':
        return 'bg-emerald-300/20 text-emerald-100 border-emerald-300/30';
      case 'fulfillment_requested':
        return 'bg-indigo-300/20 text-indigo-100 border-indigo-300/30';
      default:
        return 'bg-amber-300/20 text-amber-100 border-amber-300/30';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const removePrescription = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to remove this prescription?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      setError('');
      const response = await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error || 'Failed to remove prescription');
        return;
      }

      setPrescriptions((prev) => prev.filter((item) => item._id !== id));
    } catch {
      setError('Failed to remove prescription');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmFulfillment = async (prescriptionId: string, pharmacyId: string) => {
    const key = `${prescriptionId}-${pharmacyId}`;
    try {
      setConfirmingKey(key);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirm_fulfillment', pharmacyId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error || 'Failed to confirm fulfillment');
        return;
      }

      try {
        const prescription = prescriptions.find((item) => item._id === prescriptionId);
        const pharmacy = prescription?.pharmacyDetails?.find((item) => item.pharmacyId === pharmacyId);
        const notification = {
          id: `patient-confirm-${prescriptionId}-${pharmacyId}-${Date.now()}`,
          title: 'Fulfillment confirmed',
          message: `${pharmacy?.name || 'Pharmacy'} marked prescription as fulfilled.`,
          createdAt: new Date().toISOString(),
        };
        const raw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
        const existing = raw ? (JSON.parse(raw) as typeof notification[]) : [];
        const merged = [notification, ...existing].slice(0, 100);
        localStorage.setItem(STORAGE_PATIENT_NOTIFICATIONS_KEY, JSON.stringify(merged));
        const unreadCount = Number(localStorage.getItem(STORAGE_PATIENT_UNREAD_KEY) || '0');
        localStorage.setItem(STORAGE_PATIENT_UNREAD_KEY, String(unreadCount + 1));
        window.dispatchEvent(new Event('notification-updated'));
      } catch {
        // Keep fulfillment action successful even if local notification storage fails.
      }

      setSuccessMessage('Fulfillment confirmed successfully.');
      await fetchHistory();
    } catch {
      setError('Failed to confirm fulfillment');
    } finally {
      setConfirmingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-300" />
          <p className="mt-4 text-slate-300">Loading your prescription history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-white">My Prescription History</h1>
        <p className="mt-2 text-slate-300">Track every upload with status and timeline details.</p>

        {error && <div className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/15 px-4 py-3 text-rose-100">{error}</div>}
        {successMessage && (
          <div className="mt-6 rounded-xl border border-emerald-300/30 bg-emerald-300/15 px-4 py-3 text-emerald-100">
            {successMessage}
          </div>
        )}

        {prescriptions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-10 text-center">
            <h2 className="text-xl font-semibold text-white">No prescriptions yet</h2>
            <p className="mt-2 text-slate-300">You haven&apos;t uploaded any prescriptions yet.</p>
            <button
              onClick={() => router.push('/upload')}
              className="mt-5 rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-900 transition hover:bg-cyan-200"
            >
              Upload Your First Prescription
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {prescriptions.map((prescription) => (
              <article key={prescription._id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Prescription #{prescription._id.slice(-8)}</h3>
                    <p className="text-sm text-slate-400">Uploaded on {formatDate(prescription.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(prescription.status)}`}>
                      {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePrescription(prescription._id)}
                      disabled={deletingId === prescription._id}
                      className="rounded-full border border-rose-300/40 bg-rose-300/15 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === prescription._id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-200 lg:col-span-7">
                    <p className="text-sm font-semibold text-white">Prescription Details</p>
                    <div className="mt-3 space-y-2">
                      <p><strong>Location:</strong> {prescription.location}</p>
                      <p><strong>Images:</strong> {prescription.prescriptionImages.length} uploaded</p>
                      {prescription.notes && <p><strong>Notes:</strong> {prescription.notes}</p>}
                    </div>

                    {prescription.prescriptionImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {prescription.prescriptionImages.map((image, index) => (
                          <button
                            type="button"
                            key={`${prescription._id}-${index}`}
                            onClick={() => window.open(image, '_blank')}
                            className="group relative overflow-hidden rounded-xl border border-white/10"
                          >
                            <img
                              src={image}
                              alt={`Prescription ${index + 1}`}
                              className="h-36 w-full object-cover transition group-hover:scale-105"
                            />
                            <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                              {index + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-200 lg:col-span-5">
                    <p className="mb-2 text-sm font-semibold text-white">Pharmacy Details</p>
                    {prescription.pharmacyDetails && prescription.pharmacyDetails.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {prescription.pharmacyDetails.map((pharmacy) => (
                          <div key={`${prescription._id}-${pharmacy.pharmacyId}`} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-white">{pharmacy.name}</p>
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPharmacyStatusColor(pharmacy.status)}`}>
                                {pharmacy.status.charAt(0).toUpperCase() + pharmacy.status.slice(1).replace('_', ' ')}
                              </span>
                            </div>
                            {pharmacy.status === 'fulfillment_requested' && (
                              <div className="mt-2 rounded-lg border border-indigo-300/30 bg-indigo-300/10 p-2.5">
                                <p className="text-xs text-indigo-100">
                                  This pharmacy requested your fulfillment confirmation.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => confirmFulfillment(prescription._id, pharmacy.pharmacyId)}
                                  disabled={confirmingKey === `${prescription._id}-${pharmacy.pharmacyId}`}
                                  className="mt-2 rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {confirmingKey === `${prescription._id}-${pharmacy.pharmacyId}` ? 'Confirming...' : 'Confirm Fulfilled'}
                                </button>
                              </div>
                            )}
                            {pharmacy.address && <p className="mt-1 text-slate-300">{pharmacy.address}</p>}
                            {pharmacy.location && <p className="text-slate-400">Area: {pharmacy.location}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">No pharmacy details available</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
