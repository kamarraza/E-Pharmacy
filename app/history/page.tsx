'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Prescription {
  _id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  prescriptionImages: string[];
  notes: string;
  status: 'pending' | 'assigned' | 'fulfilled';
  location: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

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
          <div className="mt-8 space-y-5">
            {prescriptions.map((prescription) => (
              <article key={prescription._id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Prescription #{prescription._id.slice(-8)}</h3>
                    <p className="text-sm text-slate-400">Uploaded on {formatDate(prescription.createdAt)}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(prescription.status)}`}>
                    {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="text-sm text-slate-200">
                    <p><strong>Name:</strong> {prescription.patientName}</p>
                    <p><strong>Email:</strong> {prescription.patientEmail}</p>
                    {prescription.patientPhone && <p><strong>Phone:</strong> {prescription.patientPhone}</p>}
                    {prescription.patientAddress && <p><strong>Address:</strong> {prescription.patientAddress}</p>}
                    <p><strong>Location:</strong> {prescription.location}</p>
                  </div>
                  <div className="text-sm text-slate-200">
                    <p><strong>Images:</strong> {prescription.prescriptionImages.length} uploaded</p>
                    {prescription.notes && <p><strong>Notes:</strong> {prescription.notes}</p>}
                  </div>
                </div>

                {prescription.prescriptionImages.length > 0 && (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
