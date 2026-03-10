import { NextRequest, NextResponse } from 'next/server';
import { getUserModel } from '@/models/User';
import { hashPassword } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

type GeocodeResult = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  address_components?: Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
};

const INDIAN_PIN_REGEX = /^[1-9][0-9]{5}$/;
const capitalizeFirstCharacter = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

type CreateUserData = {
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'pharmacist';
  phone?: string;
  address?: string;
  location?: string;
  subscriptionType?: string;
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type GeocodedIndiaResult = {
  city: string;
  formattedAddress: string;
  coordinates: Coordinates;
};

const geocodeIndianLocation = async (rawLocation: string): Promise<GeocodedIndiaResult | null> => {
  const location = rawLocation.trim();
  if (!location) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const query = INDIAN_PIN_REGEX.test(location) ? `${location}, India` : location;
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query
    )}&components=country:IN&key=${apiKey}`
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { results?: GeocodeResult[]; status?: string };
  if (payload.status !== 'OK' || !payload.results?.length) return null;

  const firstResult = payload.results[0];
  const components = firstResult.address_components || [];
  const country = components.find((component) => component.types?.includes('country'));
  const isIndia = country?.short_name === 'IN' || country?.long_name?.toLowerCase() === 'india';
  if (!isIndia) return null;

  const cityComponent = components.find(
    (component) =>
      component.types?.includes('locality') ||
      component.types?.includes('postal_town') ||
      component.types?.includes('administrative_area_level_2') ||
      component.types?.includes('administrative_area_level_3')
  );

  const lat = firstResult.geometry?.location?.lat;
  const lng = firstResult.geometry?.location?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  return {
    city: cityComponent?.long_name?.trim() || location,
    formattedAddress: firstResult.formatted_address?.trim() || '',
    coordinates: { lat, lng },
  };
};

const reverseGeocodeIndianCoordinates = async (
  coordinates: Coordinates
): Promise<{ city: string; formattedAddress: string } | null> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${apiKey}`
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { results?: GeocodeResult[]; status?: string };
  if (payload.status !== 'OK' || !payload.results?.length) return null;

  const firstResult = payload.results[0];
  const components = firstResult.address_components || [];
  const country = components.find((component) => component.types?.includes('country'));
  const isIndia = country?.short_name === 'IN' || country?.long_name?.toLowerCase() === 'india';
  if (!isIndia) return null;

  const cityComponent = components.find(
    (component) =>
      component.types?.includes('locality') ||
      component.types?.includes('postal_town') ||
      component.types?.includes('administrative_area_level_2') ||
      component.types?.includes('administrative_area_level_3')
  );

  const city = cityComponent?.long_name?.trim() || '';
  if (!city) return null;

  return {
    city,
    formattedAddress: firstResult.formatted_address?.trim() || '',
  };
};

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      location,
      subscriptionType,
      pharmacyCoordinates,
    } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    if (!['patient', 'pharmacist'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const normalizedName =
      role === 'pharmacist' ? capitalizeFirstCharacter(name) : name;

    const hashedPassword = await hashPassword(password);

    const UserModel = await getUserModel(role as 'patient' | 'pharmacist');

    // Prepare user data based on role
    const userData: CreateUserData = {
      name: normalizedName,
      email,
      password: hashedPassword,
      role: role as 'patient' | 'pharmacist',
      phone,
      address,
    };
    let pharmacyCoordinatesForCreate: Coordinates = { lat: 28.6139, lng: 77.209 };

    // Add role-specific fields
    if (role === 'pharmacist') {
      let pharmacyLocation = '';
      let pharmacyAddress = typeof address === 'string' ? address.trim() : '';
      const hasCoordinates =
        pharmacyCoordinates &&
        typeof pharmacyCoordinates === 'object' &&
        typeof (pharmacyCoordinates as { lat?: unknown }).lat === 'number' &&
        typeof (pharmacyCoordinates as { lng?: unknown }).lng === 'number';

      if (hasCoordinates) {
        pharmacyCoordinatesForCreate = {
          lat: (pharmacyCoordinates as { lat: number }).lat,
          lng: (pharmacyCoordinates as { lng: number }).lng,
        };
        const reverseData = await reverseGeocodeIndianCoordinates(pharmacyCoordinatesForCreate);
        if (!reverseData) {
          return NextResponse.json(
            { error: 'Map-selected pharmacy location must be inside India' },
            { status: 400 }
          );
        }
        pharmacyLocation = reverseData.city;
        if (!pharmacyAddress) {
          pharmacyAddress = reverseData.formattedAddress;
        }
      } else {
        if (!location || typeof location !== 'string' || !location.trim()) {
          return NextResponse.json(
            { error: 'Service location is required for pharmacists' },
            { status: 400 }
          );
        }
        const geocoded = await geocodeIndianLocation(location);
        if (!geocoded) {
          return NextResponse.json(
            { error: 'Only valid Indian locations are allowed for pharmacist registration' },
            { status: 400 }
          );
        }
        pharmacyLocation = geocoded.city;
        pharmacyCoordinatesForCreate = geocoded.coordinates;
      }

      if (!pharmacyAddress) {
        return NextResponse.json(
          { error: 'Pharmacy address is required. Add it manually or pick from map.' },
          { status: 400 }
        );
      }

      userData.location = pharmacyLocation;
      userData.address = pharmacyAddress;
      if (subscriptionType) {
        userData.subscriptionType = subscriptionType;
        userData.subscriptionStart = new Date();
        const subscriptionEnd = new Date();
        if (subscriptionType === 'monthly') {
          subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
        } else if (subscriptionType === 'yearly' || subscriptionType === 'premium') {
          subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
        }
        userData.subscriptionEnd = subscriptionEnd;
      }
    }

    const user = new UserModel(userData);
    await user.save();

    // If registering as pharmacist, also create pharmacy entry
    if (role === 'pharmacist') {
      try {
        const PharmacyModel = await getPharmacyModel();
        const pharmacyData = {
          pharmacistId: user._id,
          name: normalizedName,
          email,
          phone,
          address: userData.address,
          location: userData.location,
          coordinates: pharmacyCoordinatesForCreate,
          supportsPrescriptionUpload: subscriptionType ? true : false,
          isUsingService: subscriptionType ? true : false,
          subscriptionType,
          rating: 0,
          reviewCount: 0,
          services: []
        };

        const pharmacy = new PharmacyModel(pharmacyData);
        await pharmacy.save();
      } catch (pharmacyError) {
        console.error('Error creating pharmacy entry:', pharmacyError);
        // Don't fail the registration if pharmacy creation fails
      }
    }

    return NextResponse.json({ message: 'User created successfully', id: user._id }, { status: 201 });
  } catch (error: unknown) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';
    const errorName =
      typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name?: unknown }).name || '')
        : '';

    if (errorCode === 11000) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    if (errorMessage.includes('MongoDB URI is not configured')) {
      return NextResponse.json(
        { error: 'Server database is not configured. Contact support.' },
        { status: 500 }
      );
    }

    if (
      errorName === 'MongooseServerSelectionError' ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('querySrv') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('authentication failed')
    ) {
      return NextResponse.json(
        { error: 'Unable to connect to database. Please try again shortly.' },
        { status: 503 }
      );
    }

    console.error('User creation error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const location = searchParams.get('location');

    if (!role) {
      return NextResponse.json({ error: 'Role parameter is required' }, { status: 400 });
    }

    if (!['patient', 'pharmacist'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const UserModel = await getUserModel(role as 'patient' | 'pharmacist');

    const query: Record<string, unknown> = {};
    if (location) query.location = { $regex: location, $options: 'i' };

    const users = await UserModel.find(query);

    return NextResponse.json(users);
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
