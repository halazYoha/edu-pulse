import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Apply Teacher restriction to all routes here
router.use(verifyToken);
router.use(requireRole(['teacher']));

// @route   GET api/teacher/students
// @desc    Get all students in classes assigned to this teacher
router.get('/students', async (req, res) => {
  try {
    const studentsRes = await pool.query(`
      SELECT u.id, u.name, u.email, sp.roll_number, sp.class_id, c.name as class_name
      FROM edupulse_users u
      JOIN edupulse_student_profiles sp ON sp.student_id = u.id
      JOIN edupulse_classes c ON sp.class_id = c.id
      WHERE c.teacher_id = $1
      ORDER BY c.name ASC, u.name ASC
    `, [req.user.id]);
    res.json(studentsRes.rows);
  } catch (err) {
    console.error('Fetch teacher students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/teacher/attendance
// @desc    Get attendance for a class on a specific date
router.get('/attendance', async (req, res) => {
  const { class_id, date } = req.query;

  if (!class_id || !date) {
    return res.status(400).json({ error: 'class_id and date are required parameters' });
  }

  try {
    // Check if class belongs to teacher
    const classCheck = await pool.query('SELECT id FROM edupulse_classes WHERE id = $1 AND teacher_id = $2', [class_id, req.user.id]);
    if (classCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden. You do not teach this class.' });
    }

    // Get attendance status for students in class
    const attendanceRes = await pool.query(`
      SELECT sp.student_id, u.name as student_name, sp.roll_number, att.status, att.date
      FROM edupulse_student_profiles sp
      JOIN edupulse_users u ON sp.student_id = u.id
      LEFT JOIN edupulse_attendance att ON att.student_id = sp.student_id AND att.date = $1
      WHERE sp.class_id = $2
      ORDER BY u.name ASC
    `, [date, class_id]);

    res.json(attendanceRes.rows);
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/teacher/attendance
// @desc    Mark attendance for a class (upsert)
router.post('/attendance', async (req, res) => {
  const { class_id, date, records } = req.body; // records: [{ student_id, status }]

  if (!class_id || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'class_id, date, and records (array) are required' });
  }

  try {
    // Check if class belongs to teacher
    const classCheck = await pool.query('SELECT id FROM edupulse_classes WHERE id = $1 AND teacher_id = $2', [class_id, req.user.id]);
    if (classCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden. You do not teach this class.' });
    }

    // Upsert attendance records
    for (const record of records) {
      const { student_id, status } = record;
      await pool.query(`
        INSERT INTO edupulse_attendance (student_id, class_id, date, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id, date) 
        DO UPDATE SET status = EXCLUDED.status;
      `, [student_id, class_id, date, status]);
    }

    res.json({ message: 'Attendance marked successfully' });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/teacher/grades
// @desc    Record/Update a student grade
router.post('/grades', async (req, res) => {
  const { student_id, subject, exam_name, marks_obtained, max_marks, date } = req.body;

  if (!student_id || !subject || !exam_name || !marks_obtained || !max_marks) {
    return res.status(400).json({ error: 'Please provide student_id, subject, exam_name, marks_obtained, and max_marks' });
  }

  try {
    // Verify teacher manages the class the student is in
    const studentClassCheck = await pool.query(`
      SELECT sp.class_id 
      FROM edupulse_student_profiles sp
      JOIN edupulse_classes c ON sp.class_id = c.id
      WHERE sp.student_id = $1 AND c.teacher_id = $2
    `, [student_id, req.user.id]);

    if (studentClassCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden. You do not teach this student.' });
    }

    const gradeRes = await pool.query(`
      INSERT INTO edupulse_grades (student_id, subject, exam_name, marks_obtained, max_marks, date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [student_id, subject, exam_name, marks_obtained, max_marks, date || new Date()]);

    res.status(201).json(gradeRes.rows[0]);
  } catch (err) {
    console.error('Record grade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/teacher/grades
// @desc    Get grades for a specific class & subject
router.get('/grades', async (req, res) => {
  const { class_id, subject } = req.query;

  if (!class_id) {
    return res.status(400).json({ error: 'class_id is required' });
  }

  try {
    // Check if class belongs to teacher
    const classCheck = await pool.query('SELECT id FROM edupulse_classes WHERE id = $1 AND teacher_id = $2', [class_id, req.user.id]);
    if (classCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden. You do not teach this class.' });
    }

    let query = `
      SELECT g.*, u.name as student_name, sp.roll_number
      FROM edupulse_student_profiles sp
      JOIN edupulse_users u ON sp.student_id = u.id
      LEFT JOIN edupulse_grades g ON g.student_id = sp.student_id
      WHERE sp.class_id = $1
    `;
    const params = [class_id];

    if (subject) {
      query += ' AND g.subject = $2';
      params.push(subject);
    }

    query += ' ORDER BY u.name ASC, g.date DESC';

    const gradesRes = await pool.query(query, params);
    res.json(gradesRes.rows);
  } catch (err) {
    console.error('Fetch class grades error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
