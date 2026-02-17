import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

const getSafeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const capitalizeFirstCharacter = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const safeUser = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? ((user as { toObject: () => Record<string, unknown> }).toObject())
      : (user as unknown as Record<string, unknown>);

    const role = getSafeString(safeUser.role);
    let subscriptionType = getSafeString(safeUser.subscriptionType);
    const subscriptionStart = safeUser.subscriptionStart ? String(safeUser.subscriptionStart) : '';
    const subscriptionEnd = safeUser.subscriptionEnd ? String(safeUser.subscriptionEnd) : '';

    if (role === 'pharmacist' && (!subscriptionType || !subscriptionStart || !subscriptionEnd)) {
      try {
        const PharmacyModel = await getPharmacyModel();
        const pharmacy = await PharmacyModel.findOne({ pharmacistId: safeUser._id })
          .select('subscriptionType')
          .lean<{ subscriptionType?: unknown } | null>();
        if (!subscriptionType) {
          subscriptionType = getSafeString(pharmacy?.subscriptionType);
        }
      } catch {
        // Keep profile GET resilient if pharmacy lookup fails.
      }
    }

    return NextResponse.json({
      profile: {
        id: safeUser._id ? String(safeUser._id) : '',
        name: getSafeString(safeUser.name),
        email: getSafeString(safeUser.email),
        role,
        phone: getSafeString(safeUser.phone),
        address: getSafeString(safeUser.address),
        location: getSafeString(safeUser.location),
        subscriptionType,
        subscriptionStart,
        subscriptionEnd,
      },
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const name = getSafeString(body?.name);
    const phone = getSafeString(body?.phone);
    const address = getSafeString(body?.address);
    const location = getSafeString(body?.location);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const role = getSafeString((user as { role?: unknown }).role);
    const normalizedName = role === 'pharmacist' ? capitalizeFirstCharacter(name) : name;

    (user as { name: string }).name = normalizedName;
    (user as { phone?: string }).phone = phone;
    (user as { address?: string }).address = address;

    if (role === 'pharmacist') {
      (user as { location?: string }).location = location;
    }

    await user.save();

    if (role === 'pharmacist') {
      const PharmacyModel = await getPharmacyModel();
      const pharmacistId = (user as { _id: unknown })._id;

      const pharmacyUpdates: Record<string, string> = {
        name: normalizedName,
        email: getSafeString((user as { email?: unknown }).email),
      };
      if (phone) pharmacyUpdates.phone = phone;
      if (address) pharmacyUpdates.address = address;
      if (location) pharmacyUpdates.location = location;

      await PharmacyModel.findOneAndUpdate({ pharmacistId }, pharmacyUpdates, { new: true });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: {
        id: (user as { _id: { toString: () => string } })._id.toString(),
        name: normalizedName,
        email: getSafeString((user as { email?: unknown }).email),
        role,
        phone,
        address,
        location: role === 'pharmacist' ? location : '',
        subscriptionType: getSafeString((user as { subscriptionType?: unknown }).subscriptionType),
        subscriptionStart: (user as { subscriptionStart?: unknown }).subscriptionStart
          ? String((user as { subscriptionStart?: unknown }).subscriptionStart)
          : '',
        subscriptionEnd: (user as { subscriptionEnd?: unknown }).subscriptionEnd
          ? String((user as { subscriptionEnd?: unknown }).subscriptionEnd)
          : '',
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
