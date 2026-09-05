import { Router } from 'express';
import authRoutes from './auth.routes.js';
import rentalRoutes from './rental.routes.js';
import syncRoutes from './sync.routes.js';
import { rentalService } from '../services/rental.service.js';

const router = Router();

// Public healthcheck
router.get('/health', (_req, res) => {
  try {
    const complexes = rentalService.getComplexes();
    const shops = rentalService.getShops();
    res.status(200).json({
      status: 'healthy',
      app: 'Complex Rental Management Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      stats: {
        complexesCount: complexes.length,
        shopsCount: shops.length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Admin-facing public/shared summary endpoint for existing Finance App integration
router.get('/finance-summary', (_req, res) => {
  try {
    const summary = rentalService.getAdminSummary();
    res.status(200).json({
      success: true,
      data: {
        ...summary,
        lastUpdated: new Date().toISOString(),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use('/auth', authRoutes);
router.use('/rental', rentalRoutes);
router.use('/sync', syncRoutes);

export default router;
