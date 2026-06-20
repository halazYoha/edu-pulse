import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Apply Admin restriction to all routes here
router.use(verifyToken);
router.use(requireRole(['admin']));

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

// @route   GET api/admin/users
// @desc    Get all users (with optional role filter and search query)
router.get('/users', async (req, res) => {
  const { role, search } = req.query;
  try {
    let query = 'SELECT id, name, email, role, phone, created_at FROM edupulse_users';
    const params = [];
    const conditions = [];

    if (role) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    if (search && search.trim()) {
      conditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`);
      params.push(`%${search.trim()}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';
    const usersRes = await pool.query(query, params);
    res.json(usersRes.rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// @route   GET api/admin/users/:id
// @desc    Get a single user by ID
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, created_at FROM edupulse_users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch single user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/admin/users
// @desc    Create a new user (with specific role logic)
router.post('/users', async (req, res) => {
  const { name, email, password, role, phone, class_id, roll_number, date_of_birth, student_id } = req.body;

  // Validation
  if (!name || !name.trim())     return res.status(400).json({ error: 'Full name is required' });
  if (!email || !email.trim())   return res.status(400).json({ error: 'Email address is required' });
  if (!password)                 return res.status(400).json({ error: 'Password is required' });
  if (password.length < 6)       return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!role)                     return res.status(400).json({ error: 'Role is required' });

  const validRoles = ['admin', 'teacher', 'student', 'parent'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check email uniqueness
    const existingUser = await client.query(
      'SELECT id FROM edupulse_users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const userRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, phone, created_at;
    `, [name.trim(), email.trim().toLowerCase(), hashedPassword, role, phone?.trim() || null]);

    const newUser = userRes.rows[0];

    // If role is Student, create student profile
    if (role === 'student') {
      // Validate class_id if provided
      if (class_id) {
        const classCheck = await client.query('SELECT id FROM edupulse_classes WHERE id = $1', [class_id]);
        if (classCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Selected class does not exist' });
        }
      }

      await client.query(`
        INSERT INTO edupulse_student_profiles (student_id, class_id, roll_number, date_of_birth)
        VALUES ($1, $2, $3, $4);
      `, [newUser.id, class_id || null, roll_number?.trim() || null, date_of_birth || null]);
    }

    // If role is Parent and student_id is provided, link them
    if (role === 'parent' && student_id) {
      const studentCheck = await client.query(
        "SELECT id FROM edupulse_users WHERE id = $1 AND role = 'student'",
        [student_id]
      );
      if (studentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Selected student does not exist' });
      }

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
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    res.status(500).json({ error: 'Server error creating user' });
  } finally {
    client.release();
  }
});

// @route   PUT api/admin/users/:id
// @desc    Update user details (name, phone, role only — not password)
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, role } = req.body;

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });

  const validRoles = ['admin', 'teacher', 'student', 'parent'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const fields = [];
    const params = [];

    if (name && name.trim()) { fields.push(`name = $${params.length + 1}`); params.push(name.trim()); }
    if (phone !== undefined) { fields.push(`phone = $${params.length + 1}`); params.push(phone?.trim() || null); }
    if (role) { fields.push(`role = $${params.length + 1}`); params.push(role); }

    if (fields.length === 0) return res.status(400).json({ error: 'No valid fields provided to update' });

    params.push(id);
    const result = await pool.query(
      `UPDATE edupulse_users SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id, name, email, role, phone`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });

  // Prevent admin from deleting themselves
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const checkRes = await pool.query('SELECT id FROM edupulse_users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query('DELETE FROM edupulse_users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// ─────────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────────

// @route   GET api/admin/classes
// @desc    Get all classes with teacher and student count
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
    res.status(500).json({ error: 'Server error fetching classes' });
  }
});

// @route   POST api/admin/classes
// @desc    Create a new class section
router.post('/classes', async (req, res) => {
  const { name, teacher_id, schedule } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Class name is required' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Class name must be at least 2 characters' });
  }

  try {
    // Validate teacher if provided
    if (teacher_id) {
      const teacherCheck = await pool.query(
        "SELECT id FROM edupulse_users WHERE id = $1 AND role = 'teacher'",
        [teacher_id]
      );
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Selected teacher does not exist' });
      }
    }

    // Check if class name already exists
    const existingClass = await pool.query(
      'SELECT id FROM edupulse_classes WHERE name ILIKE $1',
      [name.trim()]
    );
    if (existingClass.rows.length > 0) {
      return res.status(409).json({ error: 'A class with this name already exists' });
    }

    const defaultSchedule = schedule || {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
    };

    const classRes = await pool.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [name.trim(), teacher_id || null, JSON.stringify(defaultSchedule)]);

    res.status(201).json(classRes.rows[0]);
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Server error creating class' });
  }
});

// @route   PUT api/admin/classes/:id
// @desc    Update a class (name, teacher)
router.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, teacher_id } = req.body;

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid class ID' });

  try {
    const fields = [];
    const params = [];

    if (name && name.trim()) { fields.push(`name = $${params.length + 1}`); params.push(name.trim()); }
    if (teacher_id !== undefined) { fields.push(`teacher_id = $${params.length + 1}`); params.push(teacher_id || null); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields provided to update' });

    params.push(id);
    const result = await pool.query(
      `UPDATE edupulse_classes SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update class error:', err);
    res.status(500).json({ error: 'Server error updating class' });
  }
});

// @route   DELETE api/admin/classes/:id
// @desc    Delete a class
router.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid class ID' });

  try {
    const check = await pool.query('SELECT id FROM edupulse_classes WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Class not found' });

    await pool.query('DELETE FROM edupulse_classes WHERE id = $1', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error('Delete class error:', err);
    res.status(500).json({ error: 'Server error deleting class' });
  }
});

// ─────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────

// @route   GET api/admin/announcements
// @desc    Get all announcements
router.get('/announcements', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.name as author_name
      FROM edupulse_announcements a
      LEFT JOIN edupulse_users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch announcements error:', err);
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
});

// @route   POST api/admin/announcements
// @desc    Create an announcement
router.post('/announcements', async (req, res) => {
  const { title, content, target_role } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: 'Announcement title is required' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Announcement message is required' });

  if (title.trim().length < 3) return res.status(400).json({ error: 'Title must be at least 3 characters' });
  if (content.trim().length < 10) return res.status(400).json({ error: 'Message must be at least 10 characters' });

  const validTargets = ['all', 'teacher', 'student', 'parent'];
  const targetRoleValue = target_role || 'all';
  if (!validTargets.includes(targetRoleValue)) {
    return res.status(400).json({ error: `Invalid target role. Must be one of: ${validTargets.join(', ')}` });
  }

  try {
    const annRes = await pool.query(`
      INSERT INTO edupulse_announcements (title, content, target_role, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [title.trim(), content.trim(), targetRoleValue, req.user.id]);
    res.status(201).json(annRes.rows[0]);
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Server error posting announcement' });
  }
});

// @route   DELETE api/admin/announcements/:id
// @desc    Delete an announcement
router.delete('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid announcement ID' });

  try {
    const check = await pool.query('SELECT id FROM edupulse_announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });

    await pool.query('DELETE FROM edupulse_announcements WHERE id = $1', [id]);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: 'Server error deleting announcement' });
  }
});

// ─────────────────────────────────────────────
// FEES / INVOICES
// ─────────────────────────────────────────────

// @route   GET api/admin/fees
// @desc    Get all invoices (with optional status filter)
router.get('/fees', async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT f.*, u.name as student_name, c.name as class_name
      FROM edupulse_fees f
      JOIN edupulse_users u ON f.student_id = u.id
      LEFT JOIN edupulse_student_profiles sp ON sp.student_id = u.id
      LEFT JOIN edupulse_classes c ON sp.class_id = c.id
    `;
    const params = [];
    if (status && ['paid', 'pending'].includes(status)) {
      query += ' WHERE f.status = $1';
      params.push(status);
    }
    query += ' ORDER BY f.due_date DESC';

    const feesRes = await pool.query(query, params);
    res.json(feesRes.rows);
  } catch (err) {
    console.error('Fetch fees error:', err);
    res.status(500).json({ error: 'Server error fetching invoices' });
  }
});

// @route   POST api/admin/fees
// @desc    Create a fee invoice for a student
router.post('/fees', async (req, res) => {
  const { student_id, title, amount, due_date, payment_method } = req.body;

  if (!student_id) return res.status(400).json({ error: 'Please select a student' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'Invoice title is required' });
  if (!amount) return res.status(400).json({ error: 'Amount is required' });
  if (!due_date) return res.status(400).json({ error: 'Due date is required' });

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (parsedAmount > 1000000) {
    return res.status(400).json({ error: 'Amount cannot exceed 1,000,000' });
  }

  // Validate due date is not in the past
  const dueDate = new Date(due_date);
  if (isNaN(dueDate.getTime())) {
    return res.status(400).json({ error: 'Invalid due date format' });
  }

  // Validate payment method
  const validPaymentMethods = ['chappa', 'telebirr', 'cbe', 'cash', 'bank_transfer'];
  const selectedPaymentMethod = payment_method || 'chappa';
  if (!validPaymentMethods.includes(selectedPaymentMethod)) {
    return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` });
  }

  try {
    // Verify student exists
    const studentCheck = await pool.query(
      "SELECT id FROM edupulse_users WHERE id = $1 AND role = 'student'",
      [student_id]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Selected student does not exist' });
    }

    const feeRes = await pool.query(`
      INSERT INTO edupulse_fees (student_id, title, amount, status, due_date, payment_method)
      VALUES ($1, $2, $3, 'pending', $4, $5)
      RETURNING *;
    `, [student_id, title.trim(), parsedAmount, due_date, selectedPaymentMethod]);
    res.status(201).json(feeRes.rows[0]);
  } catch (err) {
    console.error('Create fee error:', err);
    res.status(500).json({ error: 'Server error creating invoice' });
  }
});

// @route   PUT api/admin/fees/:id/status
// @desc    Mark a fee as paid or pending
router.put('/fees/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid fee ID' });
  if (!status || !['paid', 'pending'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'paid' or 'pending'" });
  }

  try {
    const check = await pool.query('SELECT id FROM edupulse_fees WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

    const result = await pool.query(`
      UPDATE edupulse_fees
      SET status = $1, paid_date = $2
      WHERE id = $3
      RETURNING *;
    `, [status, status === 'paid' ? new Date() : null, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update fee status error:', err);
    res.status(500).json({ error: 'Server error updating invoice status' });
  }
});

// @route   DELETE api/admin/fees/:id
// @desc    Delete an invoice
router.delete('/fees/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid fee ID' });

  try {
    const check = await pool.query('SELECT id FROM edupulse_fees WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

    await pool.query('DELETE FROM edupulse_fees WHERE id = $1', [id]);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('Delete fee error:', err);
    res.status(500).json({ error: 'Server error deleting invoice' });
  }
});

// ─────────────────────────────────────────────
// SYSTEM SETTINGS
// ─────────────────────────────────────────────

// @route   GET api/admin/settings
// @desc    Get all settings (admin-only view)
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM edupulse_settings ORDER BY key ASC');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// @route   PUT api/admin/settings
// @desc    Update system settings (branding, currency, locale)
router.put('/settings', async (req, res) => {
  const settings = req.body;

  if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
    return res.status(400).json({ error: 'No settings provided to update' });
  }

  // Whitelist allowed setting keys
  const allowedKeys = ['school_name', 'currency', 'currency_symbol', 'country', 'timezone'];
  const invalidKeys = Object.keys(settings).filter(k => !allowedKeys.includes(k));
  if (invalidKeys.length > 0) {
    return res.status(400).json({ error: `Unknown setting keys: ${invalidKeys.join(', ')}` });
  }

  if (settings.school_name !== undefined && !settings.school_name.trim()) {
    return res.status(400).json({ error: 'School name cannot be empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined && val !== null) {
        await client.query(`
          INSERT INTO edupulse_settings (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `, [key, String(val).trim()]);
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update system settings' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────
// REPORTS / STATS
// ─────────────────────────────────────────────

// @route   GET api/admin/reports/summary
// @desc    Get a comprehensive summary report for admin overview
router.get('/reports/summary', async (req, res) => {
  try {
    const [students, teachers, admins, parents, classes, feePaid, feePending, attendance] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM edupulse_users WHERE role = 'student'"),
      pool.query("SELECT COUNT(*) FROM edupulse_users WHERE role = 'teacher'"),
      pool.query("SELECT COUNT(*) FROM edupulse_users WHERE role = 'admin'"),
      pool.query("SELECT COUNT(*) FROM edupulse_users WHERE role = 'parent'"),
      pool.query("SELECT COUNT(*) FROM edupulse_classes"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM edupulse_fees WHERE status = 'paid'"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM edupulse_fees WHERE status = 'pending'"),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
        FROM edupulse_attendance
      `)
    ]);

    res.json({
      users: {
        students: parseInt(students.rows[0].count),
        teachers: parseInt(teachers.rows[0].count),
        admins: parseInt(admins.rows[0].count),
        parents: parseInt(parents.rows[0].count),
        total: parseInt(students.rows[0].count) + parseInt(teachers.rows[0].count) + 
               parseInt(admins.rows[0].count) + parseInt(parents.rows[0].count)
      },
      classes: parseInt(classes.rows[0].count),
      finance: {
        collected: parseFloat(feePaid.rows[0].total),
        pending: parseFloat(feePending.rows[0].total),
        total: parseFloat(feePaid.rows[0].total) + parseFloat(feePending.rows[0].total)
      },
      attendance: {
        total: parseInt(attendance.rows[0].total || 0),
        present: parseInt(attendance.rows[0].present || 0),
        absent: parseInt(attendance.rows[0].absent || 0),
        rate: attendance.rows[0].total > 0
          ? Math.round((attendance.rows[0].present / attendance.rows[0].total) * 100)
          : 100
      }
    });
  } catch (err) {
    console.error('Summary report error:', err);
    res.status(500).json({ error: 'Server error generating report' });
  }
});

export default router;
