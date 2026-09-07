import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import { env } from './env.js';

export function getMongoUri(): string {
  return env.MONGODB_URI;
}

export function getFinanceDbName(): string {
  return env.MONGODB_DB_NAME || 'kkv_gold_finance';
}

export function getRentalDbName(): string {
  return env.RENTAL_MONGODB_DB_NAME || 'kkv_rental';
}

/**
 * Returns true strictly if Mongoose connection readyState is 1 (connected).
 * Always reads the live connection state.
 */
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Diagnostics helper for categorized MongoDB error messages
function logMongoDetailedError(error: any): void {
  const msg = (error?.message || String(error)).toLowerCase();
  console.error('[MongoDB Error Diagnosis]');

  if (msg.includes('auth') || msg.includes('authentication failed') || msg.includes('bad auth')) {
    console.error('  ❌ AUTHENTICATION FAILED: Check your database username and password in MONGODB_URI.');
    console.error('     Verify user exists in MongoDB Atlas -> Security -> Database Access with Read/Write privileges.');
  } else if (msg.includes('enotfound') || msg.includes('querysrv') || msg.includes('econnrefused')) {
    console.error('  ❌ DNS / SRV RESOLUTION FAILURE: Unable to resolve MongoDB cluster hostname.');
    console.error('     Verify your internet connection and MongoDB Atlas cluster domain.');
  } else if (msg.includes('timed out') || msg.includes('server selection') || msg.includes('etimedout') || msg.includes('could not connect to any servers')) {
    console.error('  ❌ NETWORK / IP NOT WHITELISTED: Connection timed out attempting to reach Atlas cluster.');
    console.error('     Verify in MongoDB Atlas -> Security -> Network Access that 0.0.0.0/0 (or current IP) is Active.');
  } else if (msg.includes('invalid connection string') || msg.includes('invalid scheme') || msg.includes('uri')) {
    console.error('  ❌ INVALID CONNECTION STRING: The format of MONGODB_URI is invalid.');
    console.error('     Expected format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority&appName=Cluster0');
  } else {
    console.error(`  ❌ CONNECTION ERROR: ${error?.message || error}`);
  }
}

let isConnecting = false;
let autoReconnectTimer: NodeJS.Timeout | null = null;

// Connection event lifecycle listeners
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Mongoose] Connected successfully');
  console.log(`[Database] MongoDB Status: connected (Host: ${mongoose.connection.host || 'Atlas'}, Database: ${mongoose.connection.name || getFinanceDbName()})`);
  if (autoReconnectTimer) {
    clearInterval(autoReconnectTimer);
    autoReconnectTimer = null;
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Mongoose] Reconnected to MongoDB successfully');
  console.log('[Database] MongoDB Status: connected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Mongoose] Disconnected from MongoDB.');
  console.warn('[Database] MongoDB Status: disconnected');
  scheduleAutoReconnect();
});

mongoose.connection.on('error', (err: any) => {
  console.error('[MongoDB Mongoose] Connection error event:', err?.message || 'Database error');
  logMongoDetailedError(err);
});

function scheduleAutoReconnect(): void {
  if (autoReconnectTimer || mongoose.connection.readyState === 1 || isConnecting) {
    return;
  }
  console.log('[MongoDB Mongoose] Scheduling automatic reconnection in 5 seconds...');
  autoReconnectTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      if (autoReconnectTimer) {
        clearInterval(autoReconnectTimer);
        autoReconnectTimer = null;
      }
      return;
    }
    try {
      console.log('[MongoDB Mongoose] Attempting automatic reconnection...');
      await connectDB();
      if (autoReconnectTimer) {
        clearInterval(autoReconnectTimer);
        autoReconnectTimer = null;
      }
    } catch (err: any) {
      console.warn('[MongoDB Mongoose] Auto-reconnect retry failed, will retry in 5s...');
    }
  }, 5000);
}

/**
 * Connects to MongoDB using Mongoose.
 * Enforces permanent database connectivity - no fallback/mock mode permitted.
 */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = env.MONGODB_URI;
  if (!uri) {
    const errorMsg = '[Database] ❌ MONGODB_URI (or MONGO_URI / DATABASE_URL) is missing from backend environment variables! Permanent database connection is required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    // Wait for in-flight connection attempt
    let waitCount = 0;
    while (isConnecting && waitCount < 30) {
      await new Promise(r => setTimeout(r, 200));
      waitCount++;
      if ((mongoose.connection.readyState as number) === 1) return mongoose;
    }
  }

  isConnecting = true;
  const dbName = getFinanceDbName();
  console.log('[MongoDB Mongoose] Connecting to MongoDB...');

  try {
    await mongoose.connect(uri, {
      dbName,
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    console.log('[MongoDB Mongoose] Connected successfully');
    console.log(`[Database] MongoDB Status: connected`);
    isConnecting = false;
    return mongoose;
  } catch (error: any) {
    isConnecting = false;
    console.error('[MongoDB Mongoose] Connection failed');
    console.error(`[MongoDB Mongoose] Error: ${error.message || error}`);
    logMongoDetailedError(error);
    scheduleAutoReconnect();
    throw error;
  }
}

/**
 * Ensures MongoDB is connected before handling an API operation.
 * If disconnected, attempts an immediate connection.
 */
export async function ensureMongoConnected(): Promise<boolean> {
  if ((mongoose.connection.readyState as number) === 1) {
    return true;
  }
  try {
    await connectDB();
    return (mongoose.connection.readyState as number) === 1;
  } catch (err) {
    return false;
  }
}

export async function getMongoClient(): Promise<any> {
  await ensureMongoConnected();
  return mongoose.connection.getClient ? mongoose.connection.getClient() : null;
}

export async function getFinanceDb(): Promise<mongoose.mongo.Db | null> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }
  await ensureMongoConnected();
  return mongoose.connection.db || null;
}

export async function getRentalDb(): Promise<mongoose.mongo.Db | null> {
  await ensureMongoConnected();
  if (mongoose.connection.readyState === 1 && mongoose.connection.getClient) {
    const client = mongoose.connection.getClient();
    return client.db(getRentalDbName());
  }
  return null;
}

/**
 * Live Health check for MongoDB connection
 */
export async function checkMongoHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  database: string;
  readyState: number;
  status: 'CONNECTED' | 'DISCONNECTED';
  error?: string;
}> {
  const configured = Boolean(env.MONGODB_URI);
  if (!configured) {
    return {
      configured: false,
      connected: false,
      database: getFinanceDbName(),
      readyState: 0,
      status: 'DISCONNECTED',
      error: 'MONGODB_URI not configured'
    };
  }

  // Attempt connection if disconnected
  if (mongoose.connection.readyState !== 1) {
    await ensureMongoConnected();
  }

  const readyState = mongoose.connection.readyState;
  const connected = readyState === 1;

  if (!connected) {
    return {
      configured: true,
      connected: false,
      database: getFinanceDbName(),
      readyState,
      status: 'DISCONNECTED',
      error: 'MongoDB is disconnected'
    };
  }

  try {
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    return {
      configured: true,
      connected: true,
      database: getFinanceDbName(),
      readyState: 1,
      status: 'CONNECTED'
    };
  } catch (pingErr: any) {
    return {
      configured: true,
      connected: false,
      database: getFinanceDbName(),
      readyState: mongoose.connection.readyState,
      status: 'DISCONNECTED',
      error: pingErr?.message || 'Ping failed'
    };
  }
}

export default connectDB;

