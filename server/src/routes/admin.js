import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Apply Admin restriction to all routes here
router.use(verifyToken);
router.use(requireRole(['admin', 'super_admin']));

// Activity logging helper
const logActivity = async (userId, action, details, req) => {
  try {
    const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || null;
    await pool.query(
      'INSERT INTO edupulse_activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, action, details, ip]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// ─────────────────────────────────────────────
// ACADEMIC STRUCTURES
// ─────────────────────────────────────────────

// Get Academic Years
router.get('/academic-years', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edupulse_academic_years ORDER BY name DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch academic years' });
  }
});

// Create Academic Year
router.post('/academic-years', async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    if (status === 'active') {
      // Deactivate other years first
      await pool.query("UPDATE edupulse_academic_years SET status = 'inactive'");
    }
    const result = await pool.query(
      'INSERT INTO edupulse_academic_years (name, status) VALUES ($1, $2) RETURNING *',
      [name, status || 'inactive']
    );
    await logActivity(req.user.id, 'Create Academic Year', `Created academic year ${name}`, req);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create academic year' });
  }
});

// Update Academic Year
router.put('/academic-years/:id', async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  try {
    if (status === 'active') {
      await pool.query("UPDATE edupulse_academic_years SET status = 'inactive'");
    }
    const result = await pool.query(
      'UPDATE edupulse_academic_years SET name = $1, status = $2 WHERE id = $3 RETURNING *',
      [name, status, id]
    );
    await logActivity(req.user.id, 'Update Academic Year', `Updated academic year to ${name} (${status})`, req);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update academic year' });
  }
});

// Delete Academic Year
router.delete('/academic-years/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT name FROM edupulse_academic_years WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Academic year not found' });
    await pool.query('DELETE FROM edupulse_academic_years WHERE id = $1', [id]);
    await logActivity(req.user.id, 'Delete Academic Year', `Deleted academic year ${check.rows[0].name}`, req);
    res.json({ message: 'Academic year deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete academic year' });
  }
});

// Get Terms
router.get('/terms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, ay.name as academic_year_name 
      FROM edupulse_terms t
      JOIN edupulse_academic_years ay ON t.academic_year_id = ay.id
      ORDER BY ay.name DESC, t.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

// Create Term
router.post('/terms', async (req, res) => {
  const { academic_year_id, name, status } = req.body;
  if (!academic_year_id || !name) return res.status(400).json({ error: 'Academic year and name are required' });
  try {
    if (status === 'active') {
      await pool.query("UPDATE edupulse_terms SET status = 'inactive' WHERE academic_year_id = $1", [academic_year_id]);
    }
    const result = await pool.query(
      'INSERT INTO edupulse_terms (academic_year_id, name, status) VALUES ($1, $2, $3) RETURNING *',
      [academic_year_id, name, status || 'inactive']
    );
    await logActivity(req.user.id, 'Create Term', `Created term ${name} for academic year ID ${academic_year_id}`, req);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create term' });
  }
});

// Update Term
router.put('/terms/:id', async (req, res) => {
  const { id } = req.params;
  const { academic_year_id, name, status } = req.body;
  try {
    if (status === 'active') {
      await pool.query("UPDATE edupulse_terms SET status = 'inactive' WHERE academic_year_id = $1", [academic_year_id]);
    }
    const result = await pool.query(
      'UPDATE edupulse_terms SET name = $1, status = $2, academic_year_id = $3 WHERE id = $4 RETURNING *',
      [name, status, academic_year_id, id]
    );
    await logActivity(req.user.id, 'Update Term', `Updated term to ${name} (${status})`, req);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update term' });
  }
});

// Delete Term
router.delete('/terms/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT name FROM edupulse_terms WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Term not found' });
    await pool.query('DELETE FROM edupulse_terms WHERE id = $1', [id]);
    await logActivity(req.user.id, 'Delete Term', `Deleted term ${check.rows[0].name}`, req);
    res.json({ message: 'Term deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

// Get Grades List
router.get('/grades-list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edupulse_grades_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grades list' });
  }
});

