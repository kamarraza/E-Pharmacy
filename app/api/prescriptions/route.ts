import { NextRequest, NextResponse } from 'next/server';
import getPrescriptionModel from '@/models/Prescription';
import { sendNotificationToPharmacists } from '@/app/api/notifications/stream/route';

export async function POST(request: NextRequest) {
  try {
    const Prescription = await getPrescriptionModel();
    const { patientName, patientEmail, patientPhone, patientAddress, prescriptionImages, notes, location, selectedPharmacyIds } = await request.json();

    if (!prescriptionImages || prescriptionImages.length === 0) {
      return NextResponse.json({ error: 'At least one prescription image is required' }, { status: 400 });
    }

    if (!selectedPharmacyIds || selectedPharmacyIds.length === 0) {
      return NextResponse.json({ error: 'At least one pharmacy must be selected' }, { status: 400 });
    }

    // Create pharmacy status entries for each selected pharmacy
    const pharmacyStatuses = selectedPharmacyIds.map((pharmacyId: string) => ({
      pharmacyId,
      status: 'pending',
      assignedAt: new Date()
    }));

    const prescription = new Prescription({
      patientName,
      patientEmail,
      patientPhone,
      patientAddress,
      prescriptionImages,
      notes,
      location,
      pharmacistIds: selectedPharmacyIds,
      pharmacyStatuses,
      status: 'assigned' // Overall status is assigned when pharmacies are selected
    });

    await prescription.save();

    // Send real-time notification to selected pharmacists
    try {
      await sendNotificationToPharmacists(prescription);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the upload if notification fails
    }

    return NextResponse.json({ message: 'Prescription uploaded successfully', id: prescription._id }, { status: 201 });
  } catch (error) {
    console.error('Prescription upload error:', error);
    return NextResponse.json({ error: 'Failed to upload prescription' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const Prescription = await getPrescriptionModel();
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const status = searchParams.get('status') || 'pending';

    const query: Record<string, unknown> = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (location && location.trim()) {
      query.location = { $regex: location, $options: 'i' };
    }

    const prescriptions = await Prescription.find(query).sort({ createdAt: -1 });

    return NextResponse.json(prescriptions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 });
  }
}
