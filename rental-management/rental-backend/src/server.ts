import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/app.config.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (
        config.corsAllowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Dev flexible
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[Rental API] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Complex Rental Management Backend running on http://localhost:${config.port}`);
  console.log(`📡 Healthcheck: http://localhost:${config.port}/api/health`);
  console.log(`📊 Finance Integration: http://localhost:${config.port}/api/finance-summary`);
  console.log(`🔐 Google Auth URL: http://localhost:${config.port}/api/auth/google`);
});
