import mongoose from 'mongoose';

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log('ℹ️  No MONGO_URI provided — running with in-memory auth store');
    return;
  }
  // Disable buffering so queries don't hang 10s if connection is pending or restricted
  mongoose.set('bufferCommands', false);

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Notice: ${error.message}`);
    console.log('ℹ️  In-memory auth store active for instant login & session management');
  }
};

export default connectDB;
