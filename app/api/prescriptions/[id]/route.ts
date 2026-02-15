import { NextRequest, NextResponse } from 'next/server';
import getPrescriptionModel from '@/models/Prescription';
import { getUserFromToken } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

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
    const PharmacyModel = await getPharmacyModel();
    const pharmacy = await PharmacyModel.findOne({ pharmacistId: user._id }).select('_id');

    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    const pharmacyIdString = pharmacy?._id ? String(pharmacy._id) : '';

    if (!Array.isArray(prescription.pharmacyStatuses)) {
      prescription.pharmacyStatuses = [];
    }

    if (pharmacyIdString) {
      const matchingStatus = prescription.pharmacyStatuses.find(
        (entry: { pharmacyId?: unknown }) => String(entry?.pharmacyId) === pharmacyIdString
      );
      if (matchingStatus) {
        if (status === 'assigned') {
          matchingStatus.status = 'accepted';
          matchingStatus.assignedAt = new Date();
        } else if (status === 'fulfilled') {
          matchingStatus.status = 'fulfilled';
          matchingStatus.completedAt = new Date();
        }
      } else {
        prescription.pharmacyStatuses.push({
          pharmacyId: pharmacy._id,
          status: status === 'fulfilled' ? 'fulfilled' : 'accepted',
          assignedAt: new Date(),
          completedAt: status === 'fulfilled' ? new Date() : undefined,
        });
      }
    }

    if (status === 'assigned' && prescription.status === 'assigned') {
      // Already assigned globally; allow idempotent success for Assign button.
      return NextResponse.json({
        message: 'Prescription already assigned',
        prescription,
      });
    }

    prescription.status = status;
    await prescription.save();

    return NextResponse.json({
      message: 'Prescription updated successfully',
      prescription
    });
  } catch (error) {
    console.error('Prescription update error:', error);
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 });
  }
}
