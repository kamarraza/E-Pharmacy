import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import getPharmacyModel from '@/models/Pharmacy';
import getPharmacistUserModel from '@/models/PharmacistUser';

const capitalizeFirstCharacter = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000'; // Default 5km radius
    const query = searchParams.get('q'); // Search query for pharmacy name/address
    const location = searchParams.get('location'); // Location-based search for upload page
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const onlySubscribed = searchParams.get('onlySubscribed') === '1';

    const PharmacyModel = await getPharmacyModel();

    type PharmacyResult = {
      _id: mongoose.Types.ObjectId;
      pharmacistId?: mongoose.Types.ObjectId;
      coordinates?: { lat?: number; lng?: number };
      isUsingService?: boolean;
      subscriptionType?: 'monthly' | 'yearly' | 'premium' | null;
      rating?: number;
      reviewCount?: number;
      createdAt?: Date;
      [key: string]: unknown;
    };

    const getPriority = (pharmacy: PharmacyResult) => {
      // Highest priority: subscribed/active service pharmacies.
      if (pharmacy.isUsingService || pharmacy.subscriptionType) return 3;
      // Next: pharmacies registered with us.
      if (pharmacy.pharmacistId) return 2;
      // Lowest: generic listings.
      return 1;
    };

    const sortPharmacies = (list: PharmacyResult[]) =>
      list.sort((a, b) => {
        const priorityDiff = getPriority(b) - getPriority(a);
        if (priorityDiff !== 0) return priorityDiff;

        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;

        const reviewDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
        if (reviewDiff !== 0) return reviewDiff;

        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

    const calculateDistanceMeters = (
      sourceLat: number,
      sourceLng: number,
      targetLat: number,
      targetLng: number
    ) => {
      const toRad = (value: number) => (value * Math.PI) / 180;
      const earthRadiusM = 6371000;
      const dLat = toRad(targetLat - sourceLat);
      const dLng = toRad(targetLng - sourceLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(sourceLat)) *
          Math.cos(toRad(targetLat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return earthRadiusM * c;
    };

    let pharmacies: PharmacyResult[];

    if (lat && lng) {
      const sourceLat = parseFloat(lat);
      const sourceLng = parseFloat(lng);
      const maxDistance = parseInt(radius, 10);
      if (Number.isNaN(sourceLat) || Number.isNaN(sourceLng) || Number.isNaN(maxDistance)) {
        return NextResponse.json({ error: 'Invalid lat/lng/radius' }, { status: 400 });
      }

      const allPharmacies = await PharmacyModel.find({}).lean<PharmacyResult[]>();

      const withDistance = allPharmacies
        .map((pharmacy) => {
          const targetLat = pharmacy.coordinates?.lat;
          const targetLng = pharmacy.coordinates?.lng;
          if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
            return null;
          }
          const distanceMeters = calculateDistanceMeters(sourceLat, sourceLng, targetLat, targetLng);
          return { ...pharmacy, distanceMeters };
        })
        .filter(
          (pharmacy): pharmacy is PharmacyResult & { distanceMeters: number } => !!pharmacy
        )
        .sort((a, b) => {
          const distanceDiff = a.distanceMeters - b.distanceMeters;
          if (distanceDiff !== 0) return distanceDiff;

          const priorityDiff = getPriority(b) - getPriority(a);
          if (priorityDiff !== 0) return priorityDiff;

          return (b.rating || 0) - (a.rating || 0);
        });

      const withinRadius = withDistance.filter((pharmacy) => pharmacy.distanceMeters <= maxDistance);
      const nearestFallback = withinRadius.length > 0 ? withinRadius : withDistance.slice(0, 50);

      pharmacies = nearestFallback.map(
        (pharmacy) =>
          Object.fromEntries(
            Object.entries(pharmacy).filter(([key]) => key !== 'distanceMeters')
          ) as PharmacyResult
      );

    } else if (query) {
      // Text-based search
      pharmacies = await PharmacyModel.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { address: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } }
        ]
      }).lean<PharmacyResult[]>();
      pharmacies = sortPharmacies(pharmacies);
    } else if (location) {
      // Location-based search for upload page
      pharmacies = await PharmacyModel.find({
        location: { $regex: location, $options: 'i' }
      }).lean<PharmacyResult[]>();
      pharmacies = sortPharmacies(pharmacies);
    } else {
      // Return all pharmacies sorted by service usage and rating
      pharmacies = await PharmacyModel.find({}).lean<PharmacyResult[]>();
      pharmacies = sortPharmacies(pharmacies);
    }

    // Filter pharmacies to only include those with valid pharmacist accounts
    const PharmacistUserModel = await getPharmacistUserModel();
    const validPharmacistIds = await PharmacistUserModel.find({}, '_id').lean<{ _id: mongoose.Types.ObjectId }[]>();
    const validPharmacistIdSet = new Set(validPharmacistIds.map((p: { _id: mongoose.Types.ObjectId }) => p._id.toString()));

    const hasLinkedPharmacists = validPharmacistIdSet.size > 0;

    const filteredPharmacies = pharmacies.filter((pharmacy) => {
      if (hasLinkedPharmacists) {
        const hasValidPharmacist =
          pharmacy.pharmacistId && validPharmacistIdSet.has(pharmacy.pharmacistId.toString());
        if (!hasValidPharmacist) return false;
      }

      if (!onlySubscribed) return true;
      return Boolean(pharmacy.isUsingService || pharmacy.subscriptionType);
    });

    // Apply limit if specified
    const result = limit ? filteredPharmacies.slice(0, limit) : filteredPharmacies;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Pharmacy search error:', error);
    return NextResponse.json({ error: 'Failed to search pharmacies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pharmacyData = (await request.json()) as Record<string, unknown>;
    if (typeof pharmacyData.name === 'string') {
      pharmacyData.name = capitalizeFirstCharacter(pharmacyData.name);
    }
    const PharmacyModel = await getPharmacyModel();

    const pharmacy = new PharmacyModel(pharmacyData);
    await pharmacy.save();

    return NextResponse.json({
      message: 'Pharmacy registered successfully',
      id: pharmacy._id
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Pharmacy registration error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Pharmacy already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to register pharmacy' }, { status: 500 });
  }
}
