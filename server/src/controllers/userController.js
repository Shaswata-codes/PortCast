import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// In-memory fallback user store when MongoDB is not active
export const memoryUsers = [
  {
    _id: 'usr_demo_101',
    name: 'Capt. Alex Vance',
    email: 'demo@portcast.ai',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'Senior Freight Charterer',
  },
  {
    _id: 'usr_demo_102',
    name: 'Priya Sharma',
    email: 'charterer@portcast.ai',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'East Coast Fleet Operator',
  }
];

const isMongoActive = () => mongoose.connection && mongoose.connection.readyState === 1;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check in-memory store
    const inMem = memoryUsers.find((u) => u.email === cleanEmail);
    if (inMem) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Try MongoDB if active
    if (isMongoActive()) {
      try {
        const userExists = await User.findOne({ email: cleanEmail });
        if (userExists) {
          return res.status(400).json({ message: 'User already exists with this email' });
        }

        const user = await User.create({
          name,
          email: cleanEmail,
          password,
        });

        if (user) {
          return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: role || 'Fleet Charterer',
            token: generateToken(user._id),
          });
        }
      } catch (mongoErr) {
        console.warn('MongoDB register error, using in-memory fallback:', mongoErr.message);
      }
    }

    // Fallback in-memory registration
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = {
      _id: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: role || 'Fleet Charterer',
    };

    memoryUsers.push(newUser);

    return res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token: generateToken(newUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

export const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check in-memory demo & registered users first for instant response
    const memUser = memoryUsers.find((u) => u.email === cleanEmail);
    if (memUser && memUser.passwordHash) {
      const isMatch = await bcrypt.compare(password, memUser.passwordHash);
      if (isMatch) {
        return res.json({
          _id: memUser._id,
          name: memUser.name,
          email: memUser.email,
          role: memUser.role || 'Fleet Charterer',
          token: generateToken(memUser._id),
        });
      }
    }

    // 2. Check MongoDB if active
    if (isMongoActive()) {
      try {
        const user = await User.findOne({ email: cleanEmail });
        if (user && (await user.matchPassword(password))) {
          return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: 'Fleet Charterer',
            token: generateToken(user._id),
          });
        }
      } catch (mongoErr) {
        console.warn('MongoDB auth query bypassed:', mongoErr.message);
      }
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error during authentication' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    if (req.user) {
      return res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'Fleet Charterer',
      });
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error fetching profile' });
  }
};
