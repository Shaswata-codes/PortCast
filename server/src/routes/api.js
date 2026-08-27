import express from 'express';
import userRoutes from './userRoutes.js';
import {
  getPorts,
  getVessels,
  getRoutes,
  getDashboard,
  getForecast,
  getOptimization,
  getRiskAlerts,
  runSimulation,
  getPortDetails,
  getPortComparison,
  getExplanation,
} from '../controllers/portcastController.js';
import { fetchMLHealth } from '../services/mlBridgeService.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', app: 'PortCast', timestamp: new Date().toISOString() });
});

// ML Python service health check
router.get('/ml-status', async (req, res) => {
  const mlHealth = await fetchMLHealth();
  res.json({
    ml_service: mlHealth ? 'connected' : 'disconnected',
    ml_url: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
    details: mlHealth || { status: 'ML service unreachable — JS fallback active' },
    timestamp: new Date().toISOString()
  });
});

// PortCast API endpoints
router.get('/dashboard', getDashboard);
router.get('/ports', getPorts);
router.get('/ports/:id', getPortDetails);
router.get('/optimize/ports', getPortComparison);
router.get('/vessels', getVessels);
router.get('/routes', getRoutes);
router.post('/forecast', getForecast);
router.post('/optimize', getOptimization);
router.get('/risk', getRiskAlerts);
router.post('/simulate', runSimulation);
router.post('/explain', getExplanation);

// User routes (auth)
router.use('/users', userRoutes);

export default router;
