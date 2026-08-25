import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MarketTicker from './components/MarketTicker';
import TabNav from './components/TabNav';
import Dashboard from './pages/Dashboard';
import FreightForecaster from './pages/FreightForecaster';
import CharterOptimizer from './pages/CharterOptimizer';
import PortRestrictions from './pages/PortRestrictions';
import RiskRadar from './pages/RiskRadar';
import api from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [portsData, setPortsData] = useState(null);
  const [routesData, setRoutesData] = useState(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [riskAlerts, setRiskAlerts] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashRes, portsRes, routesRes, riskRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/ports'),
          api.get('/routes'),
          api.get('/risk'),
        ]);
        setDashboardData(dashRes.data);
        setPortsData(portsRes.data);
        setRoutesData(routesRes.data.routes);
        setRiskAlerts(riskRes.data.alerts);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to connect to PortCast server. Make sure the backend is running on port 5000.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Forecast handler
  const handleForecast = async (routeId) => {
    try {
      const res = await api.post('/forecast', { routeId });
      setForecastResult(res.data);
    } catch (err) {
      console.error('Forecast failed:', err);
    }
  };

  // Optimize handler
  const handleOptimize = async (routeId, parcelSizeMT, bunkerPrice) => {
    try {
      const res = await api.post('/optimize', { routeId, parcelSizeMT, bunkerPrice });
      setOptimizeResult(res.data);
    } catch (err) {
      console.error('Optimization failed:', err);
    }
  };

  // Simulate handler
  const handleSimulate = async (routeId, scenario) => {
    try {
      const res = await api.post('/simulate', { routeId, scenario });
      setSimulationResult(res.data);
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '2rem',
        flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ fontSize: '3rem' }}>🚢</div>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 800,
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>PortCast</h1>
        <div style={{
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '12px', padding: '1.5rem',
          maxWidth: '500px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.9rem', color: '#f43f5e', fontWeight: 600, marginBottom: '0.5rem' }}>
            Connection Error
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
            {error}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#64748b' }}>
            Run <code style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#06b6d4' }}>npm run dev</code> in the server directory
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: '1.5rem',
      }}>
        <div style={{ fontSize: '3rem', animation: 'pulse-badge 2s infinite' }}>🚢</div>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 800,
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>PortCast</h1>
        <div className="spinner" />
        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Loading freight intelligence...</div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={dashboardData} />;
      case 'forecast':
        return <FreightForecaster routes={routesData} onForecast={handleForecast} forecastResult={forecastResult} />;
      case 'optimizer':
        return <CharterOptimizer routes={routesData} onOptimize={handleOptimize} optimizeResult={optimizeResult} />;
      case 'ports':
        return <PortRestrictions ports={portsData} />;
      case 'risk':
        return <RiskRadar alerts={riskAlerts} routes={routesData} onSimulate={handleSimulate} simulationResult={simulationResult} />;
      default:
        return <Dashboard data={dashboardData} />;
    }
  };

  return (
    <>
      <MarketTicker data={dashboardData?.marketIndicators} />
      <Navbar />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {renderTab()}
      </main>
    </>
  );
}

export default App;
