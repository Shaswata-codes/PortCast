import React, { useState } from 'react';

export default function CharterOptimizer({ routes, onOptimize, optimizeResult }) {
  const [selectedRoute, setSelectedRoute] = useState('');
  const [parcelSize, setParcelSize] = useState(70000);
  const [bunkerPrice, setBunkerPrice] = useState(620);

  const handleOptimize = () => {
    if (selectedRoute) onOptimize(selectedRoute, parcelSize, bunkerPrice);
  };

  const opt = optimizeResult?.optimization;
  const idle = optimizeResult?.idleRisk;
  const entry = optimizeResult?.optimalEntry;

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>🎯 Intelligent Chartering Optimizer</h2>
        <p>Vessel selection, voyage cost breakdown, idle risk, and optimal market entry — all in one view</p>
      </div>

      {/* Input Panel */}
      <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 2, minWidth: 260 }}>
            <label className="form-label">Shipping Route</label>
            <select className="form-select" value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
              <option value="">— Choose a route —</option>
              {routes?.map(r => (
                <option key={r.id} value={r.id}>{r.id}: {r.originName} → {r.destinationName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">Cargo Parcel (MT)</label>
            <input className="form-input" type="number" value={parcelSize} onChange={e => setParcelSize(parseInt(e.target.value) || 0)} min={10000} max={200000} step={5000} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">VLSFO Price ($/MT)</label>
            <input className="form-input" type="number" value={bunkerPrice} onChange={e => setBunkerPrice(parseInt(e.target.value) || 0)} min={300} max={1200} step={10} />
          </div>
          <button className="btn btn-primary" onClick={handleOptimize} disabled={!selectedRoute}>
            ⚡ Optimize
          </button>
        </div>
      </div>

      {opt && (
        <>
          {/* Summary */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">Route</span></div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{opt.routeName}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">Parcel Size</span></div>
              <div className="kpi-value cyan">{opt.parcelSizeMT.toLocaleString()}</div>
              <div className="kpi-sub">metric tons</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">Optimal Vessel</span></div>
              <div className="kpi-value emerald">{opt.optimalVessel?.vesselClass || 'N/A'}</div>
              <div className="kpi-sub">${opt.optimalVessel?.totalCostPerMT}/MT total cost</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">Evaluated</span></div>
              <div className="kpi-value blue">{opt.feasibleOptions}/{opt.totalOptionsEvaluated}</div>
              <div className="kpi-sub">feasible vessel classes</div>
            </div>
          </div>

          {/* Vessel Evaluation Cards */}
          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🚢 Vessel Class Evaluation</h3>
            {opt.recommendations.map(v => (
              <div key={v.vesselId} className={`vessel-result ${v.isOptimal ? 'optimal' : ''} ${!v.feasible ? 'infeasible' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: v.color }}>{v.vesselClass}</span>
                      {!v.feasible && <span className="constraint-tag infeasible">❌ INFEASIBLE</span>}
                      {v.feasible && <span className="constraint-tag feasible">✅ Feasible</span>}
                    </div>
                    {v.constraints.map((c, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--rose)', marginBottom: '0.2rem' }}>⛔ {c}</div>
                    ))}
                    {v.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--amber)', marginBottom: '0.2rem' }}>⚠️ {w}</div>
                    ))}
                  </div>

                  {v.feasible && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: v.isOptimal ? 'var(--emerald)' : 'var(--text-primary)' }}>
                        ${v.totalCostPerMT}/MT
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total voyage cost: ${v.costs.totalVoyageCost.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {v.feasible && (
                  <>
                    {/* Cost Breakdown Bar */}
                    <div className="cost-bar" style={{ marginTop: '0.75rem' }}>
                      <div className="segment hire" style={{ width: `${(v.costs.hireCost / v.costs.totalVoyageCost) * 100}%` }} title={`Hire: $${v.costs.hireCost.toLocaleString()}`} />
                      <div className="segment fuel" style={{ width: `${(v.costs.fuelCost / v.costs.totalVoyageCost) * 100}%` }} title={`Fuel: $${v.costs.fuelCost.toLocaleString()}`} />
                      <div className="segment port" style={{ width: `${(v.costs.portCharges / v.costs.totalVoyageCost) * 100}%` }} title={`Port: $${v.costs.portCharges.toLocaleString()}`} />
                      {v.costs.lighterageCost > 0 && (
                        <div className="segment lighterage" style={{ width: `${(v.costs.lighterageCost / v.costs.totalVoyageCost) * 100}%` }} title={`Lighterage: $${v.costs.lighterageCost.toLocaleString()}`} />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--blue)', borderRadius: 2, marginRight: 4 }}></span>Hire: ${v.costs.hireCost.toLocaleString()}</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--amber)', borderRadius: 2, marginRight: 4 }}></span>Fuel: ${v.costs.fuelCost.toLocaleString()}</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--cyan)', borderRadius: 2, marginRight: 4 }}></span>Port: ${v.costs.portCharges.toLocaleString()}</span>
                      {v.costs.lighterageCost > 0 && (
                        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--rose)', borderRadius: 2, marginRight: 4 }}></span>Lighterage: ${v.costs.lighterageCost.toLocaleString()}</span>
                      )}
                    </div>

                    {/* Voyage Details */}
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Transit:</span> <span className="mono">{v.breakdown.transitDays}d</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Ballast:</span> <span className="mono">{v.breakdown.ballastDays}d</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Loading:</span> <span className="mono">{v.breakdown.loadingDays}d</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Discharge:</span> <span className="mono">{v.breakdown.dischargeDays}d</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Waiting:</span> <span className="mono">{v.breakdown.waitingDays}d</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Total:</span> <span className="mono" style={{ fontWeight: 700, color: 'var(--cyan)' }}>{v.totalVoyageDays}d</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Utilization:</span> <span className="mono">{v.utilization}%</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>T/C Equiv:</span> <span className="mono">${v.dailyTCEquivalent.toLocaleString()}/day</span></div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Idle & Demurrage Risk */}
          {idle && (
            <div className="two-col" style={{ marginTop: '1.25rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>⏱️ Idle & Demurrage Risk</h3>
                <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Waiting</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--amber)' }}>{idle.estimatedWaitingDays} days</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Level</div>
                    <span className={`kpi-badge ${idle.riskLevel.toLowerCase()}`}>{idle.riskLevel} ({idle.riskScore}/100)</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Demurrage Liability</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--rose)' }}>${idle.demurrage.estimatedLiability.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Despatch Potential</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--emerald)' }}>${idle.despatch.potentialEarnings.toLocaleString()}</div>
                  </div>
                </div>
                {idle.seasonalNote && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--amber-dim)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--amber)' }}>
                    🌧️ {idle.seasonalNote}
                  </div>
                )}
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>📅 Laycan Recommendation</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {idle.laycanRecommendation.note}
                </p>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mitigation Strategies</h4>
                {idle.mitigationStrategies.map((s, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', paddingLeft: '1rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--cyan)' }}>→</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Entry */}
          {entry && (
            <div className="glass-card" style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>🎯 Market Entry Signal</h3>
                  <span className={`signal-badge ${entry.signal.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
                    {entry.signal}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Est. Savings on 70,000 MT parcel</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald)' }}>
                    ${(entry.potentialSavingsPerMT * 70000).toLocaleString()}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.75rem' }}>
                {entry.reasoning}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
