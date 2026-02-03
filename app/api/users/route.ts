import { NextRequest, NextResponse } from 'next/server';
import { getUserModel } from '@/models/User';
import { hashPassword } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import getPharmacyModel from '@/models/Pharmacy';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, phone, address, location, subscriptionType } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    if (!['patient', 'pharmacist'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const UserModel = await getUserModel(role as 'patient' | 'pharmacist');

    // Prepare user data based on role
    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
    };

    // Add role-specific fields
    if (role === 'pharmacist') {
      userData.location = location;
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
          name,
          email,
          phone,
          address,
          location,
          coordinates: { lat: 28.6139, lng: 77.2090 }, // Default coordinates, should be updated with actual location
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
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
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

    const query: any = {};
    if (location) query.location = { $regex: location, $options: 'i' };

    const users = await UserModel.find(query);

    return NextResponse.json(users);
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}