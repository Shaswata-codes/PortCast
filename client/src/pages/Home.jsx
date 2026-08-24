import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Home = () => {
  const [serverStatus, setServerStatus] = useState('Checking...');

  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        setServerStatus(res.data.status === 'ok' ? 'Connected' : 'Offline');
      })
      .catch(() => {
        setServerStatus('Server not reachable');
      });
  }, []);

  return (
    <div className="hero-card">
      <h1 className="hero-title">MERN Stack Template</h1>
      <p className="hero-subtitle">
        A production-ready full-stack boilerplate with MongoDB, Express, React, and Node.js.
      </p>
      <div className="badge-grid">
        <span className="badge">MongoDB</span>
        <span className="badge">Express.js</span>
        <span className="badge">React 18</span>
        <span className="badge">Node.js</span>
        <span className="badge">Vite</span>
        <span className="badge" style={{ color: serverStatus === 'Connected' ? '#10b981' : '#f59e0b' }}>
          Backend: {serverStatus}
        </span>
      </div>
    </div>
  );
};

export default Home;
