import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function FreightForecaster({ routes, onForecast, forecastResult }) {
  const [selectedRoute, setSelectedRoute] = useState('');

  const handleForecast = () => {
    if (selectedRoute) onForecast(selectedRoute);
  };

  const fr = forecastResult?.forecast;
  const entry = forecastResult?.optimalEntry;

  // Build chart data if we have a forecast
  let chartData = null;
  if (fr?.historical) {
    const labels = fr.historical.map(d => d.date.slice(5));
    const rateData = fr.historical.map(d => d.rate);

    // Add forecast points
    const forecastHorizons = Object.values(fr.forecasts);
    const forecastLabels = forecastHorizons.map(f => f.targetDate.slice(5));
    const forecastPoints = forecastHorizons.map(f => f.pointForecast);
    const ci80Low = forecastHorizons.map(f => f.ci80.low);
    const ci80High = forecastHorizons.map(f => f.ci80.high);

    chartData = {
      labels: [...labels, ...forecastLabels],
      datasets: [
        {
          label: 'Historical Rate ($/MT)',
          data: [...rateData, ...Array(forecastLabels.length).fill(null)],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: 'Forecast ($/MT)',
          data: [...Array(labels.length).fill(null), ...forecastPoints],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 2.5,
          borderDash: [6, 4],
          fill: false,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#0a1628',
          pointBorderWidth: 2,
        },
        {
          label: 'CI 80% High',
          data: [...Array(labels.length).fill(null), ...ci80High],
          borderColor: 'rgba(245, 158, 11, 0.25)',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          borderWidth: 1,
          borderDash: [3, 3],
          fill: '+1',
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: 'CI 80% Low',
          data: [...Array(labels.length).fill(null), ...ci80Low],
          borderColor: 'rgba(245, 158, 11, 0.25)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [3, 3],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    };
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 15 },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 15 }, grid: { color: 'rgba(148, 163, 184, 0.06)' } },
      y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => `$${v}` }, grid: { color: 'rgba(148, 163, 184, 0.06)' } },
    },
  };

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>Multi-Horizon Freight Rate Forecaster</h2>
        <p>AI-powered rate projections with confidence intervals for optimal chartering decisions</p>
      </div>

      {/* Route selector */}
      <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 280 }}>
            <label className="form-label">Select Shipping Route</label>
            <select className="form-select" value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
              <option value="">— Choose a route —</option>
              {routes?.map(r => (
                <option key={r.id} value={r.id}>{r.id}: {r.originName} → {r.destinationName} ({r.commodity})</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleForecast} disabled={!selectedRoute}>
            Calculate Forecast
          </button>
        </div>
      </div>

      {/* Forecast Results */}
      {fr && (
        <>
          {/* Current & Momentum */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">Current Rate</span></div>
              <div className="kpi-value cyan">${fr.currentRate}</div>
              <div className="kpi-sub">{fr.routeName}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">7-Day MA</span></div>
              <div className="kpi-value blue">${fr.ma7}</div>
              <div className="kpi-sub">Short-term average</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">30-Day MA</span></div>
              <div className="kpi-value amber">${fr.ma30}</div>
              <div className="kpi-sub">Medium-term average</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Momentum</span>
                <span className={`kpi-badge ${fr.momentumLabel === 'BULLISH' ? 'up' : fr.momentumLabel === 'BEARISH' ? 'down' : 'neutral'}`}>
                  {fr.momentumLabel}
                </span>
              </div>
              <div className={`kpi-value ${fr.momentum > 0 ? 'rose' : 'emerald'}`}>{fr.momentum > 0 ? '+' : ''}{fr.momentum}%</div>
              <div className="kpi-sub">MA7 vs MA30 divergence</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-label">Volatility</span></div>
              <div className="kpi-value purple">{fr.volatility}%</div>
              <div className="kpi-sub">30-day standard deviation</div>
            </div>
          </div>

          {/* Forecast Chart */}
          {chartData && (
            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Rate Projection — {fr.routeName}</div>
                  <div className="chart-subtitle">180 days historical + multi-horizon forecast with 80% confidence bands</div>
                </div>
              </div>
              <div style={{ height: 320 }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Live ML Engine Insights Card */}
          {forecastResult?.mlEngine && forecastResult.mlEngine.status !== 'fallback_active' && (
            <div className="glass-card" style={{ marginBottom: '1.25rem', border: '1px solid rgba(6, 182, 212, 0.4)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(59, 130, 246, 0.05))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cyan)' }}>Live ML Intelligence Engine (LightGBM + Geopolitical Radar)</h3>
                </div>
                <span className="kpi-badge cyan">
                  Risk Index: {forecastResult.mlEngine.geopolitical_risk_index}/100 (x{forecastResult.mlEngine.rate_multiplier_applied} Multiplier)
                </span>
              </div>
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(10, 22, 40, 0.6)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ML Current Adjusted Rate</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan)' }}>${forecastResult.mlEngine.current_rate_pmt}/MT</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Includes live shock premium</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(10, 22, 40, 0.6)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>7-Day Quantile Band</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--amber)' }}>
                    ${forecastResult.mlEngine.forecast_horizons['7d'].p10_lower} – ${forecastResult.mlEngine.forecast_horizons['7d'].p90_upper}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>P10 Lower / P90 Upper</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(10, 22, 40, 0.6)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Optimal ML Booking Target</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--emerald)' }}>
                    Day {forecastResult.mlEngine.optimal_booking.target_day} (${forecastResult.mlEngine.optimal_booking.projected_rate}/MT)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Signal: {forecastResult.mlEngine.optimal_booking.signal}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(10, 22, 40, 0.6)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Monitored Chokepoints</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--rose)', marginTop: '0.2rem' }}>
                    {forecastResult.mlEngine.active_chokepoints?.join(', ') || 'Hormuz, Malacca, Bay of Bengal'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Horizon Pills */}
          <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Forecast Horizons</h3>
            <div className="horizon-pills">
              {Object.values(fr.forecasts).map(f => (
                <div key={f.horizon} className="horizon-pill">
                  <span className="hz-label">{f.label}</span>
                  <span className="hz-value" style={{ color: f.direction === 'UP' ? 'var(--rose)' : 'var(--emerald)' }}>
                    ${f.pointForecast}
                  </span>
                  <span className={`hz-change ${f.changePct > 0 ? 'up' : 'down'}`}>
                    {f.changePct > 0 ? '+' : ''}{f.changePct}%
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                    CI: ${f.ci80.low} – ${f.ci80.high}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimal Entry Signal */}
          {entry && (
            <div className="two-col">
              <div className="glass-card">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Optimal Market Entry Signal</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span className={`signal-badge ${entry.signal.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
                    {entry.signal}
                  </span>
                  <span className={`kpi-badge ${entry.urgency.toLowerCase()}`}>
                    {entry.urgency} URGENCY
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {entry.reasoning}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projected Trough</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--emerald)' }}>${entry.projectedTrough.rate}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {entry.projectedTrough.inDays} days</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projected Peak</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--rose)' }}>${entry.projectedPeak.rate}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {entry.projectedPeak.inDays} days</div>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Spot vs Time Charter Comparison</h3>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Spot Rate (Current)</td>
                      <td className="mono">${entry.spotVsTC.spotRate}/MT</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>T/C Equivalent (6 Month)</td>
                      <td className="mono" style={{ color: 'var(--emerald)' }}>${entry.spotVsTC.tcEquivalent6m}/MT</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>T/C Equivalent (12 Month)</td>
                      <td className="mono" style={{ color: 'var(--emerald)' }}>${entry.spotVsTC.tcEquivalent12m}/MT</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>COA Rate (Est.)</td>
                      <td className="mono" style={{ color: 'var(--cyan)' }}>${entry.spotVsTC.coaRate}/MT</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Potential Savings/MT</td>
                      <td className="mono" style={{ color: 'var(--amber)' }}>${entry.potentialSavingsPerMT}/MT</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'var(--blue-dim)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--blue)' }}>
                  Strategy Recommendation: {entry.spotVsTC.recommendation}
                </div>
              </div>
            </div>
          )}

          {/* Model Metrics */}
          <div className="glass-card" style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Model Performance Metrics</h3>
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {[
                { label: 'MAPE', value: `${fr.metrics.mape}%`, color: 'cyan' },
                { label: 'RMSE', value: `$${fr.metrics.rmse}`, color: 'blue' },
                { label: 'R²', value: fr.metrics.rSquared, color: 'emerald' },
                { label: 'Directional Accuracy', value: `${fr.metrics.directionalAccuracy}%`, color: 'amber' },
                { label: 'Baltic Correlation', value: fr.balticCorrelation, color: 'purple' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: `var(--${m.color})` }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
