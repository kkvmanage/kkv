import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { getHealth } from './controllers/health.controller.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));

// Root Information Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'KKV Gold Finance API is running'
  });
});

// Direct Health Endpoint
app.get('/health', getHealth);

// Mount API routes
app.use('/api', apiRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`,
    error: { code: 'NOT_FOUND' }
  });
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: { code: err.code || 'INTERNAL_SERVER_ERROR' }
  });
});

export default app;
