'use client';

import PharmacyMap from '@/components/PharmacyMap';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  source: 'platform' | 'google';
  website?: string;
}

interface GoogleNearbyPharmacy {
  placeId: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  rating: number;
  reviewCount: number;
  phone?: string;
  website?: string;
}

export default function PharmaciesPage() {
  const [platformPharmacies, setPlatformPharmacies] = useState<Pharmacy[]>([]);
  const [googlePharmacies, setGooglePharmacies] = useState<Pharmacy[]>([]);
  const [indiaSearchResults, setIndiaSearchResults] = useState<Pharmacy[]>([]);
  const [detectedCity, setDetectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  const fetchPlatformPharmacies = useCallback(async (lat?: number, lng?: number, city?: string) => {
    try {
      let url = '/api/pharmacies';
      if (city) {
        url += `?location=${encodeURIComponent(city)}`;
      } else if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}&radius=10000`;
      }
      const response = await fetch(url);
      const data = await response.json();
      const normalized: Pharmacy[] = (Array.isArray(data) ? data : []).map((pharmacy) => ({
        ...pharmacy,
        source: 'platform',
      }));
      setPlatformPharmacies(normalized);
      return normalized;
    } catch (error) {
      console.error('Failed to fetch platform pharmacies', error);
      return [] as Pharmacy[];
    }
  }, []);

  const resolveCityFromCoordinates = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/google/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        return '';
      }
      const payload = await response.json();
      return payload?.city || '';
    } catch (error) {
      console.error('Failed to resolve city', error);
      return '';
    }
  }, []);

  const fetchNearbyPharmacies = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setNearbyError('');

    const city = await resolveCityFromCoordinates(lat, lng);
    setDetectedCity(city);

    const latestPlatformPharmacies = city
      ? await fetchPlatformPharmacies(undefined, undefined, city)
      : await fetchPlatformPharmacies(lat, lng);

    try {
      const googleApiUrl = city
        ? `/api/google/nearby-pharmacies?city=${encodeURIComponent(city)}&limit=60`
        : `/api/google/nearby-pharmacies?lat=${lat}&lng=${lng}&radius=50000&limit=60`;
      const response = await fetch(googleApiUrl);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const details = payload?.details || payload?.error || 'Unable to fetch Google nearby pharmacies';
        setNearbyError(details);
        setGooglePharmacies([]);
        return;
      }

      const data = (await response.json()) as GoogleNearbyPharmacy[];
      const normalizedGoogle: Pharmacy[] = data.map((item) => ({
        _id: `google-${item.placeId}`,
        name: item.name,
        email: '',
        phone: item.phone || '',
        address: item.address,
        location: item.address,
        coordinates: item.coordinates,
        supportsPrescriptionUpload: false,
        isUsingService: false,
        subscriptionType: null,
        rating: item.rating || 0,
        reviewCount: item.reviewCount || 0,
        services: [],
        source: 'google',
        website: item.website || '',
      }));

      const platformKeySet = new Set(
        latestPlatformPharmacies.map(
          (pharmacy) => `${pharmacy.name.toLowerCase()}|${pharmacy.address.toLowerCase()}`
        )
      );

      const dedupedGoogle = normalizedGoogle.filter((pharmacy) => {
        const key = `${pharmacy.name.toLowerCase()}|${pharmacy.address.toLowerCase()}`;
        return !platformKeySet.has(key);
      });

      setGooglePharmacies(dedupedGoogle);
    } catch (error) {
      console.error('Failed to fetch nearby pharmacies from Google', error);
      setNearbyError('Failed to load city-wide Google pharmacies.');
      setGooglePharmacies([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPlatformPharmacies, resolveCityFromCoordinates]);

  useEffect(() => {
    fetchPlatformPharmacies();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          fetchNearbyPharmacies(latitude, longitude);
        },
        () => {
          setNearbyError('Location access denied. Showing platform pharmacies only.');
        }
      );
    }
  }, [fetchNearbyPharmacies, fetchPlatformPharmacies]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNearbyError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        fetchNearbyPharmacies(latitude, longitude);
      },
      () => {
        setNearbyError('Unable to get your location. Please allow location access.');
      }
    );
  };

  const allPharmacies = useMemo(() => {
    const merged = [...platformPharmacies, ...googlePharmacies];
    return merged.sort((a, b) => {
      const aPriority = a.source === 'platform' ? 2 : 1;
      const bPriority = b.source === 'platform' ? 2 : 1;
      if (aPriority !== bPriority) return bPriority - aPriority;
      if (a.rating !== b.rating) return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    });
  }, [platformPharmacies, googlePharmacies]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 2) {
      setIndiaSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isActive = true;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [platformResponse, googleResponse] = await Promise.all([
          fetch(`/api/pharmacies?q=${encodeURIComponent(normalizedQuery)}&limit=100`),
          fetch(`/api/google/nearby-pharmacies?q=${encodeURIComponent(normalizedQuery)}&limit=60`),
        ]);

        const platformData = platformResponse.ok ? await platformResponse.json() : [];
        const googleData = googleResponse.ok ? await googleResponse.json() : [];

        const normalizedPlatform: Pharmacy[] = (Array.isArray(platformData) ? platformData : []).map(
          (pharmacy) => ({
            ...pharmacy,
            source: 'platform',
          })
        );

        const normalizedGoogle: Pharmacy[] = (Array.isArray(googleData) ? googleData : []).map(
          (item: GoogleNearbyPharmacy) => ({
            _id: `google-${item.placeId}`,
            name: item.name,
            email: '',
            phone: item.phone || '',
            address: item.address,
            location: item.address,
            coordinates: item.coordinates,
            supportsPrescriptionUpload: false,
            isUsingService: false,
            subscriptionType: null,
            rating: item.rating || 0,
            reviewCount: item.reviewCount || 0,
            services: [],
            source: 'google',
            website: item.website || '',
          })
        );

        const platformKeySet = new Set(
          normalizedPlatform.map(
            (pharmacy) => `${pharmacy.name.toLowerCase()}|${pharmacy.address.toLowerCase()}`
          )
        );
        const dedupedGoogle = normalizedGoogle.filter((pharmacy) => {
          const key = `${pharmacy.name.toLowerCase()}|${pharmacy.address.toLowerCase()}`;
          return !platformKeySet.has(key);
        });

        const merged = [...normalizedPlatform, ...dedupedGoogle].sort((a, b) => {
          const aPriority = a.source === 'platform' ? 2 : 1;
          const bPriority = b.source === 'platform' ? 2 : 1;
          if (aPriority !== bPriority) return bPriority - aPriority;
          if (a.rating !== b.rating) return b.rating - a.rating;
          return b.reviewCount - a.reviewCount;
        });

        if (!isActive) return;
        setIndiaSearchResults(merged);
      } catch (error) {
        console.error('Failed to search pharmacies across India:', error);
        if (!isActive) return;
        setIndiaSearchResults([]);
      } finally {
        if (isActive) setSearchLoading(false);
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const filteredPharmacies = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const isIndiaSearchMode = normalizedQuery.length >= 2;
    const base = isIndiaSearchMode ? indiaSearchResults : allPharmacies;
    if (!normalizedQuery) return base;
    if (isIndiaSearchMode) return base;

    return base.filter(
      (pharmacy) =>
        pharmacy.name.toLowerCase().includes(normalizedQuery) ||
        pharmacy.address.toLowerCase().includes(normalizedQuery) ||
        pharmacy.location.toLowerCase().includes(normalizedQuery)
    );
  }, [allPharmacies, indiaSearchResults, searchQuery]);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, allPharmacies.length, indiaSearchResults.length]);

  const visiblePharmacies = useMemo(
    () => filteredPharmacies.slice(0, visibleCount),
    [filteredPharmacies, visibleCount]
  );

  const hasMore = visibleCount < filteredPharmacies.length;
  const isListLoading = loading || searchLoading;

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isListLoading) return;

    const target = event.currentTarget;
    const reachedBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 80;

    if (reachedBottom) {
      setVisibleCount((count) => Math.min(count + 20, filteredPharmacies.length));
    }
  };

  const handlePharmacySelect = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
  };

  useEffect(() => {
    if (!selectedPharmacy) return;
    const stillVisible = visiblePharmacies.some((pharmacy) => pharmacy._id === selectedPharmacy._id);
    if (!stillVisible) {
      setSelectedPharmacy(null);
    }
  }, [selectedPharmacy, visiblePharmacies]);

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-8">
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Discovery
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Find Nearby Pharmacies</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Showing your complete city pharmacies: on-platform entries first, plus Google pharmacies in your city.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Tip: type 2+ characters to search pharmacies across India by name.
          </p>
          {detectedCity && (
            <p className="mt-2 text-sm text-cyan-200">City mode: {detectedCity}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-200">Search Location</label>
            <input
              type="text"
              placeholder="Search pharmacy name, city, or address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
            <button
              onClick={getCurrentLocation}
              className="mt-3 w-full rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/25"
            >
              Use My Current Location
            </button>
            {nearbyError && <p className="mt-3 text-xs text-amber-300">{nearbyError}</p>}

            <div
              className="mt-6 max-h-[32rem] space-y-3 overflow-y-auto pr-1"
              onScroll={handleListScroll}
            >
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                Pharmacies ({filteredPharmacies.length})
              </h2>
              {isListLoading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-300" />
                  <p className="mt-2 text-sm text-slate-300">
                    {searchQuery.trim().length >= 2
                      ? 'Searching pharmacies across India...'
                      : 'Loading nearby pharmacies...'}
                  </p>
                  {detectedCity && <p className="mt-1 text-xs text-cyan-200">Searching whole city: {detectedCity}</p>}
                </div>
              ) : (
                visiblePharmacies.map((pharmacy) => (
                  <article
                    key={pharmacy._id}
                    onClick={() => handlePharmacySelect(pharmacy)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      selectedPharmacy?._id === pharmacy._id
                        ? 'border-cyan-300 bg-cyan-300/10'
                        : 'border-white/10 bg-slate-950/70 hover:border-white/25'
                    }`}
                  >
                    <h3 className="font-semibold text-white">{pharmacy.name}</h3>
                    <p className="mt-1 text-sm text-slate-300">{pharmacy.address}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pharmacy.source === 'platform' && (
                        <span className="rounded-full bg-emerald-300/20 px-2 py-1 text-xs text-emerald-100">
                          On Platform
                        </span>
                      )}
                      {pharmacy.subscriptionType && (
                        <span className="rounded-full bg-violet-300/20 px-2 py-1 text-xs text-violet-100">
                          {pharmacy.subscriptionType} subscriber
                        </span>
                      )}
                      {pharmacy.isUsingService && (
                        <span className="rounded-full bg-cyan-300/20 px-2 py-1 text-xs text-cyan-100">
                          Service Partner
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Rating {pharmacy.rating} ({pharmacy.reviewCount} reviews)
                    </p>
                  </article>
                ))
              )}
              {!isListLoading && hasMore && (
                <p className="py-3 text-center text-xs text-slate-400">
                  Scroll down to load more pharmacies
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-3 lg:col-span-2">
            <PharmacyMap
              pharmacies={visiblePharmacies}
              userLocation={userLocation || undefined}
              onPharmacySelect={handlePharmacySelect}
              selectedPharmacyId={selectedPharmacy?._id || null}
              heightClassName="h-[32rem]"
            />
          </section>
        </div>

        {selectedPharmacy && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-bold text-white">{selectedPharmacy.name}</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Contact</h3>
                <div className="mt-2 space-y-1 text-slate-200">
                  {selectedPharmacy.address && <p>{selectedPharmacy.address}</p>}
                  {selectedPharmacy.phone && <p>Phone: {selectedPharmacy.phone}</p>}
                  {selectedPharmacy.email && <p>Email: {selectedPharmacy.email}</p>}
                  {selectedPharmacy.website && (
                    <p>
                      Website:{' '}
                      <a
                        href={selectedPharmacy.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-200 underline hover:text-cyan-100"
                      >
                        {selectedPharmacy.website}
                      </a>
                    </p>
                  )}
                  {selectedPharmacy.location &&
                    selectedPharmacy.location.trim().toLowerCase() !==
                      (selectedPharmacy.address || '').trim().toLowerCase() && (
                      <p>Area: {selectedPharmacy.location}</p>
                    )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Services</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPharmacy.source === 'platform' && (
                    <span className="rounded-full bg-emerald-300/20 px-3 py-1 text-sm text-emerald-100">
                      Platform Pharmacy
                    </span>
                  )}
                  {selectedPharmacy.isUsingService && (
                    <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-sm text-cyan-100">
                      Service Partner
                    </span>
                  )}
                  {selectedPharmacy.supportsPrescriptionUpload && (
                    <span className="rounded-full bg-sky-300/20 px-3 py-1 text-sm text-sky-100">
                      Prescription Upload Supported
                    </span>
                  )}
                  {selectedPharmacy.subscriptionType && (
                    <span className="rounded-full bg-violet-300/20 px-3 py-1 text-sm text-violet-100">
                      {selectedPharmacy.subscriptionType.charAt(0).toUpperCase() + selectedPharmacy.subscriptionType.slice(1)} Plan
                    </span>
                  )}
                </div>
                {selectedPharmacy.services && selectedPharmacy.services.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPharmacy.services.map((service) => (
                      <span key={service} className="rounded-full border border-white/15 px-3 py-1 text-sm text-slate-200">
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
