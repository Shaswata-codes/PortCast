// =====================================================
// PortCast — Risk Engine
// Early warning alerts, What-If scenario simulator
// =====================================================

/**
 * Generate current risk alerts based on date, routes, and conditions
 */
export function generateRiskAlerts() {
  const now = new Date();
  const month = now.getMonth();
  const alerts = [];

  // Monsoon alerts (June-Sept)
  if (month >= 5 && month <= 8) {
    alerts.push({
      id: 'MONSOON_SW',
      severity: 'HIGH',
      type: 'WEATHER',
      title: 'Southwest Monsoon Active — Bay of Bengal',
      description: 'Heavy sea states expected. Vessel speed reduction of 1-2 knots. Port closures possible at Paradip, Haldia, and Gopalpur. Discharge rate may drop 15-25%.',
      impact: 'Freight rates +20-35% premium. Transit time +1.5 to 3 days.',
      affectedPorts: ['paradip', 'haldia', 'dhamra', 'gopalpur'],
      affectedRoutes: ['R01', 'R05', 'R06', 'R08', 'R19'],
      recommendation: 'Build buffer of 3-5 days into laycan. Consider routing via Lombok instead of Malacca for Indonesian origins.',
      timestamp: now.toISOString(),
    });
  }

  // Cyclone alerts (May-June, Oct-Nov)
  if ((month >= 4 && month <= 5) || (month >= 9 && month <= 10)) {
    alerts.push({
      id: 'CYCLONE_BOB',
      severity: 'CRITICAL',
      type: 'WEATHER',
      title: 'Cyclone Season — Bay of Bengal',
      description: 'Peak cyclone formation period. IMD tracking potential low-pressure systems. Historical average: 2-3 cyclones per season crossing East Coast.',
      impact: 'Full port shutdown 3-7 days per event. Freight rate spike +15-40%. Vessel rerouting required.',
      affectedPorts: ['paradip', 'vizag', 'gopalpur', 'chennai', 'ennore'],
      affectedRoutes: ['R01', 'R02', 'R05', 'R08', 'R10'],
      recommendation: 'Monitor IMD bulletins. Pre-position vessels in safe anchorages. Consider delaying fixtures by 7-10 days if cyclone imminent.',
      timestamp: now.toISOString(),
    });
  }

  // Malacca Strait congestion (year-round)
  alerts.push({
    id: 'MALACCA_CONGESTION',
    severity: 'MEDIUM',
    type: 'GEOPOLITICAL',
    title: 'Malacca Strait — Moderate Congestion',
    description: 'Increased traffic density in Malacca Strait. Average transit delay 0.5-1.5 days for dry bulk vessels.',
    impact: 'Additional $0.50-$1.50/MT fuel cost. Indonesian route freight slightly elevated.',
    affectedPorts: [],
    affectedRoutes: ['R05', 'R06', 'R07', 'R19'],
    recommendation: 'Factor in 1 day buffer for Malacca transit. Consider Lombok Strait alternative for larger vessels.',
    timestamp: now.toISOString(),
  });

  // Bunker fuel volatility
  alerts.push({
    id: 'BUNKER_WATCH',
    severity: 'LOW',
    type: 'MARKET',
    title: 'Bunker Fuel Price Watch — VLSFO',
    description: 'VLSFO prices at Singapore hub showing 5% week-on-week increase. Current: ~$640/MT. OPEC+ production decisions pending.',
    impact: 'Each $50/MT bunker increase adds approximately $0.80-$1.20/MT to freight cost on Australia-India routes.',
    affectedPorts: [],
    affectedRoutes: ['R01', 'R02', 'R03', 'R04', 'R10', 'R12', 'R13'],
    recommendation: 'Consider fuel hedging for time-charter contracts. Evaluate slow-steaming economics.',
    timestamp: now.toISOString(),
  });

  // Suez Canal disruption risk
  alerts.push({
    id: 'SUEZ_RISK',
    severity: 'MEDIUM',
    type: 'GEOPOLITICAL',
    title: 'Suez Canal — Security Advisory',
    description: 'Houthi-related security concerns persist in Red Sea / Bab el-Mandeb. Some operators diverting via Cape of Good Hope.',
    impact: 'US Gulf & Murmansk routes: +$3-$8/MT if Cape rerouting. Transit time +7-15 additional days.',
    affectedPorts: [],
    affectedRoutes: ['R12', 'R13', 'R16'],
    recommendation: 'For US/European origins, obtain war risk insurance quotes. Evaluate Cape routing economics vs Suez transit risk.',
    timestamp: now.toISOString(),
  });

  // Pre-monsoon stock build
  if (month >= 3 && month <= 4) {
    alerts.push({
      id: 'PREMONSOON_RUSH',
      severity: 'MEDIUM',
      type: 'MARKET',
      title: 'Pre-Monsoon Coal Stock Building',
      description: 'Indian thermal power plants accelerating coal imports ahead of monsoon season. Port congestion rising at Paradip and Dhamra.',
      impact: 'Freight rates +10-15%. Waiting times at Paradip may reach 4-5 days.',
      affectedPorts: ['paradip', 'dhamra', 'haldia'],
      affectedRoutes: ['R01', 'R05', 'R08', 'R19'],
      recommendation: 'Book vessels early. Consider Gangavaram or Krishnapatnam as alternative discharge ports with lower congestion.',
      timestamp: now.toISOString(),
    });
  }

  return alerts;
}

