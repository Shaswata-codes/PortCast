// Baltic Dry Index & Market Data
export const marketTickerData = [
  { label: 'BDI', value: '1,847', change: '+3.2%', trend: 'up' },
  { label: 'BCI', value: '2,934', change: '+5.1%', trend: 'up' },
  { label: 'BPI', value: '1,623', change: '-0.8%', trend: 'down' },
  { label: 'BSI', value: '1,245', change: '+1.4%', trend: 'up' },
  { label: 'VLSFO', value: '$612.50', change: '+2.1%', trend: 'up' },
  { label: 'MGO', value: '$784.20', change: '-0.5%', trend: 'down' },
  { label: 'Risk Index', value: '51.1/100', change: 'x1.102', trend: 'neutral' },
  { label: 'System', value: 'LIVE', change: '99.98%', trend: 'up' },
]

// KPI Metrics
export const kpiMetrics = [
  { label: 'Active Monitored Routes', value: '20', change: '+3', trend: 'up', icon: 'Route' },
  { label: 'Avg Spot Freight Rate', value: '$14.82', change: '+4.2%', trend: 'up', unit: '/MT', icon: 'DollarSign' },
  { label: '30-Day Rate Momentum', value: 'Bullish', change: '+8.7%', trend: 'up', icon: 'TrendingUp' },
  { label: 'Active Risk Alerts', value: '10', change: '+2', trend: 'up', icon: 'AlertTriangle' },
]

// Route Projections
export const routeProjections = [
  { origin: 'Newcastle, AU', destination: 'Paradip, IN', commodity: 'Thermal Coal', spotRate: 12.40, forecast7d: 13.10, forecast30d: 14.85, direction: 'rising', signal: 'LOCK NOW', urgency: 'HIGH' },
  { origin: 'Tubarao, BR', destination: 'Visakhapatnam, IN', commodity: 'Iron Ore', spotRate: 18.75, forecast7d: 18.20, forecast30d: 17.50, direction: 'falling', signal: 'WAIT', urgency: 'LOW' },
  { origin: 'Kamsar, GN', destination: 'Dhamra, IN', commodity: 'Bauxite', spotRate: 15.30, forecast7d: 15.80, forecast30d: 16.40, direction: 'rising', signal: 'BUY NOW', urgency: 'MEDIUM' },
  { origin: 'Jorf Lasfar, MA', destination: 'Haldia, IN', commodity: 'Fertilizer', spotRate: 22.10, forecast7d: 22.50, forecast30d: 23.80, direction: 'rising', signal: 'LOCK NOW', urgency: 'HIGH' },
  { origin: 'Richards Bay, ZA', destination: 'Ennore, IN', commodity: 'Thermal Coal', spotRate: 16.80, forecast7d: 16.50, forecast30d: 15.90, direction: 'falling', signal: 'WAIT', urgency: 'LOW' },
  { origin: 'Hay Point, AU', destination: 'Paradip, IN', commodity: 'Coking Coal', spotRate: 19.40, forecast7d: 20.10, forecast30d: 21.30, direction: 'rising', signal: 'BUY NOW', urgency: 'MEDIUM' },
]

// Port Status
export const portStatus = [
  { name: 'Paradip', waitDays: 2.3, capacity: 78, status: 'Normal', dischargeRate: 45000, maxDraft: 17.5, maxLOA: 280 },
  { name: 'Visakhapatnam', waitDays: 4.1, capacity: 92, status: 'Congested', dischargeRate: 38000, maxDraft: 15.8, maxLOA: 260 },
  { name: 'Haldia', waitDays: 6.8, capacity: 95, status: 'Critical', dischargeRate: 22000, maxDraft: 8.5, maxLOA: 190 },
  { name: 'Dhamra', waitDays: 1.2, capacity: 45, status: 'Normal', dischargeRate: 52000, maxDraft: 18.2, maxLOA: 300 },
  { name: 'Ennore', waitDays: 3.5, capacity: 81, status: 'Elevated', dischargeRate: 35000, maxDraft: 14.5, maxLOA: 240 },
]

// Disruption Feed
export const disruptionFeed = [
  { id: 1, severity: 'CRITICAL', title: 'Red Sea Transit Disruption', location: 'Bab-el-Mandeb', impact: 'Extended routing via Cape of Good Hope adding 14-18 days', time: '2h ago', affected: ['Suez Route', 'Med-India'] },
  { id: 2, severity: 'HIGH', title: 'Cyclone Alert: Bay of Bengal', location: 'Bay of Bengal', impact: 'Port closures expected at Paradip, Vizag for 48-72h', time: '4h ago', affected: ['East Coast India'] },
  { id: 3, severity: 'MEDIUM', title: 'Strait of Hormuz Tension', location: 'Hormuz', impact: 'Insurance premiums rising; minor delays reported', time: '6h ago', affected: ['Gulf-India', 'PG Route'] },
  { id: 4, severity: 'HIGH', title: 'Malacca Strait Congestion', location: 'Malacca', impact: 'Average 18-hour delay; bunker barge shortage', time: '8h ago', affected: ['Asia-India', 'Aus-India'] },
  { id: 5, severity: 'LOW', title: 'Panama Canal Draft Restriction', location: 'Panama', impact: 'Max draft reduced to 13.4m; limited impact on India routes', time: '12h ago', affected: ['USG-India'] },
]

