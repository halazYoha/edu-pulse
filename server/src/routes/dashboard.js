import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

// @route   GET api/dashboard
// @desc    Get dashboard metrics & data based on user role
router.get('/', verifyToken, async (req, res) => {
  const { id, role } = req.user;

  try {
    const data = {};

    // Map role to the target_role column value used in announcements
    // admin sees all announcements; others see 'all' + their specific group
    const roleToTarget = { student: 'students', teacher: 'teachers', parent: 'parents', admin: 'all' };
    const targetRole = roleToTarget[role] || 'all';

    const announcementsRes = await pool.query(`
      SELECT a.*, u.name as author_name 
      FROM edupulse_announcements a 
      LEFT JOIN edupulse_users u ON a.created_by = u.id 
      WHERE a.target_role = 'all' OR a.target_role = $1 
      ORDER BY a.created_at DESC LIMIT 5
    `, [targetRole]);
    data.announcements = announcementsRes.rows;

    if (role === 'admin') {
      // Students count
      const studentsCount = await pool.query("SELECT COUNT(*) FROM edupulse_users WHERE role = 'student'");
      data.totalStudents = parseInt(studentsCount.rows[0].count);

      // Teachers count
      const teachersCount = await pool.query("SELECT COUNT(*) FROM edupulse_users WHERE role = 'teacher'");
      data.totalTeachers = parseInt(teachersCount.rows[0].count);

      // Classes count
      const classesCount = await pool.query("SELECT COUNT(*) FROM edupulse_classes");
      data.totalClasses = parseInt(classesCount.rows[0].count);

      // Fees stats
      const feeStats = await pool.query(`
        SELECT 
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as collected,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending
        FROM edupulse_fees
      `);
      data.finance = {
        collected: parseFloat(feeStats.rows[0].collected || 0),
        pending: parseFloat(feeStats.rows[0].pending || 0)
      };

      // Recent users list
      const recentUsers = await pool.query(`
        SELECT id, name, email, role, created_at 
        FROM edupulse_users 
        ORDER BY created_at DESC LIMIT 5
      `);
      data.recentUsers = recentUsers.rows;

    } else if (role === 'teacher') {
      // Classes this teacher manages
      const classesRes = await pool.query(`
        SELECT c.id, c.name, c.schedule, 
               (SELECT COUNT(*) FROM edupulse_student_profiles WHERE class_id = c.id) as student_count
        FROM edupulse_classes c
        WHERE c.teacher_id = $1
      `, [id]);
      data.myClasses = classesRes.rows;

      // Calculate total students under this teacher
      data.totalMyStudents = classesRes.rows.reduce((sum, cls) => sum + parseInt(cls.student_count), 0);

      // Recent grades entered
      const recentGrades = await pool.query(`
        SELECT g.*, u.name as student_name 
        FROM edupulse_grades g
        JOIN edupulse_users u ON g.student_id = u.id
        JOIN edupulse_student_profiles sp ON sp.student_id = u.id
        JOIN edupulse_classes c ON sp.class_id = c.id
        WHERE c.teacher_id = $1
        ORDER BY g.date DESC LIMIT 5
      `, [id]);
      data.recentGrades = recentGrades.rows;

    } else if (role === 'student') {
      // Get student profile & class details
      const profileRes = await pool.query(`
        SELECT sp.*, c.name as class_name, c.schedule, u.name as class_teacher
        FROM edupulse_student_profiles sp
        LEFT JOIN edupulse_classes c ON sp.class_id = c.id
        LEFT JOIN edupulse_users u ON c.teacher_id = u.id
        WHERE sp.student_id = $1
      `, [id]);

      if (profileRes.rows.length > 0) {
        data.profile = profileRes.rows[0];
      }

      // Calculate Attendance stats
      const attStats = await pool.query(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
        FROM edupulse_attendance
        WHERE student_id = $1
      `, [id]);
      
      const total = parseInt(attStats.rows[0].total_days || 0);
      const present = parseInt(attStats.rows[0].present_days || 0);
      const late = parseInt(attStats.rows[0].late_days || 0);
      
      data.attendance = {
        totalDays: total,
        presentDays: present,
        lateDays: late,
        percentage: total > 0 ? Math.round(((present + (late * 0.5)) / total) * 100) : 100
      };

      // Grades average and record
      const gradesRes = await pool.query(`
        SELECT id, subject, exam_name, marks_obtained, max_marks, date 
        FROM edupulse_grades 
        WHERE student_id = $1 
        ORDER BY date DESC
      `, [id]);
      data.grades = gradesRes.rows;
      
      const avgGrade = gradesRes.rows.length > 0
        ? gradesRes.rows.reduce((sum, g) => sum + (parseFloat(g.marks_obtained) / parseFloat(g.max_marks) * 100), 0) / gradesRes.rows.length
        : 90.0; // Default placeholder for dashboard look
      data.gpaAverage = Math.round(avgGrade * 10) / 10;

      // Fees due
      const feesRes = await pool.query(`
        SELECT * FROM edupulse_fees 
        WHERE student_id = $1 
        ORDER BY due_date ASC
      `, [id]);
      data.fees = feesRes.rows;

    } else if (role === 'parent') {
      // Find children linked to parent
      const childrenRes = await pool.query(`
        SELECT u.id, u.name, u.email, sp.roll_number, c.name as class_name, c.schedule
        FROM edupulse_parents_students ps
        JOIN edupulse_users u ON ps.student_id = u.id
        JOIN edupulse_student_profiles sp ON sp.student_id = u.id
        LEFT JOIN edupulse_classes c ON sp.class_id = c.id
        WHERE ps.parent_id = $1
      `, [id]);

      const children = [];
      for (const child of childrenRes.rows) {
        // Attendance stats
        const attStats = await pool.query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
          FROM edupulse_attendance
          WHERE student_id = $1
        `, [child.id]);
        const total = parseInt(attStats.rows[0].total_days || 0);
        const present = parseInt(attStats.rows[0].present_days || 0);
        const late = parseInt(attStats.rows[0].late_days || 0);

        // Attendance records (for the table)
        const attRecordsRes = await pool.query(`
          SELECT date, status 
          FROM edupulse_attendance 
          WHERE student_id = $1 
          ORDER BY date DESC
        `, [child.id]);
        
        // Grades
        const gradesRes = await pool.query(`
          SELECT id, subject, exam_name, marks_obtained, max_marks, date 
          FROM edupulse_grades 
          WHERE student_id = $1
        `, [child.id]);

        const avgGrade = gradesRes.rows.length > 0
          ? gradesRes.rows.reduce((sum, g) => sum + (parseFloat(g.marks_obtained) / parseFloat(g.max_marks) * 100), 0) / gradesRes.rows.length
          : 85.0;

        // Fees
        const feesRes = await pool.query(`
          SELECT * FROM edupulse_fees 
          WHERE student_id = $1 
          ORDER BY due_date ASC
        `, [child.id]);

        children.push({
          ...child,
          attendance: {
            percentage: total > 0 ? Math.round(((present + (late * 0.5)) / total) * 100) : 100,
            records: attRecordsRes.rows
          },
          grades: gradesRes.rows,
          gpaAverage: Math.round(avgGrade * 10) / 10,
          fees: feesRes.rows
        });
      }
      
      data.children = children;
    }

    res.json(data);
  } catch (err) {
    console.error('Fetch dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
