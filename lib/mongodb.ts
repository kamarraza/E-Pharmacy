import mongoose from 'mongoose';

const PATIENT_MONGODB_URI = process.env.PATIENT_MONGODB_URI!;
const PHARMACIST_MONGODB_URI = process.env.PHARMACIST_MONGODB_URI!;
const MAIN_MONGODB_URI = process.env.MONGODB_URI!; // For prescriptions and shared data

if (!PATIENT_MONGODB_URI) {
  throw new Error('Please define the PATIENT_MONGODB_URI environment variable inside .env.local');
}

if (!PHARMACIST_MONGODB_URI) {
  throw new Error('Please define the PHARMACIST_MONGODB_URI environment variable inside .env.local');
}

if (!MAIN_MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain cached connections across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    patientConn: null,
    patientPromise: null,
    pharmacistConn: null,
    pharmacistPromise: null,
    mainConn: null,
    mainPromise: null
  };
}

async function dbConnectPatients() {
  if (cached.patientConn) {
    return cached.patientConn;
  }

  if (!cached.patientPromise) {
    const opts = {
      bufferCommands: true, // Allow buffering to prevent connection issues
    };

    cached.patientPromise = mongoose.createConnection(PATIENT_MONGODB_URI, opts);
    console.log('Connected to Patient Database');
  }

  cached.patientConn = cached.patientPromise;
  return cached.patientConn;
}

async function dbConnectPharmacists() {
  if (cached.pharmacistConn) {
    return cached.pharmacistConn;
  }

  if (!cached.pharmacistPromise) {
    const opts = {
      bufferCommands: true, // Allow buffering to prevent connection issues
    };

    cached.pharmacistPromise = mongoose.createConnection(PHARMACIST_MONGODB_URI, opts);
    console.log('Connected to Pharmacist Database');
  }

  cached.pharmacistConn = cached.pharmacistPromise;
  return cached.pharmacistConn;
}

async function dbConnectMain() {
  if (cached.mainConn) {
    return cached.mainConn;
  }

  if (!cached.mainPromise) {
    const opts = {
      bufferCommands: true, // Allow buffering to prevent connection issues
    };

    cached.mainPromise = mongoose.createConnection(MAIN_MONGODB_URI, opts);
    console.log('Connected to Main Database');
  }

  cached.mainConn = cached.mainPromise;
  return cached.mainConn;
}

// Legacy function for backward compatibility (use specific functions instead)
async function dbConnect() {
  console.warn('Warning: Using legacy dbConnect. Please use dbConnectPatients(), dbConnectPharmacists(), or dbConnectMain() instead.');
  return dbConnectMain();
}

export { dbConnectPatients, dbConnectPharmacists, dbConnectMain };
export default dbConnect;