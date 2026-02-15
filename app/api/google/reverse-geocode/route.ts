import { NextRequest, NextResponse } from 'next/server';

type GeocodeResult = {
  address_components?: Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (!latParam || !lngParam) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Reverse geocode request failed' }, { status: response.status });
    }

    const payload = (await response.json()) as {
      results?: GeocodeResult[];
      status?: string;
      error_message?: string;
    };

    if (payload.status !== 'OK' || !payload.results?.length) {
      return NextResponse.json(
        { error: payload.error_message || 'Could not resolve city from coordinates' },
        { status: 404 }
      );
    }

    const components = payload.results[0].address_components || [];
    const cityComponent = components.find(
      (component) =>
        component.types?.includes('locality') ||
        component.types?.includes('postal_town') ||
        component.types?.includes('administrative_area_level_2')
    );

    const city = cityComponent?.long_name || '';
    if (!city) {
      return NextResponse.json({ error: 'City was not found in geocode response' }, { status: 404 });
    }

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return NextResponse.json({ error: 'Failed to reverse geocode location' }, { status: 500 });
  }
}
