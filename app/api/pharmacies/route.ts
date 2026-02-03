import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import getPharmacyModel from '@/models/Pharmacy';
import getPharmacistUserModel from '@/models/PharmacistUser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000'; // Default 5km radius
    const query = searchParams.get('q'); // Search query for pharmacy name/address
    const location = searchParams.get('location'); // Location-based search for upload page
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const PharmacyModel = await getPharmacyModel();

    let pharmacies;

    if (lat && lng) {
      // Geospatial search with ranking
      const coordinates = [parseFloat(lng), parseFloat(lat)];

      pharmacies = await PharmacyModel.find({
        coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: parseInt(radius) // radius in meters
          }
        }
      });

      // Sort by ranking: service users first, then by distance
      pharmacies.sort((a: any, b: any) => {
        // Service users get higher priority
        if (a.isUsingService && !b.isUsingService) return -1;
        if (!a.isUsingService && b.isUsingService) return 1;

        // Within same service status, sort by rating
        if (a.rating !== b.rating) return b.rating - a.rating;

        // If ratings are equal, sort by subscription type priority
        const subscriptionPriority = { premium: 3, yearly: 2, monthly: 1, null: 0 };
        const aPriority = subscriptionPriority[a.subscriptionType as keyof typeof subscriptionPriority] || 0;
        const bPriority = subscriptionPriority[b.subscriptionType as keyof typeof subscriptionPriority] || 0;

        return bPriority - aPriority;
      });

    } else if (query) {
      // Text-based search
      pharmacies = await PharmacyModel.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { address: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } }
        ]
      }).sort({ isUsingService: -1, rating: -1 });
    } else if (location) {
      // Location-based search for upload page
      pharmacies = await PharmacyModel.find({
        location: { $regex: location, $options: 'i' }
      }).sort({ isUsingService: -1, rating: -1 });
    } else {
      // Return all pharmacies sorted by service usage and rating
      pharmacies = await PharmacyModel.find({})
        .sort({ isUsingService: -1, rating: -1 });
    }

    // Filter pharmacies to only include those with valid pharmacist accounts
    const PharmacistUserModel = await getPharmacistUserModel();
    const validPharmacistIds = await PharmacistUserModel.find({}, '_id').lean();
    const validPharmacistIdSet = new Set(validPharmacistIds.map((p: { _id: mongoose.Types.ObjectId }) => p._id.toString()));

    const filteredPharmacies = pharmacies.filter((pharmacy: any) =>
      pharmacy.pharmacistId && validPharmacistIdSet.has(pharmacy.pharmacistId.toString())
    );

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
    const pharmacyData = await request.json();
    const PharmacyModel = await getPharmacyModel();

    const pharmacy = new PharmacyModel(pharmacyData);
    await pharmacy.save();

    return NextResponse.json({
      message: 'Pharmacy registered successfully',
      id: pharmacy._id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Pharmacy registration error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Pharmacy already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to register pharmacy' }, { status: 500 });
  }
}