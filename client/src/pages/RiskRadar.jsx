import React, { useState } from 'react';

export default function RiskRadar({ alerts, routes, onSimulate, simulationResult }) {
  const [selectedRoute, setSelectedRoute] = useState('');
  const [bunkerShock, setBunkerShock] = useState(0);
  const [congestionDays, setCongestionDays] = useState(0);
  const [demandShock, setDemandShock] = useState(0);
  const [cycloneDays, setCycloneDays] = useState(0);
  const [chokePoint, setChokePoint] = useState('');

  const handleSimulate = () => {
    if (selectedRoute) {
      onSimulate(selectedRoute, {
        bunkerShockPct: bunkerShock,
        congestionExtraDays: congestionDays,
        demandShockPct: demandShock,
        cycloneDays,
        routeClosureChokePoint: chokePoint || null,
      });
    }
  };

  const sim = simulationResult;

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>⚡ Risk Radar & What-If Simulator</h2>
        <p>Real-time risk alerts and interactive scenario stress-testing for freight rate impacts</p>
      </div>

      {/* Risk Alerts */}
      <div className="chart-container" style={{ marginBottom: '1.25rem' }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Active Disruption & Geopolitical Risk Alerts</div>
            <div className="chart-subtitle">Live monitoring of weather, geopolitical, and market risks</div>
          </div>
        </div>
        {alerts?.map(alert => (
          <div key={alert.id} className={`alert-card ${alert.severity.toLowerCase()}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="alert-title">{alert.title}</div>
              <span className={`kpi-badge ${alert.severity === 'CRITICAL' ? 'critical' : alert.severity === 'HIGH' ? 'high' : alert.severity === 'MEDIUM' ? 'medium' : 'low'}`}>
                {alert.severity}
              </span>
            </div>
            <div className="alert-desc">{alert.description}</div>
            <div className="alert-impact">Impact Assessment: {alert.impact}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--cyan)', marginTop: '0.3rem' }}>
              Advisory: {alert.recommendation}
            </div>
            {alert.affectedRoutes?.length > 0 && (
              <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {alert.affectedRoutes.map(r => (
                  <span key={r} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'var(--bg-tertiary)', borderRadius: 8, color: 'var(--text-muted)' }}>
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* What-If Simulator */}
      <div className="chart-container">
        <div className="chart-header">
          <div>
            <div className="chart-title">What-If Scenario Stress Simulator</div>
            <div className="chart-subtitle">Stress-test route economics with custom shock parameters</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ flex: 2, minWidth: 260 }}>
            <label className="form-label">Route to Simulate</label>
            <select className="form-select" value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
              <option value="">— Choose a route —</option>
              {routes?.map(r => (
                <option key={r.id} value={r.id}>{r.id}: {r.originName} → {r.destinationName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Choke Point Closure</label>
            <select className="form-select" value={chokePoint} onChange={e => setChokePoint(e.target.value)}>
              <option value="">None</option>
              <option value="suez">Suez Canal Closure</option>
              <option value="malacca">Malacca Strait Closure</option>
            </select>
          </div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Bunker Fuel Price Shock</span>
              <span className="slider-value">{bunkerShock > 0 ? '+' : ''}{bunkerShock}%</span>
            </div>
            <input type="range" min={-50} max={100} value={bunkerShock} onChange={e => setBunkerShock(parseInt(e.target.value))} />
          </div>
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Port Congestion (Extra Days)</span>
              <span className="slider-value">+{congestionDays} days</span>
            </div>
            <input type="range" min={0} max={15} value={congestionDays} onChange={e => setCongestionDays(parseInt(e.target.value))} />
          </div>
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Demand Shock</span>
              <span className="slider-value">{demandShock > 0 ? '+' : ''}{demandShock}%</span>
            </div>
            <input type="range" min={-30} max={50} value={demandShock} onChange={e => setDemandShock(parseInt(e.target.value))} />
          </div>
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Cyclone Disruption (Days)</span>
              <span className="slider-value">{cycloneDays} days</span>
            </div>
            <input type="range" min={0} max={10} value={cycloneDays} onChange={e => setCycloneDays(parseInt(e.target.value))} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSimulate} disabled={!selectedRoute}>
          Run Scenario Stress-Test
        </button>
      </div>

      {/* Simulation Results */}
      {sim && (
        <div className="glass-card" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Simulation Stress-Test Results</h3>

          <div className="two-col">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Base Rate</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--cyan)' }}>
                ${sim.base.currentRate}/MT
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Stressed Rate</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: sim.simulated.currentRate > sim.base.currentRate ? 'var(--rose)' : 'var(--emerald)' }}>
                ${sim.simulated.currentRate}/MT
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: sim.simulated.currentRate > sim.base.currentRate ? 'var(--rose)' : 'var(--emerald)' }}>
                {sim.simulated.currentRate > sim.base.currentRate ? '+' : ''}{(sim.simulated.currentRate - sim.base.currentRate).toFixed(2)}/MT
                ({((sim.simulated.currentRate - sim.base.currentRate) / sim.base.currentRate * 100).toFixed(1)}%)
              </div>
            </div>
          </div>

          {sim.simulated.adjustments && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Impact Breakdown</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Shock Applied</th>
                    <th>Rate Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.simulated.adjustments.map((adj, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{adj.factor}</td>
                      <td className="mono">{adj.shock}</td>
                      <td className="mono" style={{ color: adj.impact.includes('+') ? 'var(--rose)' : 'var(--emerald)' }}>
                        {adj.impact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Impact on Parcel */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Total Financial Impact on 70,000 MT Parcel
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: sim.simulated.currentRate > sim.base.currentRate ? 'var(--rose)' : 'var(--emerald)' }}>
              {sim.simulated.currentRate > sim.base.currentRate ? '+' : '-'}${Math.abs(Math.round((sim.simulated.currentRate - sim.base.currentRate) * 70000)).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
