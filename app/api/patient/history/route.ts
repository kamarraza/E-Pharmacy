import { NextRequest, NextResponse } from 'next/server';
import getPrescriptionModel from '@/models/Prescription';
import getPharmacyModel from '@/models/Pharmacy';
import { getUserFromToken } from '@/lib/auth';

type PharmacyStatusEntry = {
  pharmacyId?: unknown;
  status?: string;
  availabilityResponse?: string | null;
  pharmacistMessage?: string;
  assignedAt?: string | null;
  completedAt?: string | null;
};

type PrescriptionRecord = Record<string, unknown> & {
  pharmacyStatuses?: PharmacyStatusEntry[];
  toObject?: () => Record<string, unknown> & { pharmacyStatuses?: PharmacyStatusEntry[] };
};

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
    const typedPrescriptions = prescriptions as PrescriptionRecord[];

    const pharmacyIds = Array.from(
      new Set(
        typedPrescriptions.flatMap((prescription) =>
          Array.isArray(prescription.pharmacyStatuses)
            ? prescription.pharmacyStatuses
                .map((entry: { pharmacyId?: unknown }) => String(entry?.pharmacyId || ''))
                .filter(Boolean)
            : []
        )
      )
    );

    let pharmacyById = new Map<string, { _id: unknown; name: string; address: string; location: string }>();
    if (pharmacyIds.length > 0) {
      const Pharmacy = await getPharmacyModel();
      const pharmacies = await Pharmacy.find({ _id: { $in: pharmacyIds } })
        .select('_id name address location')
        .lean();

      pharmacyById = new Map(
        pharmacies.map((pharmacy: { _id: unknown; name: string; address: string; location: string }) => [
          String(pharmacy._id),
          pharmacy,
        ])
      );
    }

    const enrichedPrescriptions = typedPrescriptions.map((prescription) => {
      const base = prescription?.toObject ? prescription.toObject() : prescription;
      const pharmacyDetails = (Array.isArray(base.pharmacyStatuses) ? base.pharmacyStatuses : []).map(
        (entry: PharmacyStatusEntry) => {
          const pharmacyId = String(entry?.pharmacyId || '');
          const pharmacy = pharmacyById.get(pharmacyId);
          return {
            pharmacyId,
            name: pharmacy?.name || 'Pharmacy name unavailable',
            address: pharmacy?.address || '',
            location: pharmacy?.location || '',
            status: entry?.status || 'pending',
            availabilityResponse: entry?.availabilityResponse || null,
            pharmacistMessage: entry?.pharmacistMessage || '',
            assignedAt: entry?.assignedAt || null,
            completedAt: entry?.completedAt || null,
          };
        }
      );

      return {
        ...base,
        pharmacyDetails,
      };
    });

    return NextResponse.json(enrichedPrescriptions);
  } catch (error) {
    console.error('Patient history error:', error);
    return NextResponse.json({ error: 'Failed to fetch prescription history' }, { status: 500 });
  }
}
