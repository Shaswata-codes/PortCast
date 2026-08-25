// =====================================================
// PortCast — API Controllers
// All REST endpoints for forecast, optimize, risk
// =====================================================

import { destinationPorts, originPorts } from '../data/portsData.js';
import { vesselClasses } from '../data/vesselsData.js';
import { shippingRoutes } from '../data/routesData.js';
import { forecastRates, detectOptimalEntry, generateHistoricalRates, generateBalticIndices } from '../services/forecastingEngine.js';
import { optimizeVessel, assessIdleRisk } from '../services/optimizerEngine.js';
import { generateRiskAlerts, simulateScenario } from '../services/riskEngine.js';
import { fetchMLRadar, fetchMLForecast, fetchMLOptimize } from '../services/mlBridgeService.js';

// GET /api/ports
export function getPorts(req, res) {
  res.json({
    destinations: destinationPorts,
    origins: originPorts,
  });
}

// GET /api/vessels
export function getVessels(req, res) {
  res.json({ vessels: vesselClasses });
}

// GET /api/routes
export function getRoutes(req, res) {
  res.json({ routes: shippingRoutes });
}

// GET /api/dashboard
export async function getDashboard(req, res) {
  const balticData = generateBalticIndices();
  const latest = balticData[balticData.length - 1];
  const prev = balticData[balticData.length - 2];
  let alerts = generateRiskAlerts();

  // Check live ML Geopolitical radar
  const mlRadar = await fetchMLRadar();
  if (mlRadar && mlRadar.alerts && mlRadar.alerts.length > 0) {
    const liveAlerts = mlRadar.alerts.map(a => ({
      id: `GEO_${a.chokepoint_key || 'RADAR'}`,
      severity: a.severity,
      type: 'GEOPOLITICAL',
      title: `${a.chokepoint}: ${a.title}`,
      description: a.summary,
      impact: `Risk Index: ${mlRadar.risk_index}/100 — Multiplier: x${mlRadar.rate_multiplier}`,
      affectedPorts: ['paradip', 'vizag', 'haldia'],
      affectedRoutes: a.routes_affected,
      recommendation: 'Monitor active chokepoints and evaluate earlier charter fixtures.',
      timestamp: a.published || new Date().toISOString()
    }));
    alerts = [...liveAlerts, ...alerts];
  }

  // Quick forecast snapshot for top 5 routes
  const topRoutes = shippingRoutes.slice(0, 5);
  const snapshots = topRoutes.map(route => {
    const forecast = forecastRates(route);
    const entry = detectOptimalEntry(forecast);
    return {
      routeId: route.id,
      routeName: `${route.originName} → ${route.destinationName}`,
      commodity: route.commodity,
      currentRate: forecast.currentRate,
      forecast7d: forecast.forecasts[7].pointForecast,
      forecast30d: forecast.forecasts[30].pointForecast,
      direction: forecast.forecasts[7].direction,
      signal: entry.signal,
      urgency: entry.urgency,
    };
  });

  res.json({
    marketIndicators: {
      bdi: { value: latest.bdi, change: latest.bdi - prev.bdi, changePct: ((latest.bdi - prev.bdi) / prev.bdi * 100).toFixed(2) },
      bci: { value: latest.bci, change: latest.bci - prev.bci, changePct: ((latest.bci - prev.bci) / prev.bci * 100).toFixed(2) },
      bpi: { value: latest.bpi, change: latest.bpi - prev.bpi, changePct: ((latest.bpi - prev.bpi) / prev.bpi * 100).toFixed(2) },
      bsi: { value: latest.bsi, change: latest.bsi - prev.bsi, changePct: ((latest.bsi - prev.bsi) / prev.bsi * 100).toFixed(2) },
      vlsfo: { value: latest.vlsfo, unit: '$/MT' },
      mgo: { value: latest.mgo, unit: '$/MT' },
    },
    mlRadar: mlRadar || null,
    balticHistory: balticData.slice(-90),
    routeSnapshots: snapshots,
    alerts: alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL' || a.severity === 'LOW'),
    portsCount: destinationPorts.length,
    routesCount: shippingRoutes.length,
    timestamp: new Date().toISOString(),
  });
}

