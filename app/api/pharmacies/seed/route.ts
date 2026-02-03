import { NextRequest, NextResponse } from 'next/server';
import { seedPharmacies } from '@/lib/seedPharmacies';

export async function POST(request: NextRequest) {
  try {
    await seedPharmacies();
    return NextResponse.json({ message: 'Pharmacies seeded successfully' });
  } catch (error) {
    console.error('Error seeding pharmacies:', error);
    return NextResponse.json({ error: 'Failed to seed pharmacies' }, { status: 500 });
  }
}