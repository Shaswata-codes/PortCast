import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard({ data }) {
  if (!data) return <div className="spinner" />;

  const { marketIndicators, balticHistory, routeSnapshots, alerts } = data;

  // Baltic chart data
  const chartLabels = balticHistory.slice(-60).map(d => d.date.slice(5));
  const bdiData = balticHistory.slice(-60).map(d => d.bdi);
  const vlsfoData = balticHistory.slice(-60).map(d => d.vlsfo);

  const bdiChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'BDI',
        data: bdiData,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const vlsfoChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'VLSFO ($/MT)',
        data: vlsfoData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 10 },
        grid: { color: 'rgba(148, 163, 184, 0.06)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(148, 163, 184, 0.06)' },
      },
    },
  };

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>Executive Market Overview</h2>
        <p>Real-time market intelligence for East Coast India bulk freight procurement</p>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Baltic Dry Index</span>
            <span className={`kpi-badge ${parseFloat(marketIndicators.bdi.changePct) >= 0 ? 'up' : 'down'}`}>
              {parseFloat(marketIndicators.bdi.changePct) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(marketIndicators.bdi.changePct))}%
            </span>
          </div>
          <div className="kpi-value cyan">{marketIndicators.bdi.value.toLocaleString()}</div>
          <div className="kpi-sub">Change: {marketIndicators.bdi.change > 0 ? '+' : ''}{marketIndicators.bdi.change} pts</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Capesize Index (BCI)</span>
            <span className={`kpi-badge ${parseFloat(marketIndicators.bci.changePct) >= 0 ? 'up' : 'down'}`}>
              {parseFloat(marketIndicators.bci.changePct) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(marketIndicators.bci.changePct))}%
            </span>
          </div>
          <div className="kpi-value blue">{marketIndicators.bci.value.toLocaleString()}</div>
          <div className="kpi-sub">Capesize vessel class rates</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Panamax Index (BPI)</span>
            <span className={`kpi-badge ${parseFloat(marketIndicators.bpi.changePct) >= 0 ? 'up' : 'down'}`}>
              {parseFloat(marketIndicators.bpi.changePct) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(marketIndicators.bpi.changePct))}%
            </span>
          </div>
          <div className="kpi-value amber">{marketIndicators.bpi.value.toLocaleString()}</div>
          <div className="kpi-sub">Panamax vessel class rates</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">VLSFO Bunker Price</span>
            <span className="kpi-badge neutral">FUEL</span>
          </div>
          <div className="kpi-value purple">${marketIndicators.vlsfo.value}</div>
          <div className="kpi-sub">Singapore hub — per metric ton</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Routes</span>
            <span className="kpi-badge up">MONITORED</span>
          </div>
          <div className="kpi-value emerald">{data.routesCount}</div>
          <div className="kpi-sub">To {data.portsCount} East Coast ports</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="two-col">
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <div className="chart-title">Baltic Dry Index — 60 Day Trend</div>
              <div className="chart-subtitle">Global dry bulk freight market benchmark</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Line data={bdiChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <div>
              <div className="chart-title">VLSFO Bunker Fuel — 60 Day Trend</div>
              <div className="chart-subtitle">Singapore hub pricing ($/MT)</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Line data={vlsfoChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Route Snapshots Table */}
      <div className="chart-container" style={{ marginBottom: '1.25rem' }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Key Route Projections & Chartering Signals</div>
            <div className="chart-subtitle">AI-generated optimal entry recommendations</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Commodity</th>
              <th>Current ($/MT)</th>
              <th>7d Forecast</th>
              <th>30d Forecast</th>
              <th>Direction</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {routeSnapshots.map(snap => (
              <tr key={snap.routeId}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{snap.routeName}</td>
                <td>{snap.commodity}</td>
                <td className="mono">${snap.currentRate}</td>
                <td className="mono">${snap.forecast7d}</td>
                <td className="mono">${snap.forecast30d}</td>
                <td>
                  <span style={{ color: snap.direction === 'UP' ? 'var(--rose)' : 'var(--emerald)' }}>
                    {snap.direction === 'UP' ? '▲ Rising' : '▼ Falling'}
                  </span>
                </td>
                <td>
                  <span className={`signal-badge ${snap.signal.toLowerCase().replace(' ', '-')}`}>
                    {snap.signal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risk Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <div className="chart-title">⚠️ Active Risk Alerts</div>
              <div className="chart-subtitle">High-priority warnings affecting East Coast India operations</div>
            </div>
          </div>
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-card ${alert.severity.toLowerCase()}`}>
              <div className="alert-title">{alert.title}</div>
              <div className="alert-desc">{alert.description}</div>
              <div className="alert-impact">Impact: {alert.impact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