// Create Grade List Item
router.post('/grades-list', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Grade name is required' });
  try {
    const result = await pool.query('INSERT INTO edupulse_grades_list (name) VALUES ($1) RETURNING *', [name]);
    await logActivity(req.user.id, 'Create Grade/Class', `Created grade/class level ${name}`, req);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create grade' });
  }
});

// Update Grade List Item
router.put('/grades-list/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query('UPDATE edupulse_grades_list SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// Delete Grade List Item
router.delete('/grades-list/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM edupulse_grades_list WHERE id = $1', [id]);
    res.json({ message: 'Grade deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
});

// Get Subjects
router.get('/subjects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edupulse_subjects ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Create Subject
router.post('/subjects', async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });
  try {
    const result = await pool.query('INSERT INTO edupulse_subjects (name, code) VALUES ($1, $2) RETURNING *', [name, code]);
    await logActivity(req.user.id, 'Create Subject', `Created subject ${name} (${code})`, req);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Update Subject
router.put('/subjects/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  try {
    const result = await pool.query('UPDATE edupulse_subjects SET name = $1, code = $2 WHERE id = $3 RETURNING *', [name, code, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete Subject
router.delete('/subjects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM edupulse_subjects WHERE id = $1', [id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});


// ─────────────────────────────────────────────
// USER MANAGEMENT & DIRECTORY
// ─────────────────────────────────────────────

// Get all users (detailed profile information depending on role)
router.get('/users', async (req, res) => {
  const { role, search } = req.query;
  try {
    let query = `
      SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.created_at,
             sp.roll_number, sp.date_of_birth, sp.admission_number, sp.admission_date, sp.gender as student_gender, sp.address, sp.previous_school,
             sp.father_name, sp.father_phone, sp.father_email, sp.father_occupation,
             sp.mother_name, sp.mother_phone, sp.mother_email, sp.mother_occupation,
             sp.guardian_name, sp.guardian_phone, sp.guardian_email, sp.guardian_relation,
             tp.employee_id as teacher_employee_id, tp.gender as teacher_gender, tp.qualification, tp.department as teacher_department, tp.joining_date as teacher_joining_date,
             stp.employee_id as staff_employee_id, stp.department as staff_department, stp.position as staff_position,
             c.name as class_name, c.id as class_id
      FROM edupulse_users u
      LEFT JOIN edupulse_student_profiles sp ON u.id = sp.student_id
      LEFT JOIN edupulse_classes c ON sp.class_id = c.id
      LEFT JOIN edupulse_teacher_profiles tp ON u.id = tp.teacher_id
      LEFT JOIN edupulse_staff_profiles stp ON u.id = stp.staff_id
    `;
    const params = [];
    const conditions = [];

    if (role && role !== 'all') {
      // Special staff filter to check multiple staff-like roles
      if (role === 'staff') {
        conditions.push(`u.role IN ('accountant', 'librarian', 'receptionist', 'security', 'driver', 'cashier')`);
      } else {
        conditions.push(`u.role = $${params.length + 1}`);
        params.push(role);
      }
    }
    if (search && search.trim()) {
      conditions.push(`(u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1} OR sp.admission_number ILIKE $${params.length + 1} OR tp.employee_id ILIKE $${params.length + 1})`);
      params.push(`%${search.trim()}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.name ASC';
    const usersRes = await pool.query(query, params);
    let users = usersRes.rows;

    // Fetch children links if role includes parents
    if (!role || role === 'all' || role === 'parent') {
      const parentChildRes = await pool.query(`
        SELECT ps.parent_id, u.id as child_id, u.name as child_name, c.name as class_name
        FROM edupulse_parents_students ps
        JOIN edupulse_users u ON ps.student_id = u.id
        LEFT JOIN edupulse_student_profiles sp ON u.id = sp.student_id
        LEFT JOIN edupulse_classes c ON sp.class_id = c.id
      `);
      
      const childrenMap = {};
      parentChildRes.rows.forEach(row => {
        if (!childrenMap[row.parent_id]) childrenMap[row.parent_id] = [];
        childrenMap[row.parent_id].push({ id: row.child_id, name: row.child_name, class: row.class_name });
      });

      users = users.map(u => {
        if (u.role === 'parent') {
          return { ...u, children: childrenMap[u.id] || [] };
        }
        return u;
      });
    }

    res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// GET Single User detailed
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.created_at,
             sp.roll_number, sp.date_of_birth, sp.admission_number, sp.admission_date, sp.gender as student_gender, sp.address, sp.previous_school,
             sp.father_name, sp.father_phone, sp.father_email, sp.father_occupation,
             sp.mother_name, sp.mother_phone, sp.mother_email, sp.mother_occupation,
             sp.guardian_name, sp.guardian_phone, sp.guardian_email, sp.guardian_relation,
             tp.employee_id as teacher_employee_id, tp.gender as teacher_gender, tp.qualification, tp.department as teacher_department, tp.joining_date as teacher_joining_date,
             stp.employee_id as staff_employee_id, stp.department as staff_department, stp.position as staff_position,
             c.name as class_name, c.id as class_id
      FROM edupulse_users u
      LEFT JOIN edupulse_student_profiles sp ON u.id = sp.student_id
      LEFT JOIN edupulse_classes c ON sp.class_id = c.id
      LEFT JOIN edupulse_teacher_profiles tp ON u.id = tp.teacher_id
      LEFT JOIN edupulse_staff_profiles stp ON u.id = stp.staff_id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    let user = result.rows[0];

    if (user.role === 'parent') {
      const childs = await pool.query(`
        SELECT u.id, u.name, u.email, c.name as class_name
        FROM edupulse_parents_students ps
        JOIN edupulse_users u ON ps.student_id = u.id
        LEFT JOIN edupulse_student_profiles sp ON u.id = sp.student_id
        LEFT JOIN edupulse_classes c ON sp.class_id = c.id
        WHERE ps.parent_id = $1
      `, [id]);
      user.children = childs.rows;
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching user details' });
  }
});

// Student New Admission (handles student account, parent account, linking, profiles)
router.post('/admissions', async (req, res) => {
  const {
    studentName, dob, gender, address, previousSchool, classId, rollNumber,
    // Parent info
    parentType, // 'father', 'mother', 'guardian'
    parentName, parentPhone, parentEmail, parentOccupation
  } = req.body;

  if (!studentName || !classId) {
    return res.status(400).json({ error: 'Student Name and Class are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Generate unique student admission number
    const countRes = await client.query('SELECT COUNT(*) FROM edupulse_student_profiles');
    const count = parseInt(countRes.rows[0].count) + 1;
    const currentYear = new Date().getFullYear();
    const admissionNumber = `STU-${currentYear}-${String(count).padStart(4, '0')}`;
    const studentEmail = `student.${admissionNumber.toLowerCase().replace(/-/g, '')}@edupulse.com`;

    // 2. Generate unique parent admission/account number
    const parentAdmissionNum = `PAR-${currentYear}-${String(count).padStart(4, '0')}`;
    const parentEmailAddress = parentEmail?.trim() || `parent.${parentAdmissionNum.toLowerCase().replace(/-/g, '')}@edupulse.com`;

    // 3. Create/Link Parent Account
    let parentId = null;
    const parentCheck = await client.query('SELECT id FROM edupulse_users WHERE email = $1', [parentEmailAddress.toLowerCase()]);
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    if (parentCheck.rows.length > 0) {
      parentId = parentCheck.rows[0].id;
    } else {
      const parentUserRes = await client.query(`
        INSERT INTO edupulse_users (name, email, password, role, phone, status)
        VALUES ($1, $2, $3, 'parent', $4, 'active')
        RETURNING id
      `, [parentName || `${studentName} Parent`, parentEmailAddress.toLowerCase(), defaultPasswordHash, parentPhone || null]);
      parentId = parentUserRes.rows[0].id;
    }

    // 4. Create Student Account
    const studentUserRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ($1, $2, $3, 'student', $4, 'active')
      RETURNING id
    `, [studentName, studentEmail, defaultPasswordHash, null]);
    const studentId = studentUserRes.rows[0].id;

    // 5. Link Parent & Student
    await client.query(`
      INSERT INTO edupulse_parents_students (parent_id, student_id)
      VALUES ($1, $2)
    `, [parentId, studentId]);

    // 6. Create Student Profile with Father, Mother, Guardian fields
    const fatherField = parentType === 'father' ? parentName : '';
    const fatherPhoneField = parentType === 'father' ? parentPhone : '';
    const fatherEmailField = parentType === 'father' ? parentEmailAddress : '';
    const fatherOccField = parentType === 'father' ? parentOccupation : '';

    const motherField = parentType === 'mother' ? parentName : '';
    const motherPhoneField = parentType === 'mother' ? parentPhone : '';
    const motherEmailField = parentType === 'mother' ? parentEmailAddress : '';
    const motherOccField = parentType === 'mother' ? parentOccupation : '';

    const guardianField = parentType === 'guardian' ? parentName : '';
    const guardianPhoneField = parentType === 'guardian' ? parentPhone : '';
    const guardianEmailField = parentType === 'guardian' ? parentEmailAddress : '';
    const guardianRelField = parentType === 'guardian' ? 'Guardian' : '';

    await client.query(`
      INSERT INTO edupulse_student_profiles (
        student_id, class_id, roll_number, date_of_birth, admission_number, gender, address, previous_school,
        father_name, father_phone, father_email, father_occupation,
        mother_name, mother_phone, mother_email, mother_occupation,
        guardian_name, guardian_phone, guardian_email, guardian_relation
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      studentId, classId, rollNumber || `R${String(count).padStart(3, '0')}`, dob || null, admissionNumber, gender || 'other', address || '', previousSchool || '',
      fatherField, fatherPhoneField, fatherEmailField, fatherOccField,
      motherField, motherPhoneField, motherEmailField, motherOccField,
      guardianField, guardianPhoneField, guardianEmailField, guardianRelField
    ]);

    await logActivity(req.user.id, 'New Admission', `Admitted Student ${studentName} (${admissionNumber}) and Parent ID ${parentId}`, req);
    
    await client.query('COMMIT');
    res.status(201).json({
      message: 'Admission successful',
      admissionNumber,
      studentEmail,
      parentEmail: parentEmailAddress,
      studentId,
      parentId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Admission transaction failed' });
  } finally {
    client.release();
  }
});

// POST Register general users (backwards compatible/for direct creation)
router.post('/users', async (req, res) => {
  const { name, email, password, role, phone, class_id, roll_number, date_of_birth, student_id } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing mandatory fields' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id, name, email, role, phone, created_at
    `, [name, email.toLowerCase(), hashedPassword, role, phone || null]);
    const newUser = userRes.rows[0];

    if (role === 'student') {
      await client.query(`
        INSERT INTO edupulse_student_profiles (student_id, class_id, roll_number, date_of_birth, admission_number)
        VALUES ($1, $2, $3, $4, $5)
      `, [newUser.id, class_id || null, roll_number || null, date_of_birth || null, `STU-${Date.now()}`]);
    } else if (role === 'parent' && student_id) {
      await client.query(`
        INSERT INTO edupulse_parents_students (parent_id, student_id) VALUES ($1, $2)
      `, [newUser.id, student_id]);
    } else if (role === 'teacher') {
      await client.query(`
        INSERT INTO edupulse_teacher_profiles (teacher_id, employee_id, joining_date)
        VALUES ($1, $2, CURRENT_DATE)
      `, [newUser.id, `TCH-${Date.now()}`]);
    } else if (['accountant', 'librarian', 'receptionist', 'security', 'driver', 'cashier'].includes(role)) {
      await client.query(`
        INSERT INTO edupulse_staff_profiles (staff_id, employee_id, department, position)
        VALUES ($1, $2, $3, $4)
      `, [newUser.id, `STF-${Date.now()}`, 'Administration', role]);
    }

    await logActivity(req.user.id, 'Register User', `Created user account for ${name} (${role})`, req);
    await client.query('COMMIT');
    res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create user account' });
  } finally {
    client.release();
  }
});

// PUT Update User & Profile fields
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, email, phone, role, status,
    roll_number, date_of_birth, admission_number, gender, address, previous_school,
    father_name, father_phone, father_email, father_occupation,
    mother_name, mother_phone, mother_email, mother_occupation,
    guardian_name, guardian_phone, guardian_email, guardian_relation,
    qualification, department, position, employee_id, class_id
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update base user details
    const userUpdateFields = [];
    const userParams = [];
    if (name) { userUpdateFields.push(`name = $${userParams.length + 1}`); userParams.push(name); }
    if (email) { userUpdateFields.push(`email = $${userParams.length + 1}`); userParams.push(email.toLowerCase()); }
    if (phone !== undefined) { userUpdateFields.push(`phone = $${userParams.length + 1}`); userParams.push(phone); }
    if (status) { userUpdateFields.push(`status = $${userParams.length + 1}`); userParams.push(status); }

    if (userUpdateFields.length > 0) {
      userParams.push(id);
      await client.query(`UPDATE edupulse_users SET ${userUpdateFields.join(', ')} WHERE id = $${userParams.length}`, userParams);
    }

    // Fetch role to know which profile to update
    const userRoleRes = await client.query('SELECT role FROM edupulse_users WHERE id = $1', [id]);
    if (userRoleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    const userRole = userRoleRes.rows[0].role;

    if (userRole === 'student') {
      await client.query(`
        UPDATE edupulse_student_profiles SET
          class_id = COALESCE($1, class_id),
          roll_number = COALESCE($2, roll_number),
          date_of_birth = COALESCE($3, date_of_birth),
          admission_number = COALESCE($4, admission_number),
          gender = COALESCE($5, gender),
          address = COALESCE($6, address),
          previous_school = COALESCE($7, previous_school),
          father_name = COALESCE($8, father_name),
          father_phone = COALESCE($9, father_phone),
          father_email = COALESCE($10, father_email),
          father_occupation = COALESCE($11, father_occupation),
          mother_name = COALESCE($12, mother_name),
          mother_phone = COALESCE($13, mother_phone),
          mother_email = COALESCE($14, mother_email),
          mother_occupation = COALESCE($15, mother_occupation),
          guardian_name = COALESCE($16, guardian_name),
          guardian_phone = COALESCE($17, guardian_phone),
          guardian_email = COALESCE($18, guardian_email),
          guardian_relation = COALESCE($19, guardian_relation)
        WHERE student_id = $20
      `, [
        class_id || null, roll_number || null, date_of_birth || null, admission_number || null, gender || null, address || null, previous_school || null,
        father_name || null, father_phone || null, father_email || null, father_occupation || null,
        mother_name || null, mother_phone || null, mother_email || null, mother_occupation || null,
        guardian_name || null, guardian_phone || null, guardian_email || null, guardian_relation || null,
        id
      ]);
    } else if (userRole === 'teacher') {
      await client.query(`
        UPDATE edupulse_teacher_profiles SET
          employee_id = COALESCE($1, employee_id),
          gender = COALESCE($2, gender),
          qualification = COALESCE($3, qualification),
          department = COALESCE($4, department)
        WHERE teacher_id = $5
      `, [employee_id || null, gender || null, qualification || null, department || null, id]);

      // Assign teacher classes if class_id provided
      if (class_id) {
        await client.query('UPDATE edupulse_classes SET teacher_id = $1 WHERE id = $2', [id, class_id]);
      }
    } else if (['accountant', 'librarian', 'receptionist', 'security', 'driver', 'cashier'].includes(userRole)) {
      await client.query(`
        UPDATE edupulse_staff_profiles SET
          employee_id = COALESCE($1, employee_id),
          department = COALESCE($2, department),
          position = COALESCE($3, position)
        WHERE staff_id = $4
      `, [employee_id || null, department || null, position || null, id]);
    }

    await logActivity(req.user.id, 'Update User Profile', `Updated profile of user ID ${id} (${userRole})`, req);
    await client.query('COMMIT');
    res.json({ message: 'User profile updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update user profile' });
  } finally {
    client.release();
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });

  try {
    const userRes = await pool.query('SELECT name, role FROM edupulse_users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await pool.query('DELETE FROM edupulse_users WHERE id = $1', [id]);
    await logActivity(req.user.id, 'Delete User', `Deleted user account for ${userRes.rows[0].name} (${userRes.rows[0].role})`, req);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


// ─────────────────────────────────────────────
// ROLES & PERMISSIONS
// ─────────────────────────────────────────────

// Get all permissions
router.get('/permissions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edupulse_permissions ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get roles and their active mapped permissions
router.get('/roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rp.role, p.id as permission_id, p.name as permission_name, p.description
      FROM edupulse_role_permissions rp
      JOIN edupulse_permissions p ON rp.permission_id = p.id
    `);
    
    // Group permissions by role
    const rolesMap = {};
    const rolesList = ['super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant', 'librarian', 'receptionist', 'security', 'driver', 'cashier'];
    
    rolesList.forEach(r => { rolesMap[r] = []; });
    result.rows.forEach(row => {
      if (rolesMap[row.role]) {
        rolesMap[row.role].push({ id: row.permission_id, name: row.permission_name, description: row.description });
      }
    });

    res.json(rolesMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roles mapping' });
  }
});

// Update Role Permissions
router.put('/roles/:role/permissions', async (req, res) => {
  const { role } = req.params;
  const { permissionIds } = req.body; // array of permission IDs

  if (!Array.isArray(permissionIds)) {
    return res.status(400).json({ error: 'permissionIds must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Clear old mappings
    await client.query('DELETE FROM edupulse_role_permissions WHERE role = $1', [role]);
    // Insert new mappings
    for (const pId of permissionIds) {
      await client.query(
        'INSERT INTO edupulse_role_permissions (role, permission_id) VALUES ($1, $2)',
        [role, pId]
      );
    }
    await logActivity(req.user.id, 'Update Permissions', `Updated role permissions mapping for role ${role}`, req);
    await client.query('COMMIT');
    res.json({ message: `Permissions for role ${role} updated successfully` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update permissions mapping' });
  } finally {
    client.release();
  }
});


// ─────────────────────────────────────────────
// BULK IMPORT STUDENTS
// ─────────────────────────────────────────────

router.post('/import/students', async (req, res) => {
  const { students } = req.body; // array of { name, dob, gender, address, rollNumber, classId, previousSchool, parentName, parentEmail, parentPhone, parentOccupation }

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Students list is empty or invalid.' });
  }

  const client = await pool.connect();
  const currentYear = new Date().getFullYear();
  let importCount = 0;
  try {
    await client.query('BEGIN');
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    for (const stu of students) {
      const { name, dob, gender, address, rollNumber, classId, previousSchool, parentName, parentEmail, parentPhone, parentOccupation } = stu;
      if (!name || !classId) continue; // Skip incomplete records

      // 1. Unique Student Identifiers
      const countRes = await client.query('SELECT COUNT(*) FROM edupulse_student_profiles');
      const count = parseInt(countRes.rows[0].count) + 1 + importCount;
      const admissionNum = `STU-${currentYear}-${String(count).padStart(4, '0')}`;
      const studentEmail = `student.${admissionNum.toLowerCase().replace(/-/g, '')}@edupulse.com`;

      // 2. Unique Parent Identifiers
      const parentAdmissionNum = `PAR-${currentYear}-${String(count).padStart(4, '0')}`;
      const parentEmailAddress = parentEmail?.trim() || `parent.${parentAdmissionNum.toLowerCase().replace(/-/g, '')}@edupulse.com`;

      // 3. Parent Account
      let parentId = null;
      const parentCheck = await client.query('SELECT id FROM edupulse_users WHERE email = $1', [parentEmailAddress.toLowerCase()]);
      if (parentCheck.rows.length > 0) {
        parentId = parentCheck.rows[0].id;
      } else {
        const parentUserRes = await client.query(`
          INSERT INTO edupulse_users (name, email, password, role, phone, status)
          VALUES ($1, $2, $3, 'parent', $4, 'active')
          RETURNING id
        `, [parentName || `${name} Parent`, parentEmailAddress.toLowerCase(), defaultPasswordHash, parentPhone || null]);
        parentId = parentUserRes.rows[0].id;
      }

      // 4. Student Account
      const studentUserRes = await client.query(`
        INSERT INTO edupulse_users (name, email, password, role, phone, status)
        VALUES ($1, $2, $3, 'student', $4, 'active')
        RETURNING id
      `, [name, studentEmail, defaultPasswordHash, null]);
      const studentId = studentUserRes.rows[0].id;

      // 5. Link Parent-Student
      await client.query(`
        INSERT INTO edupulse_parents_students (parent_id, student_id) VALUES ($1, $2)
      `, [parentId, studentId]);

      // 6. Create Student Profile
      await client.query(`
        INSERT INTO edupulse_student_profiles (
          student_id, class_id, roll_number, date_of_birth, admission_number, gender, address, previous_school,
          father_name, father_phone, father_email, father_occupation
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        studentId, classId, rollNumber || `R${String(count).padStart(3, '0')}`, dob || null, admissionNum, gender || 'other', address || '', previousSchool || '',
        parentName || '', parentPhone || '', parentEmailAddress, parentOccupation || ''
      ]);

      importCount++;
    }

    await logActivity(req.user.id, 'Bulk Import Students', `Imported ${importCount} students via bulk file.`, req);
    await client.query('COMMIT');
    res.json({ message: `Successfully imported ${importCount} student records and created user accounts.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to process bulk import.' });
  } finally {
    client.release();
  }
});


// ─────────────────────────────────────────────
// CLASSES / SECTIONS
// ─────────────────────────────────────────────

// Get all classes/sections with academic structure labels
router.get('/classes', async (req, res) => {
  try {
    const classesRes = await pool.query(`
      SELECT c.id, c.name, c.schedule, c.teacher_id, c.section, c.academic_year_id, c.term_id, c.grade_id,
             u.name as teacher_name,
             ay.name as academic_year_name,
             t.name as term_name,
             gl.name as grade_name,
             (SELECT COUNT(*) FROM edupulse_student_profiles WHERE class_id = c.id) as student_count
      FROM edupulse_classes c
      LEFT JOIN edupulse_users u ON c.teacher_id = u.id
      LEFT JOIN edupulse_academic_years ay ON c.academic_year_id = ay.id
      LEFT JOIN edupulse_terms t ON c.term_id = t.id
      LEFT JOIN edupulse_grades_list gl ON c.grade_id = gl.id
      ORDER BY gl.name ASC, c.section ASC, c.name ASC
    `);
    res.json(classesRes.rows);
  } catch (err) {
    console.error('Fetch classes error:', err);
    res.status(500).json({ error: 'Server error fetching classes' });
  }
});

// Create Class Section
router.post('/classes', async (req, res) => {
  const { name, teacher_id, schedule, academic_year_id, term_id, grade_id, section } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Class name is required' });
  }

  try {
    if (teacher_id) {
      const teacherCheck = await pool.query("SELECT id FROM edupulse_users WHERE id = $1 AND role = 'teacher'", [teacher_id]);
      if (teacherCheck.rows.length === 0) return res.status(400).json({ error: 'Selected teacher does not exist' });
    }

    const defaultSchedule = schedule || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };

    const classRes = await pool.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule, academic_year_id, term_id, grade_id, section)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [name.trim(), teacher_id || null, JSON.stringify(defaultSchedule), academic_year_id || null, term_id || null, grade_id || null, section || null]);

    await logActivity(req.user.id, 'Create Class/Section', `Created class section ${name.trim()}`, req);
    res.status(201).json(classRes.rows[0]);
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Server error creating class' });
  }
});

// Update Class Section
router.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, teacher_id, academic_year_id, term_id, grade_id, section } = req.body;

  try {
    const fields = [];
    const params = [];

    if (name && name.trim()) { fields.push(`name = $${params.length + 1}`); params.push(name.trim()); }
    if (teacher_id !== undefined) { fields.push(`teacher_id = $${params.length + 1}`); params.push(teacher_id || null); }
    if (academic_year_id !== undefined) { fields.push(`academic_year_id = $${params.length + 1}`); params.push(academic_year_id || null); }
    if (term_id !== undefined) { fields.push(`term_id = $${params.length + 1}`); params.push(term_id || null); }
    if (grade_id !== undefined) { fields.push(`grade_id = $${params.length + 1}`); params.push(grade_id || null); }
    if (section !== undefined) { fields.push(`section = $${params.length + 1}`); params.push(section || null); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields provided to update' });

    params.push(id);
    const result = await pool.query(
      `UPDATE edupulse_classes SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    
    await logActivity(req.user.id, 'Update Class/Section', `Updated class section ID ${id}`, req);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating class' });
  }
});

// Delete Class Section
router.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT name FROM edupulse_classes WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    await pool.query('DELETE FROM edupulse_classes WHERE id = $1', [id]);
    await logActivity(req.user.id, 'Delete Class/Section', `Deleted class section ${check.rows[0].name}`, req);
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting class' });
  }
});


// ─────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────

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

router.post('/announcements', async (req, res) => {
  const { title, content, target_role } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const annRes = await pool.query(`
      INSERT INTO edupulse_announcements (title, content, target_role, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [title.trim(), content.trim(), target_role || 'all', req.user.id]);
    
    await logActivity(req.user.id, 'Create Announcement', `Posted notice: ${title.trim()}`, req);
    res.status(201).json(annRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error posting announcement' });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT title FROM edupulse_announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' });
    await pool.query('DELETE FROM edupulse_announcements WHERE id = $1', [id]);
    await logActivity(req.user.id, 'Delete Announcement', `Deleted notice: ${check.rows[0].title}`, req);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting announcement' });
  }
});


// ─────────────────────────────────────────────
// FEES / INVOICES
// ─────────────────────────────────────────────

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

router.post('/fees', async (req, res) => {
  const { student_id, title, amount, due_date } = req.body;
  if (!student_id || !title || !amount || !due_date) return res.status(400).json({ error: 'Missing invoice details' });

  try {
    const feeRes = await pool.query(`
      INSERT INTO edupulse_fees (student_id, title, amount, status, due_date)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *;
    `, [student_id, title.trim(), parseFloat(amount), due_date]);
    
    await logActivity(req.user.id, 'Generate Invoice', `Generated invoice of ${amount} for student ID ${student_id}`, req);
    res.status(201).json(feeRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating invoice' });
  }
});

router.put('/fees/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['paid', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const result = await pool.query(`
      UPDATE edupulse_fees SET status = $1, paid_date = $2 WHERE id = $3 RETURNING *
    `, [status, status === 'paid' ? new Date() : null, id]);
    
    await logActivity(req.user.id, 'Update Invoice', `Updated invoice status for ID ${id} to ${status}`, req);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating status' });
  }
});

router.delete('/fees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM edupulse_fees WHERE id = $1', [id]);
    await logActivity(req.user.id, 'Delete Invoice', `Deleted invoice ID ${id}`, req);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting invoice' });
  }
});


// ─────────────────────────────────────────────
// SYSTEM SETTINGS
// ─────────────────────────────────────────────

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

router.put('/settings', async (req, res) => {
  const settings = req.body;
  const allowedKeys = ['school_name', 'currency', 'currency_symbol', 'country', 'timezone'];
  const invalidKeys = Object.keys(settings).filter(k => !allowedKeys.includes(k));
  if (invalidKeys.length > 0) return res.status(400).json({ error: `Unknown keys: ${invalidKeys.join(', ')}` });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined && val !== null) {
        await client.query(`
          INSERT INTO edupulse_settings (key, value) VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [key, String(val).trim()]);
      }
    }
    await logActivity(req.user.id, 'Update Settings', 'Updated school ERP settings.', req);
    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  } finally {
    client.release();
  }
});


// ─────────────────────────────────────────────
// ACTIVITY LOGS
// ─────────────────────────────────────────────

router.get('/activity-logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM edupulse_activity_logs al
      LEFT JOIN edupulse_users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});


// ─────────────────────────────────────────────
// REPORTS / STATS SUMMARY
// ─────────────────────────────────────────────

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
