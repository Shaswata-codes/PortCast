import React from 'react';

export default function PortRestrictions({ ports }) {
  if (!ports) return <div className="spinner" />;

  const { destinations } = ports;

  const vesselLabels = {
    handysize: { label: 'Handysize', color: '#10b981' },
    supramax: { label: 'Supramax', color: '#3b82f6' },
    panamax: { label: 'Panamax', color: '#f59e0b' },
    capesize: { label: 'Capesize', color: '#f43f5e' },
  };

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>Port Infrastructure & Fleet Compatibility Matrix</h2>
        <p>Physical infrastructure constraints, vessel feasibility, and operational specs for all East Coast Indian ports</p>
      </div>

      {/* Feasibility Summary Table */}
      <div className="chart-container" style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Vessel Class ↔ Port Compatibility Matrix</div>
            <div className="chart-subtitle">Draft and dimensional compliance for East Coast terminals</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Port</th>
              <th>Max Draft</th>
              <th>Max LOA</th>
              <th>Handysize</th>
              <th>Supramax</th>
              <th>Panamax</th>
              <th>Capesize</th>
              <th>Lighterage</th>
            </tr>
          </thead>
          <tbody>
            {destinations?.map(port => (
              <tr key={port.id}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {port.name}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{port.state}</div>
                </td>
                <td className="mono">{port.maxDraft}m</td>
                <td className="mono">{port.maxLOA}m</td>
                {['handysize', 'supramax', 'panamax', 'capesize'].map(vc => {
                  const feasible = port.vesselFeasibility?.[vc];
                  // Check for restricted (partially feasible)
                  const isRestricted = vc === 'capesize' && port.maxDraft < 17 && port.maxDraft >= 14;
                  const isPanamaxRestricted = vc === 'panamax' && port.maxDraft < 14 && port.maxDraft >= 12;

                  let icon, tagClass;
                  if (!feasible) {
                    icon = '❌';
                    tagClass = 'infeasible';
                  } else if (isRestricted || isPanamaxRestricted) {
                    icon = '⚠️';
                    tagClass = 'restricted';
                  } else {
                    icon = '✅';
                    tagClass = 'feasible';
                  }

                  return (
                    <td key={vc}>
                      <span className={`constraint-tag ${tagClass}`}>
                        {icon} {feasible ? 'OK' : 'NO'}
                      </span>
                    </td>
                  );
                })}
                <td>
                  {port.lighterageRequired ? (
                    <span className="constraint-tag restricted">⚠️ Required (${port.lighterageCostPerMT}/MT)</span>
                  ) : (
                    <span className="constraint-tag feasible">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Port Cards */}
      <div className="port-matrix">
        {destinations?.map(port => (
          <div key={port.id} className="port-card">
            <div className="port-name">{port.name}</div>
            <div className="port-state">{port.state} • {port.annualCapacityMTPA} MTPA capacity</div>

            {/* Draft Visualizer */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <span>Max Draft</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{port.maxDraft}m</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (port.maxDraft / 21) * 100)}%`,
                  background: port.maxDraft >= 18 ? 'var(--emerald)' : port.maxDraft >= 14 ? 'var(--amber)' : 'var(--rose)',
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                <span>0m</span>
                <span>21m (Gangavaram max)</span>
              </div>
            </div>

            <div className="port-specs">
              <div className="port-spec-item">
                <span className="port-spec-label">Max LOA</span>
                <span className="port-spec-value">{port.maxLOA}m</span>
              </div>
              <div className="port-spec-item">
                <span className="port-spec-label">Max Beam</span>
                <span className="port-spec-value">{port.maxBeam}m</span>
              </div>
              <div className="port-spec-item">
                <span className="port-spec-label">Tidal Range</span>
                <span className="port-spec-value">{port.tidalRange}m</span>
              </div>
              <div className="port-spec-item">
                <span className="port-spec-label">Bulk Berths</span>
                <span className="port-spec-value">{port.dryBulkBerths}</span>
              </div>
              <div className="port-spec-item">
                <span className="port-spec-label">Discharge Rate</span>
                <span className="port-spec-value">{(port.avgDischargeRate / 1000).toFixed(0)}k MT/day</span>
              </div>
              <div className="port-spec-item">
                <span className="port-spec-label">Avg Waiting</span>
                <span className="port-spec-value" style={{ color: port.avgWaitingDays > 3 ? 'var(--rose)' : port.avgWaitingDays > 2 ? 'var(--amber)' : 'var(--emerald)' }}>
                  {port.avgWaitingDays} days
                </span>
              </div>
            </div>

            {/* Vessel compatibility tags */}
            <div className="vessel-compat">
              {Object.entries(port.vesselFeasibility || {}).map(([vc, feasible]) => (
                <span key={vc} className={`constraint-tag ${feasible ? 'feasible' : 'infeasible'}`}>
                  {feasible ? 'Feasible' : 'Restricted'} • {vesselLabels[vc]?.label || vc}
                </span>
              ))}
            </div>

            {/* Commodities */}
            <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <strong>Commodities:</strong> {port.commodities?.join(', ')}
            </div>

            {port.lighterageRequired && (
              <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--rose-dim)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'var(--rose)' }}>
                Lighterage: {port.lighterageNote}
              </div>
            )}

            {!port.nightNavigation && (
              <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--amber-dim)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'var(--amber)' }}>
                Night Navigation: Restricted
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
