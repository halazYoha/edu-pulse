import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Apply Parent restriction to all routes here
router.use(verifyToken);
router.use(requireRole(['parent']));

// @route   GET api/parent/children
// @desc    Get detailed profiles, grades, attendance, and timetables of parent's children
router.get('/children', async (req, res) => {
  try {
    const childrenRes = await pool.query(`
      SELECT u.id, u.name, u.email, sp.roll_number, c.name as class_name, c.schedule
      FROM edupulse_parents_students ps
      JOIN edupulse_users u ON ps.student_id = u.id
      JOIN edupulse_student_profiles sp ON sp.student_id = u.id
      LEFT JOIN edupulse_classes c ON sp.class_id = c.id
      WHERE ps.parent_id = $1
    `, [req.user.id]);

    const childrenData = [];
    for (const child of childrenRes.rows) {
      // Fetch attendance
      const attendance = await pool.query(`
        SELECT date, status FROM edupulse_attendance 
        WHERE student_id = $1 ORDER BY date DESC
      `, [child.id]);

      // Fetch grades
      const grades = await pool.query(`
        SELECT subject, exam_name, marks_obtained, max_marks, date 
        FROM edupulse_grades WHERE student_id = $1 ORDER BY date DESC
      `, [child.id]);

      // Fetch fees invoices
      const fees = await pool.query(`
        SELECT id, title, amount, status, due_date, paid_date 
        FROM edupulse_fees WHERE student_id = $1 ORDER BY due_date ASC
      `, [child.id]);

      childrenData.push({
        ...child,
        attendance: attendance.rows,
        grades: grades.rows,
        fees: fees.rows
      });
    }

    res.json(childrenData);
  } catch (err) {
    console.error('Fetch children data error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/parent/fees/:feeId/pay
// @desc    Process a mock fee payment checkout
router.post('/fees/:feeId/pay', async (req, res) => {
  const { feeId } = req.params;

  try {
    // Verify that the fee invoice actually belongs to a student linked to this parent
    const feeCheck = await pool.query(`
      SELECT f.id, f.student_id 
      FROM edupulse_fees f
      JOIN edupulse_parents_students ps ON f.student_id = ps.student_id
      WHERE f.id = $1 AND ps.parent_id = $2
    `, [feeId, req.user.id]);

    if (feeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized payment. This fee invoice is not linked to your children.' });
    }

    // Process mock payment update
    const updatedFee = await pool.query(`
      UPDATE edupulse_fees 
      SET status = 'paid', paid_date = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *;
    `, [feeId]);

    if (updatedFee.rows.length === 0) {
      return res.status(400).json({ error: 'Invoice has already been paid or does not exist.' });
    }

    res.json({ message: 'Payment processed successfully!', invoice: updatedFee.rows[0] });
  } catch (err) {
    console.error('Payment checkout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