// Forecast Chart Data (180 days historical + 30 days forecast)
export const generateForecastData = () => {
  const data = []
  const baseRate = 15.0
  let currentRate = baseRate
  const today = new Date()

  for (let i = -180; i <= 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const trend = Math.sin(i * 0.05) * 2 + i * 0.01
    const noise = (Math.random() - 0.5) * 1.5
    const seasonal = Math.sin(i * 0.1) * 1.2

    currentRate = baseRate + trend + seasonal + noise
    const p10 = currentRate * 0.92
    const p90 = currentRate * 1.15

    data.push({
      date: dateStr,
      day: i,
      rate: parseFloat(currentRate.toFixed(2)),
      p10: parseFloat(p10.toFixed(2)),
      p90: parseFloat(p90.toFixed(2)),
      type: i <= 0 ? 'historical' : 'forecast',
    })
  }
  return data
}

// Model Performance
export const modelPerformance = {
  mape: 2.34,
  rmse: 0.87,
  r2: 0.9943,
  directionalAccuracy: 94.2,
  balticCorrelation: 0.97,
  modelType: 'LightGBM + XGBoost (hybrid ensemble)',
  confidence: '99.4%',
}

// Vessel Classes
export const vesselClasses = [
  {
    class: 'Handysize',
    dwt: 35000,
    feasible: true,
    restricted: false,
    lighterage: false,
    utilization: 85,
    seaDays: 18,
    portDays: 4,
    freightCost: 518000,
    bunkerCost: 142000,
    portDues: 28000,
    demurrage: 0,
    lighterageCost: 0,
    totalCost: 688000,
    costPerMt: 9.17,
  },
  {
    class: 'Supramax',
    dwt: 58000,
    feasible: true,
    restricted: false,
    lighterage: false,
    utilization: 92,
    seaDays: 16,
    portDays: 3.5,
    freightCost: 754000,
    bunkerCost: 198000,
    portDues: 42000,
    demurrage: 0,
    lighterageCost: 0,
    totalCost: 994000,
    costPerMt: 8.57,
  },
  {
    class: 'Panamax',
    dwt: 76000,
    feasible: true,
    restricted: true,
    lighterage: false,
    utilization: 98,
    seaDays: 15,
    portDays: 3,
    freightCost: 912000,
    bunkerCost: 245000,
    portDues: 58000,
    demurrage: 12000,
    lighterageCost: 0,
    totalCost: 1227000,
    costPerMt: 8.09,
  },
  {
    class: 'Capesize',
    dwt: 180000,
    feasible: false,
    restricted: true,
    lighterage: true,
    utilization: 42,
    seaDays: 14,
    portDays: 5,
    freightCost: 1450000,
    bunkerCost: 420000,
    portDues: 95000,
    demurrage: 48000,
    lighterageCost: 180000,
    totalCost: 2193000,
    costPerMt: 16.24,
  },
]

// Port Compliance Matrix
export const portComplianceMatrix = [
  { port: 'Paradip', maxDraft: 17.5, maxLOA: 280, maxBeam: 45, berths: 6, dischargeRate: 45000, waitingDays: 2.3, handysize: true, supramax: true, panamax: true, capesize: true, nightNav: true, tidal: false, lighterage: false, commodities: ['Coal', 'Iron Ore', 'Fertilizer'] },
  { port: 'Visakhapatnam', maxDraft: 15.8, maxLOA: 260, maxBeam: 42, berths: 8, dischargeRate: 38000, waitingDays: 4.1, handysize: true, supramax: true, panamax: true, capesize: false, nightNav: true, tidal: true, lighterage: false, commodities: ['Iron Ore', 'Coal', 'Limestone'] },
  { port: 'Haldia', maxDraft: 8.5, maxLOA: 190, maxBeam: 32, berths: 4, dischargeRate: 22000, waitingDays: 6.8, handysize: true, supramax: true, panamax: false, capesize: false, nightNav: false, tidal: true, lighterage: true, commodities: ['Fertilizer', 'Coal', 'Containers'] },
  { port: 'Dhamra', maxDraft: 18.2, maxLOA: 300, maxBeam: 48, berths: 3, dischargeRate: 52000, waitingDays: 1.2, handysize: true, supramax: true, panamax: true, capesize: true, nightNav: true, tidal: false, lighterage: false, commodities: ['Iron Ore', 'Coal', 'Alumina'] },
  { port: 'Ennore', maxDraft: 14.5, maxLOA: 240, maxBeam: 38, berths: 5, dischargeRate: 35000, waitingDays: 3.5, handysize: true, supramax: true, panamax: true, capesize: false, nightNav: true, tidal: false, lighterage: false, commodities: ['Coal', 'Iron Ore', 'Petcoke'] },
]

// Risk Scenarios
export const riskScenarios = [
  { id: 'bunker', label: 'Bunker Fuel Price Shock', min: -50, max: 100, step: 5, default: 0, unit: '%' },
  { id: 'delay', label: 'Port Delay / Congestion', min: 0, max: 15, step: 1, default: 0, unit: 'days' },
  { id: 'demand', label: 'Commodity Demand Shift', min: -30, max: 50, step: 5, default: 0, unit: '%' },
  { id: 'cyclone', label: 'Cyclone Disruption Days', min: 0, max: 10, step: 1, default: 0, unit: 'days' },
]

// Signal badge colors
export const signalColors = {
  'LOCK NOW': 'bg-rose-50 text-rose-700 border-rose-200',
  'BUY NOW': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'WAIT': 'bg-amber-50 text-amber-800 border-amber-200',
  'HOLD': 'bg-sky-50 text-sky-700 border-sky-200',
}

export const urgencyColors = {
  'HIGH': 'text-rose-700',
  'MEDIUM': 'text-amber-700',
  'LOW': 'text-emerald-700',
}

export const severityColors = {
  'CRITICAL': 'bg-rose-50 text-rose-700 border-rose-200',
  'HIGH': 'bg-amber-50 text-amber-800 border-amber-200',
  'MEDIUM': 'bg-sky-50 text-sky-700 border-sky-200',
  'LOW': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}
