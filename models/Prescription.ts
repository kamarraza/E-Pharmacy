import mongoose from 'mongoose';
import { dbConnectMain } from '@/lib/mongodb';

// Prescription Schema for main database
const PrescriptionSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  patientPhone: { type: String },
  patientAddress: { type: String },
  prescriptionImages: [{ type: String }], // Array of base64 images
  notes: { type: String },
  status: { type: String, enum: ['pending', 'assigned', 'fulfilled'], default: 'pending' },
  pharmacistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of assigned pharmacy IDs
  pharmacyStatuses: [{
    pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'fulfilled'], default: 'pending' },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  }],
  createdAt: { type: Date, default: Date.now },
  location: { type: String, required: true }, // city or zip for nearby matching
});

// Create and export the Prescription model for main database
let Prescription: any;

const getPrescriptionModel = async () => {
  if (Prescription) return Prescription;

  try {
    const mainConn = await dbConnectMain();
    Prescription = mainConn.models.Prescription || mainConn.model('Prescription', PrescriptionSchema);
    return Prescription;
  } catch (error) {
    console.error('Error creating Prescription model:', error);
    throw error;
  }
};

export default getPrescriptionModel;