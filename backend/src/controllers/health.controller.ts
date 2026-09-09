import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getFinanceDbName, ensureMongoConnected } from '../config/database.js';

export const getHealth = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    await ensureMongoConnected();
  }

  const readyState = mongoose.connection.readyState;
  const isMongoConnected = readyState === 1;
  const databaseName = getFinanceDbName();

  if (!isMongoConnected) {
    return res.status(503).json({
      status: 'error',
      success: false,
      database: 'disconnected',
      mongodb: 'disconnected',
      readyState,
      dbName: databaseName,
      message: 'MongoDB is disconnected.'
    });
  }

  return res.json({
    status: 'ok',
    success: true,
    database: 'connected',
    mongodb: 'connected',
    readyState: 1,
    dbName: databaseName
  });
};

export default getHealth;
