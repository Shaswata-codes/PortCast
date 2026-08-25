export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const APP_NAME = 'PortCast';

export const TABS = [
  { id: 'dashboard', label: 'Overview', icon: '📊' },
  { id: 'forecast', label: 'Freight Forecaster', icon: '📈' },
  { id: 'optimizer', label: 'Chartering Optimizer', icon: '🎯' },
  { id: 'ports', label: 'Port Restrictions', icon: '⚓' },
  { id: 'risk', label: 'Risk Radar', icon: '⚡' },
];
