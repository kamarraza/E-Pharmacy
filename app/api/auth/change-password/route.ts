import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, getUserFromToken, hashPassword } from '@/lib/auth';
import { getDatabaseErrorResponse } from '@/lib/apiError';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirm password do not match' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    const existingPassword = typeof (user as { password?: unknown }).password === 'string'
      ? ((user as { password: string }).password)
      : '';

    if (!existingPassword) {
      return NextResponse.json({ error: 'Password is not set for this account' }, { status: 400 });
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, existingPassword);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    (user as { password: string }).password = hashedPassword;
    await user.save();

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    const databaseErrorResponse = getDatabaseErrorResponse(error);
    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
