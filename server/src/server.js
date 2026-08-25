import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Skip MongoDB — PortCast analytics engine runs entirely in-memory
// MongoDB can be enabled later for user accounts, saved analyses, etc.
console.log('ℹ️  Running in analytics-only mode (no MongoDB required)');

app.listen(PORT, () => {
  console.log(`🚢 PortCast server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
