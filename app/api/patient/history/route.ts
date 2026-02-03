import { NextRequest, NextResponse } from 'next/server';
import getPrescriptionModel from '@/models/Prescription';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prescriptions for this patient from main database
    const Prescription = await getPrescriptionModel();
    const prescriptions = await Prescription.find({
      patientEmail: user.email
    }).sort({ createdAt: -1 });

    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error('Patient history error:', error);
    return NextResponse.json({ error: 'Failed to fetch prescription history' }, { status: 500 });
  }
}