import { Request, Response } from 'express';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';

export const getHealth = (req: Request, res: Response) => {
  const isConnected = googleDriveRepository.checkConnection();
  return res.json({
    application: 'UP',
    storage: isConnected ? 'UP' : 'DOWN',
    googleDrive: isConnected ? 'CONNECTED' : 'UNAVAILABLE'
  });
};
