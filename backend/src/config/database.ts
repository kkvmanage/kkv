import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { env } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientInstance: MongoClient | undefined;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let isConnected = false;

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

export function getMongoUri(): string {
  return (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
}

export function getFinanceDbName(): string {
  return (process.env.MONGODB_DB_NAME || 'kkv_gold_finance').trim();
}

export function getRentalDbName(): string {
  return (process.env.RENTAL_MONGODB_DB_NAME || 'kkv_rental').trim();
}

/**
 * Serverless cached MongoDB Client connection
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = getMongoUri();
  if (!uri) {
    return null;
  }

  if (env.NODE_ENV === 'development') {
    // In development, use a global variable so the MongoClient is not recreated on HMR
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientInstance = client;
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
    client = global._mongoClientInstance || client;
  } else {
    // In production / serverless environment, cache client across function invocations
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }

  try {
    const connectedClient = await clientPromise;
    isConnected = true;
    return connectedClient;
  } catch (err) {
    console.warn('[MongoDB Atlas] Connection failed, operating in fallback storage mode:', err);
    isConnected = false;
    return null;
  }
}

/**
 * Get MongoDB Database instance for Finance
 */
export async function getFinanceDb(): Promise<Db | null> {
  const clientInstance = await getMongoClient();
  if (!clientInstance) return null;
  return clientInstance.db(getFinanceDbName());
}

/**
 * Get MongoDB Database instance for Rental
 */
export async function getRentalDb(): Promise<Db | null> {
  const clientInstance = await getMongoClient();
  if (!clientInstance) return null;
  return clientInstance.db(getRentalDbName());
}

/**
 * Initialize collection indexes for MongoDB Atlas
 */
export async function initializeMongoIndexes(): Promise<void> {
  try {
    const db = await getFinanceDb();
    if (!db) return;

    // Finance Collections & Unique Indexes
    await db.collection('customers').createIndex({ id: 1 }, { unique: true, sparse: true });
    await db.collection('customers').createIndex({ phone: 1 });
    await db.collection('customers').createIndex({ version: 1 });

    await db.collection('loans').createIndex({ loanNo: 1 }, { unique: true, sparse: true });
    await db.collection('loans').createIndex({ id: 1 });
    await db.collection('loans').createIndex({ customerId: 1 });

    await db.collection('receipts').createIndex({ receiptNo: 1 }, { unique: true, sparse: true });
    await db.collection('receipts').createIndex({ loanNo: 1 });
    await db.collection('receipts').createIndex({ idempotencyKey: 1 }, { sparse: true });

    await db.collection('fixed_deposits').createIndex({ fdNo: 1 }, { unique: true, sparse: true });
    await db.collection('fixed_deposits').createIndex({ customerId: 1 });

    await db.collection('admin_users').createIndex({ uid: 1 }, { unique: true, sparse: true });
    await db.collection('admin_users').createIndex({ email: 1 }, { unique: true, sparse: true });

    await db.collection('sync_outbox').createIndex({ eventId: 1 }, { unique: true, sparse: true });
    await db.collection('sync_outbox').createIndex({ status: 1, createdAt: 1 });

    // Idempotency keys TTL index (expire after 24 hours)
    await db.collection('idempotency_keys').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400 }
    );
    await db.collection('idempotency_keys').createIndex({ key: 1 }, { unique: true });

    // Rental Collections & Unique Indexes
    const rentalDb = await getRentalDb();
    if (rentalDb) {
      await rentalDb.collection('complexes').createIndex({ id: 1 }, { unique: true, sparse: true });
      await rentalDb.collection('shops').createIndex({ id: 1 }, { unique: true, sparse: true });
      await rentalDb.collection('rental_payments').createIndex({ id: 1 }, { unique: true, sparse: true });
    }

    console.log('[MongoDB Atlas] Production indexes initialized successfully.');
  } catch (err) {
    console.warn('[MongoDB Atlas] Index initialization warning:', err);
  }
}

/**
 * Check MongoDB Atlas Connection Health
 */
export async function checkMongoHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  database: string;
  status: 'CONNECTED' | 'STANDBY' | 'FAILED';
  error?: string;
}> {
  const uri = getMongoUri();
  if (!uri) {
    return {
      configured: false,
      connected: false,
      database: getFinanceDbName(),
      status: 'STANDBY'
    };
  }

  try {
    const db = await getFinanceDb();
    if (!db) {
      return {
        configured: true,
        connected: false,
        database: getFinanceDbName(),
        status: 'FAILED',
        error: 'Client could not establish connection'
      };
    }

    await db.command({ ping: 1 });
    return {
      configured: true,
      connected: true,
      database: getFinanceDbName(),
      status: 'CONNECTED'
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      database: getFinanceDbName(),
      status: 'FAILED',
      error: err?.message || 'Ping failed'
    };
  }
}
