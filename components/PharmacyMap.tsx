'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';

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
}

interface PharmacyMapProps {
  pharmacies: Pharmacy[];
  userLocation?: { lat: number; lng: number };
  onPharmacySelect?: (pharmacy: Pharmacy) => void;
  selectedPharmacyId?: string | null;
  heightClassName?: string;
  showInfoCard?: boolean;
}

export default function PharmacyMap({
  pharmacies,
  userLocation,
  onPharmacySelect,
  selectedPharmacyId,
  heightClassName = 'h-96',
  showInfoCard = true,
}: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markersByIdRef = useRef<Record<string, google.maps.Marker>>({});
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState('');
  const [internalSelectedPharmacyId, setInternalSelectedPharmacyId] = useState<string | null>(null);
  const selectedPopupPharmacyId = selectedPharmacyId || internalSelectedPharmacyId;
  const selectedPharmacy =
    (selectedPopupPharmacyId
      ? pharmacies.find((pharmacy) => pharmacy._id === selectedPopupPharmacyId)
      : null) || null;

  const getMarkerIcon = (pharmacy: Pharmacy, isSelected = false) => ({
    url:
      pharmacy.isUsingService || pharmacy.subscriptionType
        ? 'data:image/svg+xml;charset=UTF-8,' +
          encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${isSelected ? '#2563EB' : '#10B981'}" stroke="white" stroke-width="3"/>
              <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">★</text>
            </svg>
          `)
        : 'data:image/svg+xml;charset=UTF-8,' +
          encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${isSelected ? '#2563EB' : '#6B7280'}" stroke="white" stroke-width="3"/>
              <text x="20" y="25" text-anchor="middle" fill="white" font-size="14">P</text>
            </svg>
          `),
    scaledSize: new google.maps.Size(isSelected ? 44 : 40, isSelected ? 44 : 40),
  });

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || map) return;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapError('Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and restart the app.');
        return;
      }

      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
        });
        await importLibrary('maps');

        const center = userLocation || { lat: 28.6139, lng: 77.209 };
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
        });

        setMap(mapInstance);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError('Unable to load Google Maps. Check API key restrictions/billing and reload.');
      }
    };

    initMap();
  }, [map, userLocation]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersByIdRef.current = {};

    const newMarkers = pharmacies.map((pharmacy) => {
      const marker = new google.maps.Marker({
        position: pharmacy.coordinates,
        map,
        title: pharmacy.name,
        icon: getMarkerIcon(pharmacy, selectedPharmacyId === pharmacy._id),
      });

      marker.addListener('click', () => {
        setInternalSelectedPharmacyId(pharmacy._id);
        onPharmacySelect?.(pharmacy);
      });

      markersByIdRef.current[pharmacy._id] = marker;
      return marker;
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      markersByIdRef.current = {};
    };
  }, [map, pharmacies, onPharmacySelect, selectedPharmacyId]);

  useEffect(() => {
    if (map && userLocation) {
      map.setCenter(userLocation);
      map.setZoom(13);
    }
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || !selectedPharmacyId) return;
    const selected = pharmacies.find((pharmacy) => pharmacy._id === selectedPharmacyId);
    if (!selected) return;

    map.panTo(selected.coordinates);
    if ((map.getZoom() || 0) < 14) {
      map.setZoom(14);
    }
  }, [map, pharmacies, selectedPharmacyId]);

  useEffect(() => {
    if (!map || pharmacies.length === 0) return;
    const hasVisibleSelectedPharmacy = Boolean(
      selectedPharmacyId && pharmacies.some((pharmacy) => pharmacy._id === selectedPharmacyId)
    );
    if (hasVisibleSelectedPharmacy) return;

    const bounds = new google.maps.LatLngBounds();
    pharmacies.forEach((pharmacy) => {
      bounds.extend(pharmacy.coordinates);
    });

    if (pharmacies.length === 1) {
      map.setCenter(pharmacies[0].coordinates);
      map.setZoom(14);
      return;
    }

    map.fitBounds(bounds);
  }, [map, pharmacies, selectedPharmacyId]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/50">
        <div ref={mapRef} className={`${heightClassName} w-full`} />
        {mapError && (
          <div className="absolute inset-3 flex items-center justify-center rounded-lg border border-amber-300/40 bg-amber-300/10 p-4 text-center text-sm text-amber-100">
            {mapError}
          </div>
        )}
      </div>
      {showInfoCard && selectedPharmacy && (
        <div className="rounded-xl border border-white/10 bg-slate-900/85 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedPharmacy.name}</h3>
              <p className="mt-1 text-sm text-slate-300">{selectedPharmacy.address}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selectedPharmacy.isUsingService && (
                  <span className="inline-flex items-center rounded-full bg-emerald-300/20 px-2 py-1 text-xs font-medium text-emerald-100">
                    ★ Service Partner
                  </span>
                )}
                {selectedPharmacy.subscriptionType && (
                  <span className="inline-flex items-center rounded-full bg-violet-300/20 px-2 py-1 text-xs font-medium text-violet-100">
                    {selectedPharmacy.subscriptionType} subscriber
                  </span>
                )}
                {selectedPharmacy.supportsPrescriptionUpload && (
                  <span className="inline-flex items-center rounded-full bg-sky-300/20 px-2 py-1 text-xs font-medium text-sky-100">
                    Upload Support
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center">
                <span className="text-amber-300">★</span>
                <span className="ml-1 text-sm text-slate-300">
                  {selectedPharmacy.rating} ({selectedPharmacy.reviewCount} reviews)
                </span>
              </div>
            </div>
            <button
              onClick={() => setInternalSelectedPharmacyId(null)}
              className="rounded-md border border-white/10 px-2 py-1 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              aria-label="Close selected pharmacy details"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
