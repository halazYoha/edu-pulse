import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Apply Admin restriction to all routes here
router.use(verifyToken);
router.use(requireRole(['admin']));

// @route   GET api/admin/users
// @desc    Get all users (with optional role filter)
router.get('/users', async (req, res) => {
  const { role } = req.query;
  try {
    let query = 'SELECT id, name, email, role, phone, created_at FROM edupulse_users';
    const params = [];
    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }
    query += ' ORDER BY name ASC';
    const usersRes = await pool.query(query, params);
    res.json(usersRes.rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/admin/users
// @desc    Create a new user (with specific role logic)
router.post('/users', async (req, res) => {
  const { name, email, password, role, phone, class_id, roll_number, date_of_birth, student_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Please provide all required fields (name, email, password, role)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const userRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, phone;
    `, [name, email, hashedPassword, role, phone]);
    
    const newUser = userRes.rows[0];

    // If role is Student, create student profile
    if (role === 'student') {
      await client.query(`
        INSERT INTO edupulse_student_profiles (student_id, class_id, roll_number, date_of_birth)
        VALUES ($1, $2, $3, $4);
      `, [newUser.id, class_id || null, roll_number || null, date_of_birth || null]);
    }

    // If role is Parent and student_id is provided, link them
    if (role === 'parent' && student_id) {
      await client.query(`
        INSERT INTO edupulse_parents_students (parent_id, student_id)
        VALUES ($1, $2);
      `, [newUser.id, student_id]);
    }

    await client.query('COMMIT');
    res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create user error:', err);
    if (err.code === '23505') { // Unique constraint violation (email)
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM edupulse_users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/admin/classes
// @desc    Get all classes
router.get('/classes', async (req, res) => {
  try {
    const classesRes = await pool.query(`
      SELECT c.id, c.name, c.schedule, c.teacher_id, u.name as teacher_name,
             (SELECT COUNT(*) FROM edupulse_student_profiles WHERE class_id = c.id) as student_count
      FROM edupulse_classes c
      LEFT JOIN edupulse_users u ON c.teacher_id = u.id
      ORDER BY c.name ASC
    `);
    res.json(classesRes.rows);
  } catch (err) {
    console.error('Fetch classes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/admin/classes
// @desc    Create a new class
router.post('/classes', async (req, res) => {
  const { name, teacher_id, schedule } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Class name is required' });
  }

  try {
    const defaultSchedule = schedule || {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
    };

    const classRes = await pool.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [name, teacher_id || null, JSON.stringify(defaultSchedule)]);
    
    res.status(201).json(classRes.rows[0]);
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/admin/announcements
// @desc    Create an announcement
router.post('/announcements', async (req, res) => {
  const { title, content, target_role } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const annRes = await pool.query(`
      INSERT INTO edupulse_announcements (title, content, target_role, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [title, content, target_role || 'all', req.user.id]);
    res.status(201).json(annRes.rows[0]);
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/admin/fees
// @desc    Get all invoices
router.get('/fees', async (req, res) => {
  try {
    const feesRes = await pool.query(`
      SELECT f.*, u.name as student_name, c.name as class_name
      FROM edupulse_fees f
      JOIN edupulse_users u ON f.student_id = u.id
      LEFT JOIN edupulse_student_profiles sp ON sp.student_id = u.id
      LEFT JOIN edupulse_classes c ON sp.class_id = c.id
      ORDER BY f.due_date DESC
    `);
    res.json(feesRes.rows);
  } catch (err) {
    console.error('Fetch fees error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/admin/fees
// @desc    Create a fee invoice for a student
router.post('/fees', async (req, res) => {
  const { student_id, title, amount, due_date } = req.body;

  if (!student_id || !title || !amount || !due_date) {
    return res.status(400).json({ error: 'Please provide student_id, title, amount, and due_date' });
  }

  try {
    const feeRes = await pool.query(`
      INSERT INTO edupulse_fees (student_id, title, amount, status, due_date)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *;
    `, [student_id, title, amount, due_date]);
    res.status(201).json(feeRes.rows[0]);
  } catch (err) {
    console.error('Create fee error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
