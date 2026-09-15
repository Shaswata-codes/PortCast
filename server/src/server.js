import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB if configured
connectDB();

app.listen(PORT, () => {
  console.log(`🚢 PortCast server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