/**
 * What-If Scenario Simulator
 * Takes current route economics and applies user-defined shocks
 */
export function simulateScenario(baseResult, scenario) {
  const {
    bunkerShockPct = 0,
    congestionExtraDays = 0,
    demandShockPct = 0,
    routeClosureChokePoint = null,
    cycloneDays = 0,
  } = scenario;

  // Clone base forecast
  const simulated = JSON.parse(JSON.stringify(baseResult));

  // 1. Bunker price shock
  if (bunkerShockPct !== 0) {
    const fuelImpact = simulated.currentRate * 0.35 * (bunkerShockPct / 100); // Fuel is ~35% of freight
    simulated.currentRate += fuelImpact;
    simulated.adjustments = simulated.adjustments || [];
    simulated.adjustments.push({
      factor: 'Bunker Price',
      shock: `${bunkerShockPct > 0 ? '+' : ''}${bunkerShockPct}%`,
      impact: `${fuelImpact > 0 ? '+' : ''}$${fuelImpact.toFixed(2)}/MT`,
    });
  }

  // 2. Port congestion
  if (congestionExtraDays > 0) {
    const demurragePerDay = 18000;
    const parcelSize = 70000;
    const congestionCostPerMT = (demurragePerDay * congestionExtraDays) / parcelSize;
    simulated.currentRate += congestionCostPerMT;
    simulated.adjustments = simulated.adjustments || [];
    simulated.adjustments.push({
      factor: 'Port Congestion',
      shock: `+${congestionExtraDays} days`,
      impact: `+$${congestionCostPerMT.toFixed(2)}/MT (demurrage)`,
    });
  }

  // 3. Demand shock (market supply-demand imbalance)
  if (demandShockPct !== 0) {
    const demandImpact = simulated.currentRate * (demandShockPct / 100) * 0.6;
    simulated.currentRate += demandImpact;
    simulated.adjustments = simulated.adjustments || [];
    simulated.adjustments.push({
      factor: 'Demand Shock',
      shock: `${demandShockPct > 0 ? '+' : ''}${demandShockPct}%`,
      impact: `${demandImpact > 0 ? '+' : ''}$${demandImpact.toFixed(2)}/MT`,
    });
  }

  // 4. Choke point closure (Suez, Malacca)
  if (routeClosureChokePoint) {
    const rerouteCost = routeClosureChokePoint === 'suez' ? 5.50 : 1.80;
    simulated.currentRate += rerouteCost;
    simulated.adjustments = simulated.adjustments || [];
    simulated.adjustments.push({
      factor: `${routeClosureChokePoint === 'suez' ? 'Suez Canal' : 'Malacca Strait'} Closure`,
      shock: 'Route rerouted',
      impact: `+$${rerouteCost.toFixed(2)}/MT (longer voyage)`,
    });
  }

  // 5. Cyclone disruption
  if (cycloneDays > 0) {
    const cycloneCost = simulated.currentRate * 0.08 * cycloneDays;
    simulated.currentRate += cycloneCost / 10;
    simulated.adjustments = simulated.adjustments || [];
    simulated.adjustments.push({
      factor: 'Cyclone Disruption',
      shock: `${cycloneDays} day port shutdown`,
      impact: `+$${(cycloneCost / 10).toFixed(2)}/MT (market spike + delays)`,
    });
  }

  simulated.currentRate = Math.round(simulated.currentRate * 100) / 100;
  simulated.isSimulated = true;
  simulated.scenario = scenario;

  return simulated;
}
