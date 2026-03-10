import mongoose from 'mongoose';

/**
 * Global is used here to maintain cached connections across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
type CachedMongooseConnections = {
  patientConn: mongoose.Connection | null;
  patientPromise: Promise<mongoose.Connection> | null;
  pharmacistConn: mongoose.Connection | null;
  pharmacistPromise: Promise<mongoose.Connection> | null;
  mainConn: mongoose.Connection | null;
  mainPromise: Promise<mongoose.Connection> | null;
};

declare global {
  var mongooseCache: CachedMongooseConnections | undefined;
}

let cached = globalThis.mongooseCache;

if (!cached) {
  cached = {
    patientConn: null,
    patientPromise: null,
    pharmacistConn: null,
    pharmacistPromise: null,
    mainConn: null,
    mainPromise: null
  };
  globalThis.mongooseCache = cached;
}

const connectionOptions: mongoose.ConnectOptions = {
  bufferCommands: true,
  serverSelectionTimeoutMS: 10000,
};

const getMongoUris = () => {
  const mainMongoUri = process.env.MONGODB_URI;
  const patientMongoUri = process.env.PATIENT_MONGODB_URI || mainMongoUri;
  const pharmacistMongoUri = process.env.PHARMACIST_MONGODB_URI || mainMongoUri;

  return {
    mainMongoUri,
    patientMongoUri,
    pharmacistMongoUri
  };
};

const getConnection = async (
  uri: string | undefined,
  connectionKey: 'patientConn' | 'pharmacistConn' | 'mainConn',
  promiseKey: 'patientPromise' | 'pharmacistPromise' | 'mainPromise',
  label: string
) => {
  if (!uri) {
    throw new Error(`${label} MongoDB URI is not configured.`);
  }

  if (cached[connectionKey]) {
    return cached[connectionKey];
  }

  if (!cached[promiseKey]) {
    const connection = mongoose.createConnection(uri, connectionOptions);
    cached[promiseKey] = connection.asPromise();
  }

  cached[connectionKey] = await cached[promiseKey];
  return cached[connectionKey];
};

async function dbConnectPatients() {
  const { patientMongoUri } = getMongoUris();
  return getConnection(patientMongoUri, 'patientConn', 'patientPromise', 'Patient');
}

async function dbConnectPharmacists() {
  const { pharmacistMongoUri } = getMongoUris();
  return getConnection(
    pharmacistMongoUri,
    'pharmacistConn',
    'pharmacistPromise',
    'Pharmacist'
  );
}

async function dbConnectMain() {
  const { mainMongoUri } = getMongoUris();
  return getConnection(mainMongoUri, 'mainConn', 'mainPromise', 'Main');
}

// Legacy function for backward compatibility (use specific functions instead)
async function dbConnect() {
  console.warn('Warning: Using legacy dbConnect. Please use dbConnectPatients(), dbConnectPharmacists(), or dbConnectMain() instead.');
  return dbConnectMain();
}

export { dbConnectPatients, dbConnectPharmacists, dbConnectMain };
export default dbConnect;
