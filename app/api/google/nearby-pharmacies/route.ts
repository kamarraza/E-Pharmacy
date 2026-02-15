import { NextRequest, NextResponse } from 'next/server';

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const cityParam = searchParams.get('city');
    const searchQueryParam = searchParams.get('q');
    const radiusParam = searchParams.get('radius') || '10000';
    const limitParam = searchParams.get('limit') || '60';
    const lat = Number(latParam);
    const lng = Number(lngParam);
    const radius = Math.min(Number(radiusParam), 50000);
    const requestedLimit = Math.max(1, Math.min(Number(limitParam), 60));

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,nextPageToken',
    };

    const allPlaces: GooglePlace[] = [];
    let nextPageToken: string | undefined;

    for (let page = 0; page < 3 && allPlaces.length < requestedLimit; page++) {
      const pageSize = Math.min(20, requestedLimit - allPlaces.length);
      let response: Response;

      if (searchQueryParam && searchQueryParam.trim()) {
        response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            textQuery: `pharmacy ${searchQueryParam.trim()} india`,
            maxResultCount: pageSize,
            pageToken: nextPageToken,
          }),
        });
      } else if (cityParam && cityParam.trim()) {
        response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            textQuery: `pharmacy in ${cityParam.trim()}`,
            maxResultCount: pageSize,
            pageToken: nextPageToken,
          }),
        });
      } else {
        if (!latParam || !lngParam || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius)) {
          return NextResponse.json(
            { error: 'Provide either city or valid lat/lng coordinates' },
            { status: 400 }
          );
        }

        response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            includedTypes: ['pharmacy'],
            maxResultCount: pageSize,
            pageToken: nextPageToken,
            locationRestriction: {
              circle: {
                center: {
                  latitude: lat,
                  longitude: lng,
                },
                radius,
              },
            },
          }),
        });
      }

      if (!response.ok) {
        const errorBody = await response.text();
        return NextResponse.json(
          { error: 'Google Places request failed', details: errorBody },
          { status: response.status }
        );
      }

      const data = (await response.json()) as { places?: GooglePlace[]; nextPageToken?: string };
      const places = data.places || [];
      allPlaces.push(...places);
      nextPageToken = data.nextPageToken;
      if (!nextPageToken || places.length === 0) {
        break;
      }
    }

    const normalized = allPlaces
      .filter((place) => place.location?.latitude && place.location?.longitude)
      .map((place) => ({
        placeId: place.id,
        name: place.displayName?.text || 'Unknown Pharmacy',
        address: place.formattedAddress || '',
        coordinates: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
      }));

    return NextResponse.json(normalized.slice(0, requestedLimit));
  } catch (error) {
    console.error('Nearby Google pharmacies error:', error);
    return NextResponse.json({ error: 'Failed to fetch nearby pharmacies' }, { status: 500 });
  }
}
