'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      // First check if user is authenticated
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

      // If authenticated, fetch prescription history
      const response = await fetch('/api/patient/history');

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data);
      } else {
        setError('Failed to load prescription history');
      }
    } catch (error) {
      setError('Failed to load prescription history');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'fulfilled': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your prescription history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Prescription History</h1>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {prescriptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions yet</h3>
                <p className="text-gray-500 mb-6">You haven't uploaded any prescriptions yet.</p>
                <button
                  onClick={() => router.push('/upload')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Upload Your First Prescription
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {prescriptions.map((prescription) => (
                  <div key={prescription._id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Prescription #{prescription._id.slice(-8)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Uploaded on {formatDate(prescription.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prescription.status)}`}>
                        {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Name:</span> {prescription.patientName}</p>
                          <p><span className="font-medium">Email:</span> {prescription.patientEmail}</p>
                          {prescription.patientPhone && (
                            <p><span className="font-medium">Phone:</span> {prescription.patientPhone}</p>
                          )}
                          {prescription.patientAddress && (
                            <p><span className="font-medium">Address:</span> {prescription.patientAddress}</p>
                          )}
                          <p><span className="font-medium">Location:</span> {prescription.location}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Prescription Details</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Images:</span> {prescription.prescriptionImages.length} uploaded</p>
                          {prescription.notes && (
                            <p><span className="font-medium">Notes:</span> {prescription.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {prescription.prescriptionImages.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Prescription Images</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                          {prescription.prescriptionImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Prescription ${index + 1}`}
                                className="w-full h-32 sm:h-36 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(image, '_blank')}
                              />
                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}