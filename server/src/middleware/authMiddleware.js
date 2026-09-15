import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import { memoryUsers } from '../controllers/userController.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'portcast_jwt_secret_key_2026_shipping';
      const decoded = jwt.verify(token, secret);

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          req.user = await User.findById(decoded.id).select('-password');
        } catch {
          // ignore error and try in-memory
        }
      }
      if (!req.user) {
        const found = memoryUsers.find((u) => u._id === decoded.id);
        if (found) {
          req.user = {
            _id: found._id,
            name: found.name,
            email: found.email,
            role: found.role || 'Fleet Charterer',
          };
        }
      }

      if (req.user) {
        return next();
      }
      return res.status(401).json({ message: 'Not authorized, user not found' });
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
