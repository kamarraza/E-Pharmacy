import mongoose from 'mongoose';
import { dbConnectPharmacists } from '@/lib/mongodb';

// Pharmacist User Schema
const PharmacistUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['pharmacist'], required: true, default: 'pharmacist' },
  phone: { type: String },
  address: { type: String },
  location: { type: String }, // pharmacy store location
  subscriptionType: { type: String, enum: ['monthly', 'yearly', 'premium'], default: null },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Export a function that returns the model after ensuring connection
const getPharmacistUserModel = async () => {
  const conn = await dbConnectPharmacists();
  return conn.models.PharmacistUser || conn.model('PharmacistUser', PharmacistUserSchema);
};

export default getPharmacistUserModel;