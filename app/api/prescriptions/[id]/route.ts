import { NextRequest, NextResponse } from 'next/server';
import getPrescriptionModel from '@/models/Prescription';
import { getUserFromToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify pharmacist authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'pharmacist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status || !['assigned', 'fulfilled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const Prescription = await getPrescriptionModel();
    const prescription = await Prescription.findByIdAndUpdate(
      id,
      {
        pharmacistId: user._id,
        status
      },
      { new: true }
    );

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Prescription updated successfully',
      prescription
    });
  } catch (error) {
    console.error('Prescription update error:', error);
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 });
  }
}