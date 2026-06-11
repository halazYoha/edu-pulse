import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Apply Student restriction to all routes here
router.use(verifyToken);
router.use(requireRole(['student']));

// @route   GET api/student/grades
// @desc    Get student's own grades
router.get('/grades', async (req, res) => {
  try {
    const gradesRes = await pool.query(`
      SELECT id, subject, exam_name, marks_obtained, max_marks, date 
      FROM edupulse_grades 
      WHERE student_id = $1 
      ORDER BY date DESC
    `, [req.user.id]);
    res.json(gradesRes.rows);
  } catch (err) {
    console.error('Fetch student grades error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/student/attendance
// @desc    Get student's own attendance records
router.get('/attendance', async (req, res) => {
  try {
    const attendanceRes = await pool.query(`
      SELECT id, date, status 
      FROM edupulse_attendance 
      WHERE student_id = $1 
      ORDER BY date DESC
    `, [req.user.id]);
    res.json(attendanceRes.rows);
  } catch (err) {
    console.error('Fetch student attendance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/student/timetable
// @desc    Get student's class timetable
router.get('/timetable', async (req, res) => {
  try {
    const timetableRes = await pool.query(`
      SELECT c.id, c.name as class_name, c.schedule
      FROM edupulse_student_profiles sp
      JOIN edupulse_classes c ON sp.class_id = c.id
      WHERE sp.student_id = $1
    `, [req.user.id]);

    if (timetableRes.rows.length === 0) {
      return res.status(404).json({ error: 'No class assigned to this student.' });
    }
    res.json(timetableRes.rows[0]);
  } catch (err) {
    console.error('Fetch student timetable error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
