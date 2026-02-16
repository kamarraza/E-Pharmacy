'use client';

import NotificationComponent from '@/components/NotificationComponent';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Prescription {
  _id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  prescriptionImages: string[];
  notes?: string;
  status: string;
  location: string;
  createdAt: string;
  pharmacyStatuses?: PharmacyStatus[];
}

interface PharmacyStatus {
  pharmacyId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'fulfilled' | 'fulfillment_requested';
  assignedAt?: string;
  completedAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [location, setLocation] = useState('');
  const [pharmacyId, setPharmacyId] = useState('');
  const [message, setMessage] = useState('');

  const fetchPrescriptions = useCallback(async (targetLocation: string) => {
    if (!targetLocation.trim()) {
      setPrescriptions([]);
      return;
    }
    try {
      const response = await fetch(`/api/prescriptions?location=${targetLocation}&status=all`);
      const data = await response.json();
      setPrescriptions(data);
    } catch {
      console.error('Failed to fetch prescriptions');
    }
  }, []);

  useEffect(() => {
    const loadPharmacistLocation = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data?.user?.role !== 'pharmacist') {
          router.push('/upload');
          return;
        }
        const pharmacistLocation = data?.user?.location || '';
        const pharmacistPharmacyId = data?.user?.pharmacyId || '';
        setPharmacyId(pharmacistPharmacyId);
        if (pharmacistLocation) {
          setLocation(pharmacistLocation);
          fetchPrescriptions(pharmacistLocation);
        }
      } catch (error) {
        console.error('Failed to load pharmacist profile:', error);
        router.push('/login');
      }
    };

    loadPharmacistLocation();
  }, [fetchPrescriptions, router]);

  const handleNotificationRefresh = useCallback(() => {
    fetchPrescriptions(location);
  }, [fetchPrescriptions, location]);

  const updatePrescriptionStatus = async (id: string, status: 'assigned' | 'request_fulfillment') => {
    try {
      const response = await fetch(`/api/prescriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessage(
          status === 'request_fulfillment'
            ? 'Patient confirmation requested for fulfillment.'
            : 'Prescription accepted successfully.'
        );
        fetchPrescriptions(location);
      } else {
        setMessage(payload?.error || 'Failed to update prescription.');
      }
    } catch {
      setMessage('Error updating prescription.');
    }
  };

  const analytics = useMemo(() => {
    const getOwnStatus = (item: Prescription) =>
      item.pharmacyStatuses?.find((entry) => String(entry.pharmacyId) === pharmacyId)?.status;

    const ownPrescriptions = prescriptions.filter((item) =>
      item.pharmacyStatuses?.some((entry) => String(entry.pharmacyId) === pharmacyId)
    );

    const totalRequests = ownPrescriptions.length;
    const completedPrescriptions = ownPrescriptions.filter((item) => getOwnStatus(item) === 'fulfilled').length;
    const activePrescriptions = ownPrescriptions.filter((item) => getOwnStatus(item) !== 'fulfilled').length;
    const uniquePatients = new Set(
      ownPrescriptions
        .filter((item) => {
          const ownStatus = getOwnStatus(item);
          return ownStatus === 'accepted' || ownStatus === 'fulfillment_requested' || ownStatus === 'fulfilled';
        })
        .map((item) => item.patientEmail?.toLowerCase() || item.patientName.toLowerCase())
    ).size;
    const today = new Date();
    const todayRequests = ownPrescriptions.filter((item) => {
      const created = new Date(item.createdAt);
      return (
        created.getDate() === today.getDate() &&
        created.getMonth() === today.getMonth() &&
        created.getFullYear() === today.getFullYear()
      );
    }).length;

    return {
      totalRequests,
      completedPrescriptions,
      activePrescriptions,
      uniquePatients,
      todayRequests,
    };
  }, [prescriptions, pharmacyId]);

  const ownPrescriptions = useMemo(
    () =>
      prescriptions
        .filter((item) => item.pharmacyStatuses?.some((entry) => String(entry.pharmacyId) === pharmacyId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [prescriptions, pharmacyId]
  );

  const recentActivity = useMemo(
    () =>
      ownPrescriptions.slice(0, 8),
    [ownPrescriptions]
  );

  const getOwnPharmacyStatus = (prescription: Prescription) =>
    prescription.pharmacyStatuses?.find((entry) => String(entry.pharmacyId) === pharmacyId)?.status || 'pending';

  const formatOwnStatus = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-900/80 p-8">
          <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Pharmacist Workspace
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-slate-300">
            Enter your location to monitor pending prescriptions and assign requests in real time.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <NotificationComponent
            currentLocation={location}
            onNewPrescription={handleNotificationRefresh}
          />

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-slate-200">Location (City/ZIP)</label>
            <input
              type="text"
              placeholder="Enter your service location"
              value={location}
              onChange={(e) => {
                const value = e.target.value;
                setLocation(value);
                fetchPrescriptions(value);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
          </div>

          {message && <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-slate-100">{message}</p>}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-cyan-100">Total Activity</p>
              <p className="mt-2 text-3xl font-bold text-white">{analytics.totalRequests}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-emerald-100">Completed</p>
              <p className="mt-2 text-3xl font-bold text-white">{analytics.completedPrescriptions}</p>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-amber-100">Open</p>
              <p className="mt-2 text-3xl font-bold text-white">{analytics.activePrescriptions}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-fuchsia-100">Patients Visited</p>
              <p className="mt-2 text-3xl font-bold text-white">{analytics.uniquePatients}</p>
            </div>
            <div className="rounded-2xl border border-indigo-300/30 bg-indigo-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-indigo-100">Today</p>
              <p className="mt-2 text-3xl font-bold text-white">{analytics.todayRequests}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="mt-2 text-sm text-slate-300">No activity yet for this location.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {recentActivity.map((item) => (
                  <div key={item._id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div>
                      <p className="text-sm text-white">{item.patientName}</p>
                      <p className="text-xs text-slate-300">{item.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-slate-200">{formatOwnStatus(getOwnPharmacyStatus(item))}</p>
                      <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {ownPrescriptions.map((prescription) => (
              <article key={prescription._id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <h2 className="text-lg font-semibold text-white">{prescription.patientName}</h2>
                <div className="mt-3 space-y-1 text-sm text-slate-200">
                  <p><strong>Email:</strong> {prescription.patientEmail}</p>
                  <p><strong>Phone:</strong> {prescription.patientPhone || 'Not provided'}</p>
                  <p><strong>Address:</strong> {prescription.patientAddress || 'Not provided'}</p>
                  <p><strong>Location:</strong> {prescription.location}</p>
                  <p><strong>Status:</strong> {formatOwnStatus(getOwnPharmacyStatus(prescription))}</p>
                  <p><strong>Date:</strong> {new Date(prescription.createdAt).toLocaleDateString()}</p>
                </div>

                {prescription.notes && (
                  <div className="mt-4 rounded-xl bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                    <strong>Notes:</strong> {prescription.notes}
                  </div>
                )}

                {prescription.prescriptionImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
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
                          className="h-28 w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                          {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() =>
                    updatePrescriptionStatus(
                      prescription._id,
                      getOwnPharmacyStatus(prescription) === 'pending' ? 'assigned' : 'request_fulfillment'
                    )
                  }
                  disabled={getOwnPharmacyStatus(prescription) === 'fulfilled' || getOwnPharmacyStatus(prescription) === 'fulfillment_requested'}
                  className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {getOwnPharmacyStatus(prescription) === 'fulfilled'
                    ? 'Completed'
                    : getOwnPharmacyStatus(prescription) === 'fulfillment_requested'
                      ? 'Confirmation Requested'
                      : getOwnPharmacyStatus(prescription) === 'accepted'
                      ? 'Request Patient Confirmation'
                      : 'Accept Prescription'}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
