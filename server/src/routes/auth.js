import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    // Check if user exists
    const userRes = await pool.query('SELECT * FROM edupulse_users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Verify selected role matches database user's role
    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Access denied: The credentials provided do not belong to the ${role.charAt(0).toUpperCase() + role.slice(1)} portal.`
      });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'edupulse_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/auth/me
// @desc    Get current authenticated user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, name, email, role, phone FROM edupulse_users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userRes.rows[0]);
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
