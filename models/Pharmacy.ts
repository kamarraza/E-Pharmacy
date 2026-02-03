import mongoose from 'mongoose';
import { dbConnectMain } from '@/lib/mongodb';

// Pharmacy Schema for enhanced pharmacy finder
const PharmacySchema = new mongoose.Schema({
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PharmacistUser' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String, required: true },
  location: { type: String, required: true }, // City/area
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  supportsPrescriptionUpload: { type: Boolean, default: false },
  isUsingService: { type: Boolean, default: false }, // Whether they use our e-pharmacy service
  subscriptionType: { type: String, enum: ['monthly', 'yearly', 'premium'], default: null },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  services: [{ type: String }], // Additional services offered
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for geospatial queries
PharmacySchema.index({ coordinates: '2dsphere' });

// Export a function that returns the model after ensuring connection
const getPharmacyModel = async () => {
  const conn = await dbConnectMain();
  return conn.models.Pharmacy || conn.model('Pharmacy', PharmacySchema);
};

export default getPharmacyModel;