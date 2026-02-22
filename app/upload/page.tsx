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

const STORAGE_PATIENT_NOTIFICATIONS_KEY = 'patient_notifications';
const STORAGE_PATIENT_UNREAD_KEY = 'patient_notifications_unread';

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
      const response = await fetch('/api/auth/me?optional=1');
      if (!response.ok) return;

      const userData = await response.json();
      if (!userData?.user) return;

      setUser(userData.user);

      // Auto-fill user information if logged in as patient.
      if (userData.user.role === 'patient') {
        let phone = '';
        let address = '';

        // Prefer richer profile data when available.
        try {
          const profileResponse = await fetch('/api/profile');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            phone = profileData?.profile?.phone || '';
            address = profileData?.profile?.address || '';
          }
        } catch {
          // Fall back to basic auth data below.
        }

        setFormData((prev) => ({
          ...prev,
          patientName: userData.user.name || '',
          patientEmail: userData.user.email || '',
          patientPhone: phone,
          patientAddress: address,
        }));
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
        if (user?.role === 'patient') {
          try {
            const notification = {
              id: `patient-upload-${Date.now()}`,
              title: 'Prescription Uploaded',
              message: 'Your prescription was submitted and sent to selected pharmacies.',
              createdAt: new Date().toISOString(),
            };
            const existingRaw = localStorage.getItem(STORAGE_PATIENT_NOTIFICATIONS_KEY);
            const existing = existingRaw ? (JSON.parse(existingRaw) as typeof notification[]) : [];
            const merged = [notification, ...existing].slice(0, 100);
            localStorage.setItem(STORAGE_PATIENT_NOTIFICATIONS_KEY, JSON.stringify(merged));
            const unreadCount = Number(localStorage.getItem(STORAGE_PATIENT_UNREAD_KEY) || '0');
            localStorage.setItem(STORAGE_PATIENT_UNREAD_KEY, String(unreadCount + 1));
            window.dispatchEvent(new Event('notification-updated'));
          } catch {
            // Do not fail successful upload if local storage writes fail.
          }
        }
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
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <div className="bg-slate-900 px-6 py-6">
            <h1 className="text-3xl font-bold text-white text-center">Upload Prescription</h1>
            <p className="text-slate-300 text-center mt-2">Securely upload your prescription for pharmacy fulfillment</p>
          </div>

          <div className="p-8">
            {!user && (
              <div className="mb-6 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-cyan-100">Already have an account?</h3>
                    <p className="mt-1 text-sm text-cyan-200">Login to auto-fill your information and track your prescriptions.</p>
                  </div>
                  <Link href="/login" className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition duration-300 hover:bg-cyan-200">
                    Login
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Patient Information Section */}
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6">
                <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-100">
                  <svg className="h-6 w-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Full Name *</label>
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Email Address *</label>
                    <input
                      type="email"
                      name="patientEmail"
                      value={formData.patientEmail}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      name="patientPhone"
                      value={formData.patientPhone}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Location (City/ZIP) *</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleLocationChange}
                        required
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                        placeholder="Enter your city or ZIP code"
                      />
                      <button
                        type="button"
                        onClick={() => formData.location.trim() && searchPharmacies({ location: formData.location })}
                        disabled={!formData.location.trim() || isSearchingPharmacies}
                        className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                        aria-label="Search pharmacies"
                      >
                        <svg
                          className={`h-5 w-5 ${isSearchingPharmacies ? 'animate-pulse' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.04 6.04a7.5 7.5 0 0 0 10.61 10.61Z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={getCurrentLocationAndNearestPharmacies}
                        disabled={isSearchingPharmacies}
                        className="rounded-lg bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                      >
                        Nearest
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-slate-300">Address</label>
                  <textarea
                    name="patientAddress"
                    value={formData.patientAddress}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                    rows={3}
                    placeholder="Enter your complete address"
                  />
                </div>
              </div>

              {/* Prescription Upload Section */}
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6">
                <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-100">
                  <svg className="h-6 w-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Prescription Images
                </h2>

                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-cyan-300 bg-cyan-300/10'
                      : 'border-slate-600 hover:border-slate-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="mx-auto mb-4 h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mb-2 text-lg font-medium text-slate-100">
                    {dragActive ? 'Drop your prescription images here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-400">
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
                    <h3 className="mb-4 text-lg font-medium text-slate-100">Uploaded Images ({previews.length})</h3>
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">Additional Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                    rows={3}
                    placeholder="Any special instructions or notes for the pharmacy"
                  />
                </div>
              </div>

              {/* Pharmacy Selection Section */}
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6">
                <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-100">
                  <svg className="h-6 w-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Select Pharmacies
                </h2>

                {formData.location && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-300">
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
                    <p className="text-sm text-slate-300">
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
                        className="text-sm font-medium text-cyan-200 hover:text-cyan-100"
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
                                ? 'border-cyan-300 bg-cyan-300/10'
                                : activePharmacyId === pharmacy._id
                                  ? 'border-indigo-400 bg-indigo-300/10'
                                  : 'border-slate-700 hover:border-slate-500'
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
                                    className="mr-3 h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-300 focus:ring-cyan-300"
                                  />
                                  <h3 className="font-medium text-slate-100">{pharmacy.name}</h3>
                                </div>
                                <p className="mt-1 text-sm text-slate-300">{pharmacy.address}</p>
                                {typeof pharmacy.distanceKm === 'number' && (
                                  <p className="text-xs text-emerald-700 mt-1">
                                    Approx. {pharmacy.distanceKm.toFixed(1)} km away
                                  </p>
                                )}
                                <div className="flex items-center mt-2 space-x-2">
                                {pharmacy.isUsingService && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-300/20 px-2 py-1 text-xs font-medium text-emerald-100">
                                    ★ Service Partner
                                  </span>
                                )}
                                {!pharmacy.isUsingService && !pharmacy.subscriptionType && (
                                  <span className="inline-flex items-center rounded-full bg-slate-700/70 px-2 py-1 text-xs font-medium text-slate-200">
                                    Registered Pharmacy
                                  </span>
                                )}
                                {pharmacy.supportsPrescriptionUpload && (
                                  <span className="inline-flex items-center rounded-full bg-cyan-300/20 px-2 py-1 text-xs font-medium text-cyan-100">
                                    📄 Upload Support
                                  </span>
                                )}
                                  <div className="flex items-center">
                                    <span className="text-yellow-400 text-sm">★</span>
                                    <span className="ml-1 text-xs text-slate-300">
                                      {pharmacy.rating} ({pharmacy.reviewCount} reviews)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="min-h-[20rem] rounded-lg border border-white/10 bg-slate-950/80 p-2">
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
                  <div className="py-8 text-center text-slate-400">
                    <svg className="mx-auto mb-4 h-12 w-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>No pharmacies found in this area.</p>
                    <p className="text-sm mt-1">Try a different location, click Nearest again, or contact support.</p>
                  </div>
                )}

                {!formData.location && availablePharmacies.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    <p>No registered pharmacies available right now.</p>
                  </div>
                )}

                {selectedPharmacyIds.length > 0 && (
                  <div className="mt-4 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-3">
                    <p className="text-sm text-cyan-100">
                      <strong>{selectedPharmacyIds.length} pharmacy(ies) selected</strong> - Your prescription will be sent to these pharmacies.
                    </p>
                    <div className="mt-2 text-xs text-cyan-200">
                      Active details: {availablePharmacies.find((pharmacy) => pharmacy._id === (activePharmacyId || selectedPharmacyIds[0]))?.name || 'Select a pharmacy from the list'}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isLoading && (
                <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Uploading...</span>
                    <span className="text-sm font-medium text-slate-300">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-cyan-300 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || formData.prescriptionImages.length === 0 || selectedPharmacyIds.length === 0}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 p-4 text-lg font-semibold text-slate-900 transition duration-300 hover:from-cyan-300 hover:to-emerald-300 disabled:cursor-not-allowed disabled:from-slate-500 disabled:to-slate-500 disabled:text-slate-200"
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
                  ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                  : 'border border-rose-300/30 bg-rose-300/10 text-rose-100'
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
            <div className="mt-8 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4">
              <h3 className="mb-2 text-sm font-medium text-cyan-100">Need Help?</h3>
              <ul className="space-y-1 text-sm text-cyan-200">
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
