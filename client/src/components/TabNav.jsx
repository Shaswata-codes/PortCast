import React from 'react';
import { LayoutDashboard, TrendingUp, Compass, Anchor, ShieldAlert } from 'lucide-react';

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  forecast: TrendingUp,
  optimizer: Compass,
  ports: Anchor,
  risk: ShieldAlert,
};

const TABS = [
  { id: 'dashboard', label: 'Executive Overview' },
  { id: 'forecast', label: 'Freight Forecaster' },
  { id: 'optimizer', label: 'Chartering Optimizer' },
  { id: 'ports', label: 'Port Infrastructure' },
  { id: 'risk', label: 'Risk Radar & Simulation' },
];

export default function TabNav({ activeTab, onTabChange }) {
  return (
    <div className="tab-nav">
      {TABS.map(tab => {
        const IconComponent = TAB_ICONS[tab.id] || LayoutDashboard;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <IconComponent size={16} strokeWidth={2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
