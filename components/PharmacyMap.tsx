'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

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

interface PharmacyMapProps {
  pharmacies: Pharmacy[];
  userLocation?: { lat: number; lng: number };
  onPharmacySelect?: (pharmacy: Pharmacy) => void;
}

export default function PharmacyMap({ pharmacies, userLocation, onPharmacySelect }: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
      });

      try {
        const { Map } = await loader.importLibrary('maps');
        const { Marker } = await loader.importLibrary('marker');

        // Default center (can be user's location)
        const center = userLocation || { lat: 28.6139, lng: 77.2090 }; // Default to Delhi

        const mapInstance = new Map(mapRef.current!, {
          center,
          zoom: 12,
          mapId: 'pharmacy-finder',
        });

        setMap(mapInstance);

        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));

        // Add markers for pharmacies
        const newMarkers = pharmacies.map((pharmacy) => {
          const marker = new Marker({
            position: pharmacy.coordinates,
            map: mapInstance,
            title: pharmacy.name,
            icon: {
              url: pharmacy.isUsingService
                ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
                    <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">★</text>
                  </svg>
                `)
                : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
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

        setMarkers(newMarkers);

      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    if (mapRef.current && !map) {
      initMap();
    }
  }, [pharmacies, userLocation]);

  useEffect(() => {
    if (map && userLocation) {
      map.setCenter(userLocation);
    }
  }, [map, userLocation]);

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-96 rounded-lg shadow-lg" />
      {selectedPharmacy && (
        <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{selectedPharmacy.name}</h3>
              <p className="text-gray-600 text-sm">{selectedPharmacy.address}</p>
              <div className="flex items-center mt-2">
                {selectedPharmacy.isUsingService && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                    ★ Service Partner
                  </span>
                )}
                {selectedPharmacy.supportsPrescriptionUpload && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📄 Upload Support
                  </span>
                )}
              </div>
              <div className="flex items-center mt-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm text-gray-600 ml-1">
                  {selectedPharmacy.rating} ({selectedPharmacy.reviewCount} reviews)
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPharmacy(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}