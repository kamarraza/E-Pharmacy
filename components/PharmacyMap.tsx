'use client';

import { Loader } from '@googlemaps/js-api-loader';
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
}

export default function PharmacyMap({ pharmacies, userLocation, onPharmacySelect }: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || map) return;

      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
      });

      try {
        await loader.load();

        const center = userLocation || { lat: 28.6139, lng: 77.209 };
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
        });

        setMap(mapInstance);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, [map, userLocation]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));

    const newMarkers = pharmacies.map((pharmacy) => {
      const marker = new google.maps.Marker({
        position: pharmacy.coordinates,
        map,
        title: pharmacy.name,
        icon: {
          url:
            pharmacy.isUsingService || pharmacy.subscriptionType
              ? 'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
                    <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">★</text>
                  </svg>
                `)
              : 'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#6B7280" stroke="white" stroke-width="3"/>
                    <text x="20" y="25" text-anchor="middle" fill="white" font-size="14">P</text>
                  </svg>
                `),
          scaledSize: new google.maps.Size(40, 40),
        },
      });

      marker.addListener('click', () => {
        setSelectedPharmacy(pharmacy);
        onPharmacySelect?.(pharmacy);
      });

      return marker;
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [map, pharmacies, onPharmacySelect]);

  useEffect(() => {
    if (map && userLocation) {
      map.setCenter(userLocation);
      map.setZoom(13);
    }
  }, [map, userLocation]);

  return (
    <div className="relative">
      <div ref={mapRef} className="h-96 w-full rounded-lg shadow-lg" />
      {selectedPharmacy && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedPharmacy.name}</h3>
              <p className="text-sm text-gray-600">{selectedPharmacy.address}</p>
              <div className="mt-2 flex items-center">
                {selectedPharmacy.isUsingService && (
                  <span className="mr-2 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    ★ Service Partner
                  </span>
                )}
                {selectedPharmacy.subscriptionType && (
                  <span className="mr-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                    {selectedPharmacy.subscriptionType} subscriber
                  </span>
                )}
                {selectedPharmacy.supportsPrescriptionUpload && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                    Upload Support
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center">
                <span className="text-yellow-400">★</span>
                <span className="ml-1 text-sm text-gray-600">
                  {selectedPharmacy.rating} ({selectedPharmacy.reviewCount} reviews)
                </span>
              </div>
            </div>
            <button onClick={() => setSelectedPharmacy(null)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
