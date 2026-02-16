import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import getPharmacistUserModel from '@/models/PharmacistUser';
import getPharmacyModel from '@/models/Pharmacy';

export async function POST() {
  try {
    const PharmacistUserModel = await getPharmacistUserModel();
    const PharmacyModel = await getPharmacyModel();

    const testEmail = 'india.pharmacy@test.local';
    const testPassword = 'India@12345';

    let pharmacist = await PharmacistUserModel.findOne({ email: testEmail });

    if (!pharmacist) {
      const hashed = await hashPassword(testPassword);
      pharmacist = await PharmacistUserModel.create({
        name: 'India Pharmacy',
        email: testEmail,
        password: hashed,
        role: 'pharmacist',
        phone: '+91-9999999999',
        address: 'Connaught Place, New Delhi, India',
        location: 'New Delhi',
        subscriptionType: 'monthly',
        subscriptionStart: new Date(),
        subscriptionEnd: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d;
        })(),
      });
    } else {
      pharmacist.subscriptionType = 'monthly';
      pharmacist.subscriptionStart = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      pharmacist.subscriptionEnd = end;
      pharmacist.location = pharmacist.location || 'New Delhi';
      await pharmacist.save();
    }

    let pharmacy = await PharmacyModel.findOne({ pharmacistId: pharmacist._id });

    if (!pharmacy) {
      pharmacy = await PharmacyModel.create({
        pharmacistId: pharmacist._id,
        name: 'India Pharmacy',
        email: testEmail,
        phone: '+91-9999999999',
        address: 'Connaught Place, New Delhi, India',
        location: 'New Delhi',
        coordinates: { lat: 28.6139, lng: 77.209 },
        supportsPrescriptionUpload: true,
        isUsingService: true,
        subscriptionType: 'monthly',
        rating: 4.7,
        reviewCount: 120,
        services: ['Prescription Fulfillment', 'Home Delivery'],
      });
    } else {
      pharmacy.name = 'India Pharmacy';
      pharmacy.email = testEmail;
      pharmacy.phone = '+91-9999999999';
      pharmacy.address = pharmacy.address || 'Connaught Place, New Delhi, India';
      pharmacy.location = pharmacy.location || 'New Delhi';
      pharmacy.coordinates = pharmacy.coordinates || { lat: 28.6139, lng: 77.209 };
      pharmacy.supportsPrescriptionUpload = true;
      pharmacy.isUsingService = true;
      pharmacy.subscriptionType = 'monthly';
      if (!pharmacy.rating || pharmacy.rating < 1) pharmacy.rating = 4.7;
      if (!pharmacy.reviewCount || pharmacy.reviewCount < 1) pharmacy.reviewCount = 120;
      await pharmacy.save();
    }

    return NextResponse.json({
      message: 'Test pharmacist and pharmacy are ready.',
      credentials: {
        role: 'pharmacist',
        email: testEmail,
        password: testPassword,
      },
      pharmacistId: pharmacist._id,
      pharmacyId: pharmacy._id,
    });
  } catch (error) {
    console.error('Seed test pharmacist error:', error);
    return NextResponse.json({ error: 'Failed to create test pharmacist' }, { status: 500 });
  }
}
