import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { getFinanceDbName, ensureMongoConnected } from '../config/database.js';

export const getHealth = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    await ensureMongoConnected();
  }

  const readyState = mongoose.connection.readyState;
  const isMongoConnected = readyState === 1;
  const isCloudinaryOk = isCloudinaryConfigured();
  const databaseName = getFinanceDbName();

  if (!isMongoConnected) {
    return res.status(503).json({
      success: false,
      server: 'ok',
      mongodb: 'disconnected',
      readyState,
      database: databaseName,
      cloudinary: isCloudinaryOk ? 'configured' : 'unconfigured',
      message: 'MongoDB is disconnected. Please check connection string, network access, and database credentials.'
    });
  }

  return res.json({
    success: true,
    server: 'ok',
    mongodb: 'connected',
    readyState: 1,
    database: databaseName,
    cloudinary: isCloudinaryOk ? 'configured' : 'unconfigured',
    googleDrive: 'optional'
  });
};

export default getHealth;

