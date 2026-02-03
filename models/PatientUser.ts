import mongoose from 'mongoose';
import { dbConnectPatients } from '@/lib/mongodb';

// Patient User Schema
const PatientUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient'], required: true, default: 'patient' },
  phone: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Export a function that returns the model after ensuring connection
const getPatientUserModel = async () => {
  const conn = await dbConnectPatients();
  return conn.models.PatientUser || conn.model('PatientUser', PatientUserSchema);
};

export default getPatientUserModel;