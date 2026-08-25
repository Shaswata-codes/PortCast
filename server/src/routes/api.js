import express from 'express';
import userRoutes from './userRoutes.js';
import {
  getPorts,
  getVessels,
  getRoutes,
  getDashboard,
  getForcast,
  getOptimization,
  getRiskAlerts,
  runSimulation,
  getPortDetails,
} from '../controllers/portcastController.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', app: 'PortCast', timestamp: new Date().toISOString() });
});

// PortCast API endpoints
router.get('/dashboard', getDashboard);
router.get('/ports', getPorts);
router.get('/ports/:id', getPortDetails);
router.get('/vessels', getVessels);
router.get('/routes', getRoutes);
router.post('/forecast', getForcast);
router.post('/optimize', getOptimization);
router.get('/risk', getRiskAlerts);
router.post('/simulate', runSimulation);

// User routes (auth)
router.use('/users', userRoutes);

export default router;
