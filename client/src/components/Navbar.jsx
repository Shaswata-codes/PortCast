import React from 'react';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="logo-icon">🚢</div>
        <div>
          <h1>PortCast</h1>
          <span className="subtitle">Intelligent Freight Intelligence</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          SIH 2026 • East Coast India
        </span>
        <div style={{
          width: 8, height: 8,
          background: 'var(--emerald)',
          borderRadius: '50%',
          boxShadow: '0 0 8px var(--emerald)',
          animation: 'pulse-badge 2s infinite'
        }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 600 }}>LIVE</span>
      </div>
    </nav>
  );
}
