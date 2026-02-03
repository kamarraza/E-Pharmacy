import getPatientUserModel from './PatientUser';
import getPharmacistUserModel from './PharmacistUser';

// Function to get the appropriate User model based on role
export const getUserModel = async (role: 'patient' | 'pharmacist') => {
  if (role === 'patient') {
    return await getPatientUserModel();
  } else if (role === 'pharmacist') {
    return await getPharmacistUserModel();
  } else {
    throw new Error('Invalid user role');
  }
};

// Legacy User model for backward compatibility (uses patient database)
import mongoose from 'mongoose';

const LegacyUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'pharmacist'], required: true },
  phone: { type: String },
  address: { type: String },
  location: { type: String }, // for pharmacists, their store location
  subscriptionType: { type: String, enum: ['monthly', 'yearly', 'premium'], default: null },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const LegacyUser = mongoose.models.User || mongoose.model('User', LegacyUserSchema);

export default LegacyUser;