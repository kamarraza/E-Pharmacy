import { NextRequest, NextResponse } from 'next/server';

type GeocodeResult = {
  address_components?: Array<{
    long_name?: string;
    types?: string[];
  }>;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = (searchParams.get('pincode') || '').trim();

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return NextResponse.json({ error: 'Valid Indian PIN code is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        `${pincode}, India`
      )}&components=country:IN&key=${apiKey}`
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocode request failed' }, { status: response.status });
    }

    const payload = (await response.json()) as {
      results?: GeocodeResult[];
      status?: string;
      error_message?: string;
    };

    if (payload.status !== 'OK' || !payload.results?.length) {
      return NextResponse.json(
        { error: payload.error_message || 'Could not resolve city from PIN code' },
        { status: 404 }
      );
    }

    const components = payload.results[0].address_components || [];
    const cityComponent = components.find(
      (component) =>
        component.types?.includes('locality') ||
        component.types?.includes('postal_town') ||
        component.types?.includes('administrative_area_level_2') ||
        component.types?.includes('administrative_area_level_3')
    );

    const city = cityComponent?.long_name || '';
    if (!city) {
      return NextResponse.json({ error: 'City was not found for this PIN code' }, { status: 404 });
    }

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Pincode city lookup error:', error);
    return NextResponse.json({ error: 'Failed to resolve city from PIN code' }, { status: 500 });
  }
}
