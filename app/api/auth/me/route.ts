import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserFromToken(token);

    if (!user) {
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
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id,
        name,
        email,
        role,
        location,
        subscriptionType,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
