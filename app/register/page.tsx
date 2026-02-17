'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type RegistrationMode = 'manual' | 'map';
type Coordinates = { lat: number; lng: number };

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    phone: '',
    address: '',
    location: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('manual');
  const [mapPincode, setMapPincode] = useState('');
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | null>(null);
  const [mapError, setMapError] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const router = useRouter();

  const resolveCityFromIndianPincode = async (rawLocation: string) => {
    const value = rawLocation.trim();
    if (!/^[1-9][0-9]{5}$/.test(value)) return value;

    try {
      setIsResolvingLocation(true);
      setLocationHint('');

      const response = await fetch(`/api/google/pincode-city?pincode=${encodeURIComponent(value)}`);
      if (!response.ok) {
        setLocationHint('Could not resolve city from PIN code.');
        return value;
      }

      const payload = (await response.json()) as { city?: string };
      const city = (payload.city || '').trim();
      if (!city) {
        setLocationHint('Could not resolve city from PIN code.');
        return value;
      }

      setLocationHint(`City selected: ${city}`);
      return city;
    } catch {
      setLocationHint('Could not resolve city from PIN code.');
      return value;
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'location') {
      setLocationHint('');
    }
  };

  const applySelectedMapLocation = (
    coordinates: Coordinates,
    city: string,
    formattedAddress: string,
    sourceLabel: string
  ) => {
    setSelectedCoordinates(coordinates);
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setMap(null);
    }
    if (mapInstanceRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapInstanceRef.current,
        position: coordinates,
        title: 'Your pharmacy location',
      });
      mapInstanceRef.current.panTo(coordinates);
      mapInstanceRef.current.setZoom(14);
    }

    setFormData((prev) => ({
      ...prev,
      location: city || prev.location,
      address: formattedAddress || prev.address,
    }));
    setLocationHint(`Pointer set from ${sourceLabel}: ${city || 'selected area'}`);
  };

  const handleLocateByPincode = async () => {
    if (!formData.name.trim()) {
      window.alert('Please enter the pharmacy name first.');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(mapPincode.trim())) {
      setMessage('Enter a valid 6-digit Indian PIN code.');
      return;
    }
    if (!mapInstanceRef.current) {
      setMessage('Map is still loading. Please try again.');
      return;
    }

    setMessage('');
    setIsResolvingLocation(true);
    setLocationHint('');
    try {
      const response = await fetch(`/api/google/pincode-city?pincode=${encodeURIComponent(mapPincode.trim())}`);
      if (!response.ok) {
        setLocationHint('Could not find this PIN code on map.');
        return;
      }

      const payload = (await response.json()) as {
        city?: string;
        formattedAddress?: string;
        coordinates?: Coordinates;
      };
      const coordinates = payload.coordinates;
      if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
        setLocationHint('Could not find this PIN code on map.');
        return;
      }

      const city = (payload.city || '').trim();
      const formattedAddress = (payload.formattedAddress || '').trim();
      const searchResponse = await fetch(
        `/api/google/nearby-pharmacies?q=${encodeURIComponent(
          `${formData.name.trim()} ${mapPincode.trim()}`
        )}&limit=25`
      );
      if (!searchResponse.ok) {
        setLocationHint('Could not search pharmacy by name at this PIN code.');
        return;
      }

      const searchResults = (await searchResponse.json()) as Array<{
        name?: string;
        address?: string;
        coordinates?: Coordinates;
      }>;
      const targetName = formData.name.trim().toLowerCase();
      const pinDigits = mapPincode.trim();

      const strictMatch = searchResults.find((item) => {
        const resultName = (item.name || '').trim().toLowerCase();
        const resultAddressDigits = (item.address || '').replace(/\D/g, '');
        return resultName === targetName && resultAddressDigits.includes(pinDigits);
      });

      const looseMatch = searchResults.find((item) => {
        const resultName = (item.name || '').trim().toLowerCase();
        const resultAddressDigits = (item.address || '').replace(/\D/g, '');
        return resultName.includes(targetName) && resultAddressDigits.includes(pinDigits);
      });

      const matched = strictMatch || looseMatch;
      if (!matched?.coordinates) {
        setLocationHint('No pharmacy found with this name at the given PIN code.');
        return;
      }

      const matchedCoordinates = matched.coordinates;
      const matchedAddress = (matched.address || '').trim();
      const matchedName = (matched.name || formData.name).trim();
      mapInstanceRef.current.panTo(matchedCoordinates);
      mapInstanceRef.current.setZoom(16);

      const shouldSetPointer = window.confirm(
        `Found "${matchedName}" at PIN ${mapPincode.trim()}. Set pointer to this location?`
      );

      if (shouldSetPointer) {
        applySelectedMapLocation(
          matchedCoordinates,
          city || formData.location,
          matchedAddress || formattedAddress,
          `PIN ${mapPincode.trim()}`
        );
      } else {
        setLocationHint('Location previewed. Pointer was not set.');
      }
    } catch {
      setLocationHint('Could not find this PIN code on map.');
    } finally {
      setIsResolvingLocation(false);
    }
  };

  useEffect(() => {
    if (formData.role !== 'pharmacist' || registrationMode !== 'map') return;
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapError('Google Maps API key is missing.');
        return;
      }

      try {
        setOptions({ apiKey, version: 'weekly' });
        await importLibrary('maps');

        const map = new google.maps.Map(mapRef.current as HTMLDivElement, {
          center: { lat: 28.6139, lng: 77.2090 },
          zoom: 11,
        });
        mapInstanceRef.current = map;

        map.addListener('click', async (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;

          const nextCoordinates = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          };

          try {
            setIsResolvingLocation(true);
            const response = await fetch(
              `/api/google/reverse-geocode?lat=${nextCoordinates.lat}&lng=${nextCoordinates.lng}`
            );
            if (!response.ok) {
              setLocationHint('Unable to resolve city from selected map point.');
              return;
            }
            const payload = (await response.json()) as { city?: string; formattedAddress?: string };
            const city = (payload.city || '').trim();
            const formattedAddress = (payload.formattedAddress || '').trim();
            const shouldSetPointer = window.confirm(
              `Use ${city || 'this map point'} as pharmacy location?`
            );
            if (shouldSetPointer) {
              applySelectedMapLocation(nextCoordinates, city, formattedAddress, 'map click');
            } else {
              setLocationHint('Map point previewed. Pointer was not set.');
            }
          } catch {
            setLocationHint('Unable to resolve city from selected map point.');
          } finally {
            setIsResolvingLocation(false);
          }
        });
      } catch {
        setMapError('Unable to load Google Maps.');
      }
    };

    initMap();
  }, [formData.role, registrationMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (formData.role === 'pharmacist' && registrationMode === 'map' && !selectedCoordinates) {
        setMessage('Please select your pharmacy location on the map.');
        setIsLoading(false);
        return;
      }

      const resolvedLocation =
        formData.role === 'pharmacist' && registrationMode === 'manual'
          ? await resolveCityFromIndianPincode(formData.location)
          : formData.location;

      if (formData.role === 'pharmacist' && resolvedLocation !== formData.location) {
        setFormData((prev) => ({ ...prev, location: resolvedLocation }));
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          location: resolvedLocation,
          pharmacyCoordinates: formData.role === 'pharmacist' ? selectedCoordinates : null,
          subscriptionType: formData.role === 'pharmacist' ? null : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Registration successful! You can now login.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage(result.error || 'Registration failed');
      }
    } catch {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/85 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Create Account
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">Join E-Pharmacy</h1>
          <p className="mt-2 text-slate-300">
            Register as a patient or pharmacy and start using the platform immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-200">I am a</label>
            <select
              name="role"
              value={formData.role}
              onChange={(e) => {
                handleChange(e);
                if (e.target.value !== 'pharmacist') {
                  setRegistrationMode('manual');
                  setSelectedCoordinates(null);
                  setLocationHint('');
                }
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
            >
              <option value="patient">Patient</option>
              <option value="pharmacist">Pharmacist</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              {formData.role === 'patient' ? 'Full Name' : 'Pharmacy Name'}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder={formData.role === 'patient' ? 'Enter your full name' : 'Enter pharmacy name'}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Enter your address"
            />
          </div>

          {formData.role === 'pharmacist' && (
            <>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Pharmacy Setup Method
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('map')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      registrationMode === 'map'
                        ? 'bg-cyan-300 text-slate-900'
                        : 'border border-white/20 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    Add on Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('manual')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      registrationMode === 'manual'
                        ? 'bg-cyan-300 text-slate-900'
                        : 'border border-white/20 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    Manual Details
                  </button>
                </div>
              </div>

              {registrationMode === 'map' && (
                <div className="md:col-span-2">
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      value={mapPincode}
                      onChange={(e) => setMapPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                      placeholder="Enter 6-digit PIN code"
                    />
                    <button
                      type="button"
                      onClick={handleLocateByPincode}
                      className="rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isResolvingLocation}
                    >
                      Find on Map
                    </button>
                  </div>
                  <p className="mb-2 text-sm text-slate-300">
                    Enter PIN, find location on map, then confirm to set pointer. You can also click map directly.
                  </p>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
                    <div ref={mapRef} className="h-72 w-full" />
                  </div>
                  {mapError && <p className="mt-2 text-xs text-rose-200">{mapError}</p>}
                  {selectedCoordinates && (
                    <p className="mt-2 text-xs text-cyan-200">
                      Selected: {selectedCoordinates.lat.toFixed(5)}, {selectedCoordinates.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              )}

              {registrationMode === 'manual' && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Service Location (Indian City/PIN)
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    onBlur={async (e) => {
                      const city = await resolveCityFromIndianPincode(e.target.value);
                      if (city !== e.target.value) {
                        setFormData((prev) => ({ ...prev, location: city }));
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                    placeholder="Enter Indian city or 6-digit PIN"
                  />
                </div>
              )}

              {isResolvingLocation && (
                <div className="md:col-span-2">
                  <p className="mt-2 text-xs text-cyan-200">Resolving location...</p>
                </div>
              )}
              {!isResolvingLocation && locationHint && (
                <div className="md:col-span-2">
                  <p className="mt-2 text-xs text-cyan-200">{locationHint}</p>
                </div>
              )}
            </>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>

        {message && (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-center text-sm ${
              message.includes('successful')
                ? 'bg-emerald-300/15 text-emerald-100'
                : 'bg-rose-300/15 text-rose-100'
            }`}
          >
            {message}
          </p>
        )}

        <p className="mt-6 text-sm text-slate-300">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
