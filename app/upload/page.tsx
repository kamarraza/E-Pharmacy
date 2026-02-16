'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  operatingHours?: Record<string, unknown>;
  services?: string[];
  distanceKm?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    patientAddress: '',
    location: '',
    prescriptionImages: [] as File[],
    notes: '',
  });
  const [selectedPharmacyIds, setSelectedPharmacyIds] = useState<string[]>([]);
  const [availablePharmacies, setAvailablePharmacies] = useState<Pharmacy[]>([]);
  const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
  const [isSearchingPharmacies, setIsSearchingPharmacies] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuthStatus();
    loadDefaultPharmacies();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        // Auto-fill user information if logged in
        if (userData.user.role === 'patient') {
          // Note: In a real app, you'd fetch additional patient details
          setFormData(prev => ({
            ...prev,
            patientName: userData.user.name,
            patientEmail: userData.user.email,
          }));
        }
      }
    } catch (error) {
      // User not authenticated, but that's okay for anonymous uploads
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const loadDefaultPharmacies = async () => {
    setIsSearchingPharmacies(true);
    try {
      const response = await fetch('/api/pharmacies?limit=30');
      if (response.ok) {
        const pharmacies = (await response.json()) as Pharmacy[];
        setAvailablePharmacies(pharmacies);
      } else {
        setAvailablePharmacies([]);
      }
    } catch (error) {
      console.error('Error loading default pharmacies:', error);
      setAvailablePharmacies([]);
    } finally {
      setIsSearchingPharmacies(false);
    }
  };

  const getDistanceInKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const searchPharmacies = async (
    params: { location?: string; lat?: number; lng?: number; radius?: number; fetchAll?: boolean } = {}
  ) => {
    const { location, lat, lng, radius = 100000, fetchAll = false } = params;
    const hasLocationText = !!location?.trim();
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

    if (!fetchAll && !hasLocationText && !hasCoordinates) return [] as Pharmacy[];

    setIsSearchingPharmacies(true);
    try {
      let url = '/api/pharmacies?limit=50';
      if (fetchAll) {
        // keep base URL
      } else if (hasCoordinates) {
        url += `&lat=${lat}&lng=${lng}&radius=${radius}`;
      } else if (hasLocationText) {
        url += `&location=${encodeURIComponent(location as string)}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const pharmacies = (await response.json()) as Pharmacy[];
        if (hasCoordinates) {
          const withDistance = pharmacies
            .map((pharmacy) => ({
              ...pharmacy,
              distanceKm: getDistanceInKm(
                lat as number,
                lng as number,
                pharmacy.coordinates.lat,
                pharmacy.coordinates.lng
              ),
            }))
            .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          setAvailablePharmacies(withDistance);
          return withDistance;
        } else {
          setAvailablePharmacies(pharmacies);
          return pharmacies;
        }
      } else {
        setAvailablePharmacies([]);
        return [] as Pharmacy[];
      }
    } catch (error) {
      console.error('Error searching pharmacies:', error);
      setAvailablePharmacies([]);
      return [] as Pharmacy[];
    } finally {
      setIsSearchingPharmacies(false);
    }
    return [] as Pharmacy[];
  };

  const getCurrentLocationAndNearestPharmacies = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoordinates({ lat: latitude, lng: longitude });
        setSelectedPharmacyIds([]);
        setActivePharmacyId(null);

        let resolvedCity = '';
        try {
          const cityResponse = await fetch(`/api/google/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (cityResponse.ok) {
            const payload = await cityResponse.json();
            resolvedCity = payload?.city || '';
          }
        } catch (error) {
          console.error('Failed to resolve city from coordinates:', error);
        }

        if (resolvedCity) {
          setFormData((prev) => ({ ...prev, location: resolvedCity }));
        }

        let found = await searchPharmacies({ lat: latitude, lng: longitude, radius: 100000 });
        if (found.length === 0 && resolvedCity) {
          found = await searchPharmacies({ location: resolvedCity });
        }
        if (found.length === 0) {
          found = await searchPharmacies({ fetchAll: true });
          if (found.length > 0) {
            setMessage('Showing closest available pharmacies.');
          } else {
            setMessage('No pharmacies are currently available. Please try again later.');
          }
        }
      },
      () => {
        setMessage('Unable to get your location. Please allow location access.');
      }
    );
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocation = e.target.value;
    setFormData({ ...formData, location: newLocation });
    setUserCoordinates(null);

    // Clear previous selections when location changes
    setSelectedPharmacyIds([]);
    setActivePharmacyId(null);
    setAvailablePharmacies([]);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!newLocation.trim()) {
      loadDefaultPharmacies();
      return;
    }

    // Trigger search immediately if location is at least 3 characters, otherwise debounce
    if (newLocation.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPharmacies({ location: newLocation });
        searchTimeoutRef.current = null;
      }, 150); // Quick response for longer searches
    } else if (newLocation.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPharmacies({ location: newLocation });
        searchTimeoutRef.current = null;
      }, 500); // Longer debounce for short inputs
    }
  };

  const togglePharmacySelection = (pharmacyId: string) => {
    setActivePharmacyId(pharmacyId);
    setSelectedPharmacyIds(prev =>
      prev.includes(pharmacyId)
        ? prev.filter(id => id !== pharmacyId)
        : [...prev, pharmacyId]
    );
  };

  const handleMapPharmacySelect = (pharmacy: Pharmacy) => {
    setActivePharmacyId(pharmacy._id);
    setSelectedPharmacyIds((prev) =>
      prev.includes(pharmacy._id) ? prev : [...prev, pharmacy._id]
    );
  };

  const toggleSelectAllPharmacies = () => {
    const allIds = availablePharmacies.map((pharmacy) => pharmacy._id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedPharmacyIds.includes(id));
    setSelectedPharmacyIds(allSelected ? [] : allIds);
    setActivePharmacyId(allSelected ? null : allIds[0] || null);
  };

  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload only image files (JPEG, PNG, GIF, WebP)';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setMessage(error);
        return;
      }

      validFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    }

    setFormData(prev => ({
      ...prev,
      prescriptionImages: [...prev.prescriptionImages, ...validFiles]
    }));
    setMessage('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prescriptionImages: prev.prescriptionImages.filter((_, i) => i !== index)
    }));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.prescriptionImages.length === 0) {
      setMessage('Please upload at least one prescription image');
      return;
    }

    if (selectedPharmacyIds.length === 0) {
      setMessage('Please select at least one pharmacy');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Convert images to base64
      const imagePromises = formData.prescriptionImages.map((file, index) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setUploadProgress(((index + 1) / formData.prescriptionImages.length) * 50);
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      const prescriptionImages = await Promise.all(imagePromises);

      const submitData = {
        ...formData,
        prescriptionImages,
        selectedPharmacyIds,
      };

      setUploadProgress(75);

      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      setUploadProgress(100);

      if (response.ok) {
        setMessage('Prescription uploaded successfully! Selected pharmacies will be notified.');
        setFormData({
          patientName: user?.name || '',
          patientEmail: user?.email || '',
          patientPhone: '',
          patientAddress: '',
          location: '',
          prescriptionImages: [],
          notes: '',
        });
        setPreviews([]);
        setSelectedPharmacyIds([]);
        setActivePharmacyId(null);
        setAvailablePharmacies([]);
        loadDefaultPharmacies();
        setTimeout(() => {
          setMessage('');
        }, 5000);
      } else {
        setMessage(result.error || 'Failed to upload prescription');
      }
    } catch (error) {
      setMessage('Error uploading prescription. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          <div className="bg-slate-900 px-6 py-6">
            <h1 className="text-3xl font-bold text-white text-center">Upload Prescription</h1>
            <p className="text-slate-300 text-center mt-2">Securely upload your prescription for pharmacy fulfillment</p>
          </div>

          <div className="p-8">
            {!user && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-cyan-800">Already have an account?</h3>
                    <p className="text-sm text-cyan-700 mt-1">Login to auto-fill your information and track your prescriptions.</p>
                  </div>
                  <Link href="/login" className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-300">
                    Login
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Patient Information Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="h-6 w-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="patientEmail"
                      value={formData.patientEmail}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="patientPhone"
                      value={formData.patientPhone}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location (City/ZIP) *</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleLocationChange}
                        required
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="Enter your city or ZIP code"
                      />
                      <button
                        type="button"
                        onClick={() => formData.location.trim() && searchPharmacies({ location: formData.location })}
                        disabled={!formData.location.trim() || isSearchingPharmacies}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSearchingPharmacies ? '🔍' : 'Search'}
                      </button>
                      <button
                        type="button"
                        onClick={getCurrentLocationAndNearestPharmacies}
                        disabled={isSearchingPharmacies}
                        className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Nearest
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    name="patientAddress"
                    value={formData.patientAddress}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    rows={3}
                    placeholder="Enter your complete address"
                  />
                </div>
              </div>

              {/* Prescription Upload Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="h-6 w-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Prescription Images
                </h2>

                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {dragActive ? 'Drop your prescription images here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, GIF, WebP up to 5MB each
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files)}
                    className="hidden"
                  />
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Images ({previews.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Prescription ${index + 1}`}
                            className="w-full h-32 sm:h-36 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    rows={3}
                    placeholder="Any special instructions or notes for the pharmacy"
                  />
                </div>
              </div>

              {/* Pharmacy Selection Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="h-6 w-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Select Pharmacies
                </h2>

                {formData.location && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {isSearchingPharmacies ? (
                        <>🔍 Searching pharmacies...</>
                      ) : formData.location.trim().length < 3 ? (
                        <>Type at least 3 characters to search pharmacies</>
                      ) : availablePharmacies.length > 0 ? (
                        <>
                          Found {availablePharmacies.length} pharmacies near &quot;{formData.location}&quot;
                          {userCoordinates ? ' (nearest first)' : ''}
                        </>
                      ) : (
                        <>No pharmacies found near &quot;{formData.location}&quot;. Try a different location.</>
                      )}
                    </p>
                  </div>
                )}

                {!formData.location && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Showing registered pharmacies from our platform. You can still type a city/ZIP or use Nearest.
                    </p>
                  </div>
                )}

                {availablePharmacies.length > 0 && (
                  <div>
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={toggleSelectAllPharmacies}
                        className="text-sm font-medium text-blue-700 hover:text-blue-900"
                      >
                        {availablePharmacies.every((pharmacy) => selectedPharmacyIds.includes(pharmacy._id))
                          ? 'Clear all'
                          : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {availablePharmacies.map((pharmacy) => (
                          <div
                            key={pharmacy._id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              selectedPharmacyIds.includes(pharmacy._id)
                                ? 'border-blue-500 bg-blue-50'
                                : activePharmacyId === pharmacy._id
                                  ? 'border-indigo-400 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => togglePharmacySelection(pharmacy._id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedPharmacyIds.includes(pharmacy._id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => togglePharmacySelection(pharmacy._id)}
                                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <h3 className="font-medium text-gray-900">{pharmacy.name}</h3>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{pharmacy.address}</p>
                                {typeof pharmacy.distanceKm === 'number' && (
                                  <p className="text-xs text-emerald-700 mt-1">
                                    Approx. {pharmacy.distanceKm.toFixed(1)} km away
                                  </p>
                                )}
                                <div className="flex items-center mt-2 space-x-2">
                                {pharmacy.isUsingService && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ★ Service Partner
                                  </span>
                                )}
                                {!pharmacy.isUsingService && !pharmacy.subscriptionType && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    Registered Pharmacy
                                  </span>
                                )}
                                {pharmacy.supportsPrescriptionUpload && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    📄 Upload Support
                                  </span>
                                )}
                                  <div className="flex items-center">
                                    <span className="text-yellow-400 text-sm">★</span>
                                    <span className="text-xs text-gray-600 ml-1">
                                      {pharmacy.rating} ({pharmacy.reviewCount} reviews)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="min-h-[20rem] rounded-lg border border-gray-200 bg-white p-2">
                        <PharmacyMap
                          pharmacies={availablePharmacies}
                          userLocation={userCoordinates || undefined}
                          selectedPharmacyId={activePharmacyId || selectedPharmacyIds[0] || null}
                          onPharmacySelect={handleMapPharmacySelect}
                          showInfoCard={false}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(formData.location || userCoordinates) && !isSearchingPharmacies && availablePharmacies.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>No pharmacies found in this area.</p>
                    <p className="text-sm mt-1">Try a different location, click Nearest again, or contact support.</p>
                  </div>
                )}

                {!formData.location && availablePharmacies.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No registered pharmacies available right now.</p>
                  </div>
                )}

                {selectedPharmacyIds.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedPharmacyIds.length} pharmacy(ies) selected</strong> - Your prescription will be sent to these pharmacies.
                    </p>
                    <div className="mt-2 text-xs text-blue-700">
                      Active details: {availablePharmacies.find((pharmacy) => pharmacy._id === (activePharmacyId || selectedPharmacyIds[0]))?.name || 'Select a pharmacy from the list'}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isLoading && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Uploading...</span>
                    <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || formData.prescriptionImages.length === 0 || selectedPharmacyIds.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition duration-300 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Prescription
                  </>
                )}
              </button>
            </form>

            {/* Success/Error Messages */}
            {message && (
              <div className={`mt-6 p-4 rounded-lg ${
                message.includes('successfully')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {message.includes('successfully') ? (
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {message}
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Ensure your prescription is clearly visible and readable</li>
                <li>• Include all pages of your prescription</li>
                <li>• Make sure the image is well-lit and in focus</li>
                <li>• Contact support if you have any questions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
