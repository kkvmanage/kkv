import { Request, Response } from 'express';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { checkMongoHealth } from '../config/database.js';

export const getHealth = async (req: Request, res: Response) => {
  const isDriveConnected = googleDriveRepository.checkConnection();
  const mongoHealth = await checkMongoHealth();

  return res.json({
    status: 'UP',
    application: 'UP',
    database: mongoHealth.connected ? 'MONGODB_ATLAS' : 'LOCAL_STORAGE_STANDBY',
    mongoDb: mongoHealth.status,
    mongoDbConfigured: mongoHealth.configured,
    googleDrive: isDriveConnected ? 'CONNECTED' : 'UNAVAILABLE',
    storage: isDriveConnected ? 'UP' : 'STANDBY',
    serverless: true,
    timestamp: new Date().toISOString()
  });
};
