import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import axios from 'axios';

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
// @desc    Process a fee payment checkout with Chapa
router.post('/fees/:feeId/pay', async (req, res) => {
  const { feeId } = req.params;
  const { payment_method } = req.body; // 'cbe' or 'telebirr'

  try {
    // Verify that the fee invoice actually belongs to a student linked to this parent
    const feeCheck = await pool.query(`
      SELECT f.id, f.student_id, f.title, f.amount, u.name as student_name, u.email as student_email
      FROM edupulse_fees f
      JOIN edupulse_users u ON f.student_id = u.id
      JOIN edupulse_parents_students ps ON f.student_id = ps.student_id
      WHERE f.id = $1 AND ps.parent_id = $2
    `, [feeId, req.user.id]);

    if (feeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized payment. This fee invoice is not linked to your children.' });
    }

    const fee = feeCheck.rows[0];
    const parentName = req.user.name || 'Parent';
    const parentEmail = req.user.email;
    const [firstName, lastName] = parentName.split(' ');

    // Generate unique transaction reference
    const tx_ref = `edu-pulse-${feeId}-${Date.now()}`;

    // Prepare Chapa API request
    const chapaPayload = {
      amount: fee.amount.toString(),
      currency: 'ETB',
      email: parentEmail,
      first_name: firstName || 'Parent',
      last_name: lastName || 'User',
      phone_number: req.user.phone || '',
      tx_ref: tx_ref,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent/payments`,
      customization: {
        title: `School Fee Payment - ${fee.title}`,
        description: `Payment for ${fee.student_name}'s ${fee.title}`
      },
      meta: {
        fee_id: feeId.toString(),
        payment_method: payment_method,
        parent_id: req.user.id.toString()
      }
    };

    // Call Chapa API to initialize transaction
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      chapaPayload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update fee with transaction reference and payment method
    await pool.query(`
      UPDATE edupulse_fees 
      SET transaction_ref = $1, payment_method = $2
      WHERE id = $3
    `, [tx_ref, payment_method, feeId]);

    res.json({
      message: 'Payment initialized successfully',
      checkout_url: chapaResponse.data.data.checkout_url,
      tx_ref: tx_ref
    });

  } catch (err) {
    console.error('Chapa payment initialization error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Failed to initialize payment',
      details: err.response?.data || err.message 
    });
  }
});

// @route   GET api/parent/payment/verify/:tx_ref
// @desc    Verify Chapa transaction status
router.get('/payment/verify/:tx_ref', async (req, res) => {
  const { tx_ref } = req.params;

  try {
    const chapaResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`
        }
      }
    );

    const transactionData = chapaResponse.data.data;
    
    if (transactionData.status === 'success') {
      // Update fee status in database
      const feeId = transactionData.meta?.fee_id;
      if (feeId) {
        await pool.query(`
          UPDATE edupulse_fees 
          SET status = 'paid', paid_date = NOW()
          WHERE id = $1 AND transaction_ref = $2
        `, [feeId, tx_ref]);
      }
    }

    res.json({
      status: transactionData.status,
      data: transactionData
    });

  } catch (err) {
    console.error('Chapa verification error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Failed to verify transaction',
      details: err.response?.data || err.message 
    });
  }
});

// @route   POST api/parent/payment/webhook
// @desc    Handle Chapa webhook notifications
router.post('/payment/webhook', async (req, res) => {
  try {
    const { tx_ref, status, ref_id } = req.body;

    if (status === 'success') {
      // Verify transaction first
      const chapaResponse = await axios.get(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`
          }
        }
      );

      const transactionData = chapaResponse.data.data;
      const feeId = transactionData.meta?.fee_id;

      if (feeId && transactionData.status === 'success') {
        // Update fee status in database
        await pool.query(`
          UPDATE edupulse_fees 
          SET status = 'paid', paid_date = NOW()
          WHERE id = $1 AND transaction_ref = $2
        `, [feeId, tx_ref]);
      }
    }

    res.json({ message: 'Webhook received successfully' });
  } catch (err) {
    console.error('Chapa webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
