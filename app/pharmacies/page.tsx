'use client';

import { useState, useEffect } from 'react';
import PharmacyMap from '@/components/PharmacyMap';

interface Pharmacy {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  supportsPrescriptionUpload: boolean;
  isUsingService: boolean;
  subscriptionType: string | null;
  rating: number;
  reviewCount: number;
  operatingHours?: any;
  services?: string[];
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  useEffect(() => {
    fetchPharmacies();
  }, []);

  useEffect(() => {
    filterPharmacies();
  }, [pharmacies, searchQuery]);

  const fetchPharmacies = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      let url = '/api/pharmacies';
      if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}&radius=10000`; // 10km radius
      }

      const response = await fetch(url);
      const data = await response.json();
      setPharmacies(data);
    } catch (error) {
      console.error('Failed to fetch pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const filterPharmacies = () => {
    if (!searchQuery) {
      setFilteredPharmacies(pharmacies);
      return;
    }

    const filtered = pharmacies.filter(pharmacy =>
      pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPharmacies(filtered);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setUseCurrentLocation(true);
          fetchPharmacies(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enter a location manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handlePharmacySelect = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl -m-8 mb-8">
            <h1 className="text-3xl font-bold text-center">Find Nearby Pharmacies</h1>
            <p className="text-center mt-2 opacity-90">Discover pharmacies that support prescription uploads and use our service</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Search and Filters */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Location Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Location</label>
                  <input
                    type="text"
                    placeholder="Enter city, address, or pharmacy name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>

                {/* Current Location Button */}
                <button
                  onClick={getCurrentLocation}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300 flex items-center justify-center"
                >
                  📍 Use My Current Location
                </button>

                {/* Pharmacy List */}
                <div className="max-h-96 overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pharmacies ({filteredPharmacies.length})</h3>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading pharmacies...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPharmacies.map((pharmacy) => (
                        <div
                          key={pharmacy._id}
                          onClick={() => handlePharmacySelect(pharmacy)}
                          className={`border p-4 rounded-lg cursor-pointer transition duration-300 ${
                            selectedPharmacy?._id === pharmacy._id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{pharmacy.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{pharmacy.address}</p>
                              <div className="flex items-center mt-2 space-x-2">
                                {pharmacy.isUsingService && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ★ Service Partner
                                  </span>
                                )}
                                {pharmacy.supportsPrescriptionUpload && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    📄 Upload Support
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center mt-1">
                                <span className="text-yellow-400 text-sm">★</span>
                                <span className="text-xs text-gray-600 ml-1">
                                  {pharmacy.rating} ({pharmacy.reviewCount})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="lg:col-span-2">
              <PharmacyMap
                pharmacies={filteredPharmacies}
                userLocation={userLocation || undefined}
                onPharmacySelect={handlePharmacySelect}
              />
            </div>
          </div>

          {/* Selected Pharmacy Details */}
          {selectedPharmacy && (
            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedPharmacy.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="space-y-2 text-gray-700">
                    <p><strong>Address:</strong> {selectedPharmacy.address}</p>
                    <p><strong>Phone:</strong> {selectedPharmacy.phone}</p>
                    <p><strong>Email:</strong> {selectedPharmacy.email}</p>
                    <p><strong>Location:</strong> {selectedPharmacy.location}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Services & Rating</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-yellow-400 text-lg mr-1">★</span>
                      <span className="font-medium">{selectedPharmacy.rating}</span>
                      <span className="text-gray-600 ml-1">({selectedPharmacy.reviewCount} reviews)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedPharmacy.isUsingService && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ★ Our Service Partner
                        </span>
                      )}
                      {selectedPharmacy.supportsPrescriptionUpload && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          📄 Prescription Upload Supported
                        </span>
                      )}
                      {selectedPharmacy.subscriptionType && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          💎 {selectedPharmacy.subscriptionType.charAt(0).toUpperCase() + selectedPharmacy.subscriptionType.slice(1)} Plan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {selectedPharmacy.services && selectedPharmacy.services.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPharmacy.services.map((service, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}