// POST /api/forecast
export async function getForcast(req, res) {
  const { routeId } = req.body;
  const route = shippingRoutes.find(r => r.id === routeId);
  if (!route) {
    return res.status(400).json({ error: `Route ${routeId} not found` });
  }

  // Try live ML microservice forecast
  const mlForecast = await fetchMLForecast(route.id, route.baseFreightRate, route.distanceNM, route.commodity);

  const forecast = forecastRates(route);
  const entry = detectOptimalEntry(forecast);

  res.json({
    forecast,
    optimalEntry: entry,
    mlEngine: mlForecast || { status: 'fallback_active' }
  });
}

// POST /api/optimize
export async function getOptimization(req, res) {
  const { routeId, parcelSizeMT = 70000, bunkerPrice = 620 } = req.body;
  const route = shippingRoutes.find(r => r.id === routeId);
  if (!route) {
    return res.status(400).json({ error: `Route ${routeId} not found` });
  }

  const destPort = destinationPorts.find(p => p.id === route.destination);
  if (!destPort) {
    return res.status(400).json({ error: `Destination port not found` });
  }

  // Live ML optimizer
  const mlOptimization = await fetchMLOptimize(destPort.id, route.distanceNM, parcelSizeMT, route.baseFreightRate, bunkerPrice);

  const optimization = optimizeVessel(route, destPort, parcelSizeMT, bunkerPrice);
  const idleRisk = assessIdleRisk(destPort, route, parcelSizeMT);

  // Also run forecast for timing recommendation
  const forecast = forecastRates(route);
  const entry = detectOptimalEntry(forecast);

  res.json({
    optimization,
    idleRisk,
    optimalEntry: entry,
    mlEngine: mlOptimization || { status: 'fallback_active' }
  });
}

// GET /api/risk
export async function getRiskAlerts(req, res) {
  let alerts = generateRiskAlerts();
  const mlRadar = await fetchMLRadar();
  
  if (mlRadar && mlRadar.alerts && mlRadar.alerts.length > 0) {
    const liveAlerts = mlRadar.alerts.map(a => ({
      id: `GEO_${a.chokepoint_key || 'RADAR'}`,
      severity: a.severity,
      type: 'GEOPOLITICAL',
      title: `${a.chokepoint}: ${a.title}`,
      description: a.summary,
      impact: `Risk Index: ${mlRadar.risk_index}/100 — Rate Multiplier: x${mlRadar.rate_multiplier}`,
      affectedPorts: ['paradip', 'vizag', 'haldia'],
      affectedRoutes: a.routes_affected,
      recommendation: 'Monitor active chokepoints and evaluate earlier charter fixtures.',
      timestamp: a.published || new Date().toISOString()
    }));
    alerts = [...liveAlerts, ...alerts];
  }

  res.json({ alerts, mlRadar: mlRadar || null, timestamp: new Date().toISOString() });
}

// POST /api/simulate
export function runSimulation(req, res) {
  const { routeId, scenario } = req.body;
  const route = shippingRoutes.find(r => r.id === routeId);
  if (!route) {
    return res.status(400).json({ error: `Route ${routeId} not found` });
  }

  const baseForecast = forecastRates(route);
  const simulated = simulateScenario(baseForecast, scenario || {});

  res.json({ base: baseForecast, simulated });
}

// GET /api/ports/:id
export function getPortDetails(req, res) {
  const port = destinationPorts.find(p => p.id === req.params.id);
  if (!port) {
    return res.status(404).json({ error: 'Port not found' });
  }

  // Get all routes to this port
  const routesToPort = shippingRoutes.filter(r => r.destination === port.id);
  const idleRisk = assessIdleRisk(port, routesToPort[0] || shippingRoutes[0], 70000);

  res.json({ port, routes: routesToPort, idleRisk });
}
