import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

export async function GET(request: NextRequest) {
  try {
    const isOptional = request.nextUrl.searchParams.get('optional') === '1';
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      if (isOptional) {
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      if (isOptional) {
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const safeUser = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? ((user as { toObject: () => Record<string, unknown> }).toObject())
      : (user as unknown as Record<string, unknown>);

    const id = safeUser._id ? String(safeUser._id) : '';
    const name = typeof safeUser.name === 'string' ? safeUser.name : '';
    const email = typeof safeUser.email === 'string' ? safeUser.email : '';
    const role = typeof safeUser.role === 'string' ? safeUser.role : '';
    const location = typeof safeUser.location === 'string' ? safeUser.location : '';
    const subscriptionType =
      typeof safeUser.subscriptionType === 'string' ? safeUser.subscriptionType : null;

    if (!id || !email || !role) {
      if (isOptional) {
        return NextResponse.json({ user: null });
      }
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
    }

    let pharmacyId: string | null = null;
    if (role === 'pharmacist' && id) {
      const PharmacyModel = await getPharmacyModel();
      const pharmacy = await PharmacyModel.findOne({ pharmacistId: id }).select('_id').lean<{ _id: unknown } | null>();
      if (pharmacy?._id) {
        pharmacyId = String(pharmacy._id);
      }
    }

    return NextResponse.json({
      user: {
        id,
        name,
        email,
        role,
        location,
        subscriptionType,
        pharmacyId,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    if (request.nextUrl.searchParams.get('optional') === '1') {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
