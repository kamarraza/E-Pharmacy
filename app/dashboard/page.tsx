'use client';

import { useState, useEffect } from 'react';
import NotificationComponent from '@/components/NotificationComponent';

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
}

export default function DashboardPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (location) {
      fetchPrescriptions();
    }
  }, [location]);

  const fetchPrescriptions = async () => {
    try {
      const response = await fetch(`/api/prescriptions?location=${location}&status=pending`);
      const data = await response.json();
      setPrescriptions(data);
    } catch (error) {
      console.error('Failed to fetch prescriptions');
    }
  };

  const assignPrescription = async (id: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'assigned' }), // Assume pharmacist ID later
      });
      if (response.ok) {
        setMessage('Prescription assigned successfully!');
        fetchPrescriptions();
      } else {
        setMessage('Failed to assign');
      }
    } catch (error) {
      setMessage('Error assigning prescription');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-4 sm:p-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-4 sm:px-6 sm:py-4 rounded-t-xl -m-4 mb-6 sm:-m-8 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-center">Pharmacist Dashboard</h1>
        </div>

        <NotificationComponent
          currentLocation={location}
          onNewPrescription={fetchPrescriptions}
        />

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Enter your location (City/ZIP)</label>
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          />
        </div>
        {message && <p className="mb-4 text-center text-black bg-gray-100 p-3 rounded-lg">{message}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {prescriptions.map((prescription) => (
            <div key={prescription._id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <h2 className="font-semibold text-lg text-black mb-3 sm:mb-4">{prescription.patientName}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-black mb-4">
                <p><strong>Email:</strong> {prescription.patientEmail}</p>
                <p><strong>Phone:</strong> {prescription.patientPhone || 'Not provided'}</p>
                <p><strong>Address:</strong> {prescription.patientAddress || 'Not provided'}</p>
                <p><strong>Location:</strong> {prescription.location}</p>
                <p><strong>Status:</strong> <span className={`px-2 py-1 rounded ${prescription.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{prescription.status}</span></p>
                <p><strong>Date:</strong> {new Date(prescription.createdAt).toLocaleDateString()}</p>
              </div>
              {prescription.notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <strong className="text-blue-800">Notes:</strong>
                  <p className="text-blue-700 mt-1">{prescription.notes}</p>
                </div>
              )}
              {prescription.prescriptionImages && prescription.prescriptionImages.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Prescription Images ({prescription.prescriptionImages.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {prescription.prescriptionImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Prescription ${index + 1}`}
                          className="w-full h-32 sm:h-40 object-cover rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
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
              <button
                onClick={() => assignPrescription(prescription._id)}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-blue-600 transition duration-300 font-semibold"
              >
                Assign to Me
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}