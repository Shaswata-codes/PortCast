export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const APP_NAME = 'PortCast';

export const TABS = [
  { id: 'dashboard', label: 'Executive Overview' },
  { id: 'forecast', label: 'Freight Forecaster' },
  { id: 'optimizer', label: 'Chartering Optimizer' },
  { id: 'ports', label: 'Port Infrastructure' },
  { id: 'risk', label: 'Risk Radar & Simulation' },
];
