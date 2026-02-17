import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

const VALID_PLANS = new Set(['monthly', 'yearly', 'premium']);

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'pharmacist') {
      return NextResponse.json({ error: 'Only pharmacists can activate a plan' }, { status: 403 });
    }

    const body = (await request.json()) as { planId?: string };
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    if (!VALID_PLANS.has(planId)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const now = new Date();
    const end = new Date(now);
    if (planId === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }

    (user as { subscriptionType?: string }).subscriptionType = planId;
    (user as { subscriptionStart?: Date }).subscriptionStart = now;
    (user as { subscriptionEnd?: Date }).subscriptionEnd = end;
    await user.save();

    const PharmacyModel = await getPharmacyModel();
    await PharmacyModel.findOneAndUpdate(
      { pharmacistId: user._id },
      {
        subscriptionType: planId,
        isUsingService: true,
        supportsPrescriptionUpload: true,
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Plan activated successfully',
      subscriptionType: planId,
      subscriptionStart: now.toISOString(),
      subscriptionEnd: end.toISOString(),
    });
  } catch (error) {
    console.error('Subscription activation error:', error);
    return NextResponse.json({ error: 'Failed to activate plan' }, { status: 500 });
  }
}
