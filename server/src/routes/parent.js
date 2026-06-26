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
  const { payment_method } = req.body;

  try {
    // Verify that the fee belongs to a child of this parent AND is still pending
    const feeCheck = await pool.query(`
      SELECT f.id, f.student_id, f.title, f.amount, f.status,
             u.name as student_name, u.email as student_email
      FROM edupulse_fees f
      JOIN edupulse_users u ON f.student_id = u.id
      JOIN edupulse_parents_students ps ON f.student_id = ps.student_id
      WHERE f.id = $1 AND ps.parent_id = $2
    `, [feeId, req.user.id]);

    if (feeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized: This invoice is not linked to your children.' });
    }

    const fee = feeCheck.rows[0];

    if (fee.status === 'paid') {
      return res.status(400).json({ error: 'This invoice has already been paid.' });
    }

    const parentName = req.user.name || 'Parent User';
    const nameParts = parentName.trim().split(' ');
    const firstName = nameParts[0] || 'Parent';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Sanitize phone to Ethiopian 10-digit format (09xxxxxxxx / 07xxxxxxxx)
    // Chapa rejects non-Ethiopian phone formats; use a safe test fallback
    const rawPhone = req.user.phone || '';
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const chapaPhone = digitsOnly.length === 10 && (digitsOnly.startsWith('09') || digitsOnly.startsWith('07'))
      ? digitsOnly
      : '0900123456'; // Chapa test number fallback

    // Generate unique transaction reference
    const tx_ref = `edu-${feeId}-${req.user.id}-${Date.now()}`;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const chapaPayload = {
      amount: parseFloat(fee.amount).toFixed(2),
      currency: 'ETB',
      email: req.user.email,
      first_name: firstName,
      last_name: lastName,
      phone_number: chapaPhone,
      tx_ref,
      // callback_url: Chapa POSTs here after payment (server-to-server) - not reachable in dev
      // return_url: Chapa redirects user's browser here after payment
      return_url: `${frontendUrl}/payment/callback?tx_ref=${tx_ref}&fee_id=${feeId}`,
      customization: {
        title: 'School Fee',
        description: `Payment for ${fee.student_name} - ${fee.title}`.replace(/[^a-zA-Z0-9.\-_ ]/g, '')
      },
      meta: {
        fee_id: String(feeId),
        parent_id: String(req.user.id),
        payment_method: payment_method || 'chappa'
      }
    };

    // Call Chapa to initialize the transaction
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      chapaPayload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (!chapaResponse.data?.data?.checkout_url) {
      throw new Error('Chapa did not return a checkout URL');
    }

    // Save the transaction reference so we can verify it later
    await pool.query(`
      UPDATE edupulse_fees 
      SET transaction_ref = $1, payment_method = $2
      WHERE id = $3
    `, [tx_ref, payment_method || 'chappa', feeId]);

    res.json({
      message: 'Payment session initialized',
      checkout_url: chapaResponse.data.data.checkout_url,
      tx_ref
    });

  } catch (err) {
    const chapaError = err.response?.data;
    console.error('Chapa initialization error:', chapaError || err.message);
    res.status(500).json({
      error: chapaError?.message || 'Failed to initialize payment. Please try again.',
      details: chapaError || err.message
    });
  }
});


// @route   GET api/parent/payment/verify/:tx_ref
// @desc    Verify Chapa transaction status and mark fee as paid
router.get('/payment/verify/:tx_ref', async (req, res) => {
  const { tx_ref } = req.params;

  try {
    // First look up the fee from OUR database using the tx_ref (safe, no Chapa needed yet)
    const localFeeRes = await pool.query(`
      SELECT f.id, f.title, f.amount, f.status, f.student_id,
             u.name as student_name
      FROM edupulse_fees f
      JOIN edupulse_users u ON f.student_id = u.id
      WHERE f.transaction_ref = $1
    `, [tx_ref]);

    // Verify with Chapa
    const chapaResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: { 'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}` },
        timeout: 15000
      }
    );

    const transactionData = chapaResponse.data.data;
    const chapaStatus = transactionData.status; // 'success' | 'failed' | 'pending'

    // Determine fee ID — prefer our local record (most reliable)
    const localFee = localFeeRes.rows[0];
    const feeId = localFee?.id || transactionData.meta?.fee_id;

    if (chapaStatus === 'success' && feeId) {
      // Idempotent update — only marks paid if not already paid
      await pool.query(`
        UPDATE edupulse_fees 
        SET status = 'paid', paid_date = NOW()
        WHERE id = $1 AND transaction_ref = $2 AND status = 'pending'
      `, [feeId, tx_ref]);
    }

    res.json({
      status: chapaStatus,
      tx_ref,
      fee: localFee || null,
      transaction: {
        ref_id: transactionData.reference,
        amount: transactionData.amount,
        currency: transactionData.currency,
        payment_method: transactionData.payment_method
      }
    });

  } catch (err) {
    const chapaError = err.response?.data;
    console.error('Chapa verification error:', chapaError || err.message);
    res.status(500).json({
      error: 'Failed to verify transaction. Please contact support if your payment was deducted.',
      details: chapaError || err.message
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
