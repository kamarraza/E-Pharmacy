import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserModel } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
};

export const getUserFromToken = async (token: string) => {
  try {
    const payload = verifyToken(token);
    if (!payload) return null;

    if (!['patient', 'pharmacist'].includes(payload.role)) {
      return null;
    }

    const UserModel = await getUserModel(payload.role as 'patient' | 'pharmacist');
    return await UserModel.findById(payload.id);
  } catch (error) {
    console.error('getUserFromToken error:', error);
    return null;
  }
};
