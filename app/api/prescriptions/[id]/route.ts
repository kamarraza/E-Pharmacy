import { NextRequest, NextResponse } from 'next/server';
import getPrescriptionModel from '@/models/Prescription';
import { getUserFromToken } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || !['pharmacist', 'patient'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as {
      status?: 'assigned' | 'request_fulfillment' | 'confirm_fulfillment';
      pharmacyId?: string;
      availabilityResponse?: 'not_available' | 'same_medicine_available' | 'same_salt_different_company';
      customMessage?: string;
    };
    const { status, pharmacyId, availabilityResponse, customMessage } = body;

    const Prescription = await getPrescriptionModel();
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    if (!Array.isArray(prescription.pharmacyStatuses)) {
      prescription.pharmacyStatuses = [];
    }

    if (user.role === 'patient') {
      if (prescription.patientEmail !== user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (status !== 'confirm_fulfillment' || !pharmacyId) {
        return NextResponse.json({ error: 'Invalid patient confirmation request' }, { status: 400 });
      }

      const matchingStatus = prescription.pharmacyStatuses.find(
        (entry: { pharmacyId?: unknown }) => String(entry?.pharmacyId) === String(pharmacyId)
      );

      if (!matchingStatus) {
        return NextResponse.json({ error: 'Selected pharmacy not found for this prescription' }, { status: 404 });
      }

      if (matchingStatus.status !== 'fulfillment_requested') {
        return NextResponse.json({ error: 'No pending fulfillment confirmation request from this pharmacy' }, { status: 400 });
      }

      matchingStatus.status = 'fulfilled';
      matchingStatus.completedAt = new Date();

      const statuses = prescription.pharmacyStatuses.map((entry: { status?: string }) => entry?.status || 'pending');
      const hasFulfilled = statuses.includes('fulfilled');
      const hasOpen = statuses.some((value: string) => !['fulfilled', 'rejected'].includes(value));
      if (hasFulfilled && !hasOpen) {
        prescription.status = 'fulfilled';
      }

      await prescription.save();

      return NextResponse.json({
        message: 'Fulfillment confirmed successfully',
        prescription,
      });
    }

    if (!status || !['assigned', 'request_fulfillment'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (status === 'assigned') {
      const validAvailabilityResponses = new Set([
        'not_available',
        'same_medicine_available',
        'same_salt_different_company',
      ]);
      if (!availabilityResponse || !validAvailabilityResponses.has(availabilityResponse)) {
        return NextResponse.json(
          { error: 'Select a valid medicine availability response' },
          { status: 400 }
        );
      }
      if (typeof customMessage === 'string' && customMessage.length > 500) {
        return NextResponse.json(
          { error: 'Custom message must be 500 characters or fewer' },
          { status: 400 }
        );
      }
    }

    const PharmacyModel = await getPharmacyModel();
    const pharmacy = await PharmacyModel.findOne({ pharmacistId: user._id }).select('_id');
    if (!pharmacy?._id) {
      return NextResponse.json({ error: 'Pharmacy profile not found for this pharmacist' }, { status: 404 });
    }

    const pharmacyIdString = pharmacy?._id ? String(pharmacy._id) : '';

    if (pharmacyIdString) {
      const matchingStatus = prescription.pharmacyStatuses.find(
        (entry: { pharmacyId?: unknown }) => String(entry?.pharmacyId) === pharmacyIdString
      );
      if (status === 'assigned') {
        if (matchingStatus) {
          matchingStatus.status = 'accepted';
          matchingStatus.availabilityResponse = availabilityResponse;
          matchingStatus.pharmacistMessage = (customMessage || '').trim();
          matchingStatus.assignedAt = new Date();
        } else {
          prescription.pharmacyStatuses.push({
            pharmacyId: pharmacy._id,
            status: 'accepted',
            availabilityResponse,
            pharmacistMessage: (customMessage || '').trim(),
            assignedAt: new Date(),
          });
        }
      } else if (status === 'request_fulfillment') {
        if (prescription.status !== 'assigned') {
          return NextResponse.json(
            { error: 'Prescription must be accepted before requesting patient fulfillment' },
            { status: 400 }
          );
        }

        if (matchingStatus?.status === 'fulfillment_requested') {
          return NextResponse.json({
            message: 'Patient confirmation already requested',
            prescription,
          });
        }
        const resolvedAvailability =
          (availabilityResponse as string | undefined) ||
          (matchingStatus?.availabilityResponse as string | undefined) ||
          'same_medicine_available';
        const resolvedMessage =
          typeof customMessage === 'string'
            ? customMessage.trim()
            : (matchingStatus?.pharmacistMessage as string | undefined) || '';

        // Write fulfillment request directly to MongoDB to avoid stale in-memory enum issues.
        if (matchingStatus) {
          await Prescription.updateOne(
            { _id: id, 'pharmacyStatuses.pharmacyId': pharmacy._id },
            {
              $set: {
                'pharmacyStatuses.$.status': 'fulfillment_requested',
                'pharmacyStatuses.$.availabilityResponse': resolvedAvailability,
                'pharmacyStatuses.$.pharmacistMessage': resolvedMessage,
                status: 'assigned',
              },
            }
          );
        } else {
          await Prescription.updateOne(
            { _id: id },
            {
              $push: {
                pharmacyStatuses: {
                  pharmacyId: pharmacy._id,
                  status: 'fulfillment_requested',
                  availabilityResponse: resolvedAvailability,
                  pharmacistMessage: resolvedMessage,
                  assignedAt: new Date(),
                },
              },
              $set: { status: 'assigned' },
            }
          );
        }

        const updatedPrescription = await Prescription.findById(id);
        return NextResponse.json({
          message: 'Patient confirmation requested for fulfillment',
          prescription: updatedPrescription || prescription,
        });
      }
    }

    if (status === 'assigned') {
      prescription.status = 'assigned';
    }
    await prescription.save();

    return NextResponse.json({
      message:
        status === 'request_fulfillment'
          ? 'Patient confirmation requested for fulfillment'
          : 'Prescription accepted successfully',
      prescription
    });
  } catch (error) {
    console.error('Prescription update error:', error);
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const Prescription = await getPrescriptionModel();

    const deletedPrescription = await Prescription.findOneAndDelete({
      _id: id,
      patientEmail: user.email,
    });

    if (!deletedPrescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Prescription removed successfully' });
  } catch (error) {
    console.error('Prescription delete error:', error);
    return NextResponse.json({ error: 'Failed to remove prescription' }, { status: 500 });
  }
}
