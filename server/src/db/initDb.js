import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

const initDatabase = async () => {
  console.log('🔄 Initializing EduPulse database tables with professional academic structure...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Drop existing tables if they exist
    console.log('🧹 Clearing existing EduPulse tables...');
    await client.query(`
      DROP TABLE IF EXISTS edupulse_activity_logs CASCADE;
      DROP TABLE IF EXISTS edupulse_role_permissions CASCADE;
      DROP TABLE IF EXISTS edupulse_permissions CASCADE;
      DROP TABLE IF EXISTS edupulse_staff_profiles CASCADE;
      DROP TABLE IF EXISTS edupulse_teacher_profiles CASCADE;
      DROP TABLE IF EXISTS edupulse_student_profiles CASCADE;
      DROP TABLE IF EXISTS edupulse_classes CASCADE;
      DROP TABLE IF EXISTS edupulse_parents_students CASCADE;
      DROP TABLE IF EXISTS edupulse_announcements CASCADE;
      DROP TABLE IF EXISTS edupulse_fees CASCADE;
      DROP TABLE IF EXISTS edupulse_grades CASCADE;
      DROP TABLE IF EXISTS edupulse_attendance CASCADE;
      DROP TABLE IF EXISTS edupulse_subjects CASCADE;
      DROP TABLE IF EXISTS edupulse_grades_list CASCADE;
      DROP TABLE IF EXISTS edupulse_terms CASCADE;
      DROP TABLE IF EXISTS edupulse_academic_years CASCADE;
      DROP TABLE IF EXISTS edupulse_users CASCADE;
    `);

    // 2. Create Users Table with status and full role checks
    console.log('📁 Creating edupulse_users table...');
    await client.query(`
      CREATE TABLE edupulse_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN (
          'super_admin', 'admin', 'teacher', 'student', 'parent', 
          'accountant', 'librarian', 'receptionist', 'security', 'driver', 'cashier'
        )),
        status VARCHAR(20) NOT NULL CHECK (status IN (
          'active', 'inactive', 'suspended', 'graduated', 'transferred', 'dropped'
        )) DEFAULT 'active',
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Parent-Student mapping Table
    console.log('📁 Creating edupulse_parents_students table...');
    await client.query(`
      CREATE TABLE edupulse_parents_students (
        parent_id INT REFERENCES edupulse_users(id) ON DELETE CASCADE,
        student_id INT REFERENCES edupulse_users(id) ON DELETE CASCADE,
        PRIMARY KEY (parent_id, student_id)
      );
    `);

    // 4. Create Academic Years Table
    console.log('📁 Creating edupulse_academic_years table...');
    await client.query(`
      CREATE TABLE edupulse_academic_years (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20) UNIQUE NOT NULL,
        status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive'
      );
    `);

    // 5. Create Terms Table
    console.log('📁 Creating edupulse_terms table...');
    await client.query(`
      CREATE TABLE edupulse_terms (
        id SERIAL PRIMARY KEY,
        academic_year_id INT REFERENCES edupulse_academic_years(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
        UNIQUE (academic_year_id, name)
      );
    `);

    // 6. Create Grades List Table
    console.log('📁 Creating edupulse_grades_list table...');
    await client.query(`
      CREATE TABLE edupulse_grades_list (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // 7. Create Subjects Table
    console.log('📁 Creating edupulse_subjects table...');
    await client.query(`
      CREATE TABLE edupulse_subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL
      );
    `);

    // 8. Create Classes/Sections Table
    console.log('📁 Creating edupulse_classes table...');
    await client.query(`
      CREATE TABLE edupulse_classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL, -- e.g. Grade 1 A
        teacher_id INT REFERENCES edupulse_users(id) ON DELETE SET NULL,
        schedule JSONB,
        academic_year_id INT REFERENCES edupulse_academic_years(id) ON DELETE SET NULL,
        term_id INT REFERENCES edupulse_terms(id) ON DELETE SET NULL,
        grade_id INT REFERENCES edupulse_grades_list(id) ON DELETE SET NULL,
        section VARCHAR(10)
      );
    `);

    // 9. Create Student Profiles Table with full admission & parent info
    console.log('📁 Creating edupulse_student_profiles table...');
    await client.query(`
      CREATE TABLE edupulse_student_profiles (
        student_id INT PRIMARY KEY REFERENCES edupulse_users(id) ON DELETE CASCADE,
        class_id INT REFERENCES edupulse_classes(id) ON DELETE SET NULL,
        roll_number VARCHAR(20),
        date_of_birth DATE,
        admission_number VARCHAR(50) UNIQUE,
        admission_date DATE DEFAULT CURRENT_DATE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        address TEXT,
        previous_school TEXT,
        father_name VARCHAR(100),
        father_phone VARCHAR(20),
        father_email VARCHAR(100),
        father_occupation VARCHAR(100),
        mother_name VARCHAR(100),
        mother_phone VARCHAR(20),
        mother_email VARCHAR(100),
        mother_occupation VARCHAR(100),
        guardian_name VARCHAR(100),
        guardian_phone VARCHAR(20),
        guardian_email VARCHAR(100),
        guardian_relation VARCHAR(100)
      );
    `);

    // 10. Create Teacher Profiles Table
    console.log('📁 Creating edupulse_teacher_profiles table...');
    await client.query(`
      CREATE TABLE edupulse_teacher_profiles (
        teacher_id INT PRIMARY KEY REFERENCES edupulse_users(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) UNIQUE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        qualification VARCHAR(100),
        department VARCHAR(100),
        joining_date DATE DEFAULT CURRENT_DATE
      );
    `);

    // 11. Create Staff Profiles Table (non-teaching)
    console.log('📁 Creating edupulse_staff_profiles table...');
    await client.query(`
      CREATE TABLE edupulse_staff_profiles (
        staff_id INT PRIMARY KEY REFERENCES edupulse_users(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) UNIQUE,
        department VARCHAR(100),
        position VARCHAR(100)
      );
    `);

    // 12. Create Attendance Table
    console.log('📁 Creating edupulse_attendance table...');
    await client.query(`
      CREATE TABLE edupulse_attendance (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES edupulse_users(id) ON DELETE CASCADE,
        class_id INT REFERENCES edupulse_classes(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
        UNIQUE (student_id, date)
      );
    `);

    // 13. Create Grades Table
    console.log('📁 Creating edupulse_grades table...');
    await client.query(`
      CREATE TABLE edupulse_grades (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES edupulse_users(id) ON DELETE CASCADE,
        subject VARCHAR(100) NOT NULL,
        exam_name VARCHAR(100) NOT NULL,
        marks_obtained NUMERIC(5, 2) NOT NULL,
        max_marks NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
        date DATE NOT NULL DEFAULT CURRENT_DATE
      );
    `);

    // 14. Create Fees Table
    console.log('📁 Creating edupulse_fees table...');
    await client.query(`
      CREATE TABLE edupulse_fees (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES edupulse_users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
        due_date DATE NOT NULL,
        paid_date TIMESTAMP,
        payment_method VARCHAR(50) DEFAULT 'chappa' CHECK (payment_method IN ('chappa', 'telebirr', 'cbe', 'cash', 'bank_transfer')),
        transaction_ref VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Create Announcements Table
    console.log('📁 Creating edupulse_announcements table...');
    await client.query(`
      CREATE TABLE edupulse_announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('all', 'teachers', 'students', 'parents')) DEFAULT 'all',
        created_by INT REFERENCES edupulse_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Create Permissions Table
    console.log('📁 Creating edupulse_permissions table...');
    await client.query(`
      CREATE TABLE edupulse_permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );
    `);

    // 17. Create Role Permissions Mapping Table
    console.log('📁 Creating edupulse_role_permissions table...');
    await client.query(`
      CREATE TABLE edupulse_role_permissions (
        role VARCHAR(20) NOT NULL,
        permission_id INT REFERENCES edupulse_permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role, permission_id)
      );
    `);

    // 18. Create Activity Logs Table
    console.log('📁 Creating edupulse_activity_logs table...');
    await client.query(`
      CREATE TABLE edupulse_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES edupulse_users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─────────────── SEEDING INITIAL DATA ───────────────

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    console.log('🌱 Seeding permissions...');
    const permissions = [
      { name: 'view_students', desc: 'Allows viewing of student accounts and profiles' },
      { name: 'take_attendance', desc: 'Allows taking attendance of students in assigned classes' },
      { name: 'enter_marks', desc: 'Allows entering and updating student exam marks' },
      { name: 'manage_fees', desc: 'Allows managing fee details and generation of invoices' },
      { name: 'generate_invoices', desc: 'Allows generation of student invoices' },
      { name: 'view_results', desc: 'Allows viewing academic grades and reports' },
      { name: 'view_attendance', desc: 'Allows viewing attendance records' },
      { name: 'manage_academics', desc: 'Allows editing academic structures (years, terms, classes)' },
      { name: 'manage_users', desc: 'Allows registering and managing user roles and profiles' },
      { name: 'manage_settings', desc: 'Allows updating school system settings' }
    ];

    const permissionIds = {};
    for (const perm of permissions) {
      const res = await client.query(
        'INSERT INTO edupulse_permissions (name, description) VALUES ($1, $2) RETURNING id',
        [perm.name, perm.desc]
      );
      permissionIds[perm.name] = res.rows[0].id;
    }

    console.log('🌱 Seeding role-permissions mapping...');
    const rolePermissions = {
      super_admin: Object.keys(permissionIds),
      admin: Object.keys(permissionIds),
      teacher: ['view_students', 'take_attendance', 'enter_marks', 'view_attendance'],
      accountant: ['view_students', 'manage_fees', 'generate_invoices'],
      student: ['view_results', 'view_attendance'],
      parent: ['view_results', 'view_attendance'],
      librarian: ['view_students'],
      receptionist: ['view_students']
    };

    for (const [role, perms] of Object.entries(rolePermissions)) {
      for (const pName of perms) {
        await client.query(
          'INSERT INTO edupulse_role_permissions (role, permission_id) VALUES ($1, $2)',
          [role, permissionIds[pName]]
        );
      }
    }

    console.log('🌱 Seeding Academic Structure...');
    // Seed Academic Years
    const ay1Res = await client.query("INSERT INTO edupulse_academic_years (name, status) VALUES ('2026/2027', 'active') RETURNING id");
    const ay2Res = await client.query("INSERT INTO edupulse_academic_years (name, status) VALUES ('2027/2028', 'inactive') RETURNING id");
    const ay1Id = ay1Res.rows[0].id;
    const ay2Id = ay2Res.rows[0].id;

    // Seed Terms
    const term1Res = await client.query("INSERT INTO edupulse_terms (academic_year_id, name, status) VALUES ($1, 'Semester 1', 'active') RETURNING id", [ay1Id]);
    await client.query("INSERT INTO edupulse_terms (academic_year_id, name, status) VALUES ($1, 'Semester 2', 'inactive')", [ay1Id]);
    await client.query("INSERT INTO edupulse_terms (academic_year_id, name, status) VALUES ($1, 'Semester 3', 'inactive')", [ay1Id]);
    const term1Id = term1Res.rows[0].id;

    // Seed Grades List
    const gradesSeed = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const gradeIds = {};
    for (const gName of gradesSeed) {
      const res = await client.query("INSERT INTO edupulse_grades_list (name) VALUES ($1) RETURNING id", [gName]);
      gradeIds[gName] = res.rows[0].id;
    }

    // Seed Subjects
    const subjectsSeed = [
      { name: 'Mathematics', code: 'MATH101' },
      { name: 'English Language', code: 'ENG101' },
      { name: 'Physics', code: 'PHYS101' },
      { name: 'Chemistry', code: 'CHEM101' },
      { name: 'Biology', code: 'BIO101' }
    ];
    for (const sub of subjectsSeed) {
      await client.query("INSERT INTO edupulse_subjects (name, code) VALUES ($1, $2)", [sub.name, sub.code]);
    }

    console.log('🌱 Seeding Users & Profiles...');
    // Seed Admin
    const adminRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('Admin Director', 'admin@edupulse.com', $1, 'admin', '555-0100', 'active')
      RETURNING id;
    `, [hashedPassword]);
    const adminId = adminRes.rows[0].id;

    // Seed Teachers
    const teacher1Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('Mr. John Watson', 'john.watson@edupulse.com', $1, 'teacher', '555-0101', 'active')
      RETURNING id;
    `, [hashedPassword]);
    const teacher1Id = teacher1Res.rows[0].id;
    await client.query(`
      INSERT INTO edupulse_teacher_profiles (teacher_id, employee_id, gender, qualification, department)
      VALUES ($1, 'TCH-2026-0001', 'male', 'M.Sc. in Mathematics', 'Mathematics');
    `, [teacher1Id]);

    const teacher2Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('David Jones', 'teacher.jones@edupulse.com', $1, 'teacher', '555-0102', 'active')
      RETURNING id;
    `, [hashedPassword]);
    const teacher2Id = teacher2Res.rows[0].id;
    await client.query(`
      INSERT INTO edupulse_teacher_profiles (teacher_id, employee_id, gender, qualification, department)
      VALUES ($1, 'TCH-2026-0002', 'male', 'B.Sc. in Physics', 'Sciences');
    `, [teacher2Id]);

    // Seed Staff
    const accountantRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('Grace Hopper', 'finance@edupulse.com', $1, 'accountant', '555-0103', 'active')
      RETURNING id;
    `, [hashedPassword]);
    await client.query(`
      INSERT INTO edupulse_staff_profiles (staff_id, employee_id, department, position)
      VALUES ($1, 'STF-2026-0001', 'Finance', 'Chief Accountant');
    `, [accountantRes.rows[0].id]);

    const librarianRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('Ada Lovelace', 'library@edupulse.com', $1, 'librarian', '555-0104', 'active')
      RETURNING id;
    `, [hashedPassword]);
    await client.query(`
      INSERT INTO edupulse_staff_profiles (staff_id, employee_id, department, position)
      VALUES ($1, 'STF-2026-0002', 'Library', 'Librarian');
    `, [librarianRes.rows[0].id]);

    // Seed Parents
    const parent1Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('Sarah Watson', 'sarah.watson@edupulse.com', $1, 'parent', '555-0301', 'active')
      RETURNING id;
    `, [hashedPassword]);
    const parent1Id = parent1Res.rows[0].id;

    // Seed Students
    const student1Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('John Watson Jr.', 'student.john@edupulse.com', $1, 'student', '555-0201', 'active')
      RETURNING id;
    `, [hashedPassword]);
    const student1Id = student1Res.rows[0].id;

    const student2Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone, status)
      VALUES ('Mary Watson', 'student.mary@edupulse.com', $1, 'student', '555-0202', 'active')
      RETURNING id;
    `, [hashedPassword]);
    const student2Id = student2Res.rows[0].id;

    // Map Parent to Students
    await client.query(`
      INSERT INTO edupulse_parents_students (parent_id, student_id)
      VALUES ($1, $2), ($1, $3);
    `, [parent1Id, student1Id, student2Id]);

    // Seed Classes (Sections)
    console.log('🌱 Seeding classes...');
    const class1Res = await client.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule, academic_year_id, term_id, grade_id, section)
      VALUES (
        'Grade 7 A', 
        $1, 
        '{"Monday": ["Math", "English", "Physics"], "Tuesday": ["Math", "English", "Physics"], "Wednesday": ["Math", "English", "Physics"], "Thursday": ["Biology", "Chemistry", "Math"], "Friday": ["PE", "English", "Biology"]}',
        $2, $3, $4, 'A'
      )
      RETURNING id;
    `, [teacher1Id, ay1Id, term1Id, gradeIds['Grade 7']]);
    const class1Id = class1Res.rows[0].id;

    const class2Res = await client.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule, academic_year_id, term_id, grade_id, section)
      VALUES (
        'Grade 8 A', 
        $1, 
        '{"Monday": ["Math", "Science", "English"], "Tuesday": ["History", "Math", "Science"], "Wednesday": ["English", "Geography", "Math"], "Thursday": ["Science", "Art", "English"], "Friday": ["Math", "PE", "History"]}',
        $2, $3, $4, 'A'
      )
      RETURNING id;
    `, [teacher2Id, ay1Id, term1Id, gradeIds['Grade 8']]);
    const class2Id = class2Res.rows[0].id;

    // Seed Student Profiles
    await client.query(`
      INSERT INTO edupulse_student_profiles (
        student_id, class_id, roll_number, date_of_birth, admission_number, admission_date, gender, address, 
        father_name, father_phone, father_email, father_occupation, mother_name, mother_phone, mother_email, mother_occupation
      )
      VALUES (
        $1, $2, 'R1001', '2012-04-15', 'STU-2026-0001', '2026-06-01', 'male', '123 Baker Street, London',
        'John Watson Sr.', '555-0302', 'john.watson.sr@gmail.com', 'Doctor', 'Sarah Watson', '555-0301', 'sarah.watson@edupulse.com', 'Homemaker'
      ), (
        $3, $4, 'R1002', '2011-08-22', 'STU-2026-0002', '2026-06-02', 'female', '123 Baker Street, London',
        'John Watson Sr.', '555-0302', 'john.watson.sr@gmail.com', 'Doctor', 'Sarah Watson', '555-0301', 'sarah.watson@edupulse.com', 'Homemaker'
      );
    `, [student1Id, class1Id, student2Id, class2Id]);

    // Seed Attendance
    console.log('🌱 Seeding attendance...');
    const attendanceDates = ['2026-06-15', '2026-06-16', '2026-06-17'];
    for (const date of attendanceDates) {
      await client.query(`
        INSERT INTO edupulse_attendance (student_id, class_id, date, status)
        VALUES 
          ($1, $2, $3, 'present'),
          ($4, $5, $3, $6);
      `, [
        student1Id, class1Id, date, 
        student2Id, class2Id, 
        date === '2026-06-16' ? 'absent' : 'present'
      ]);
    }

    // Seed Grades
    console.log('🌱 Seeding grades...');
    await client.query(`
      INSERT INTO edupulse_grades (student_id, subject, exam_name, marks_obtained, max_marks, date)
      VALUES 
        ($1, 'Mathematics', 'Midterm Exam', 92.5, 100.0, '2026-06-10'),
        ($1, 'English Language', 'Midterm Exam', 88.0, 100.0, '2026-06-12'),
        ($2, 'Mathematics', 'Midterm Exam', 79.0, 100.0, '2026-06-10'),
        ($2, 'English Language', 'Midterm Exam', 94.0, 100.0, '2026-06-12');
    `, [student1Id, student2Id]);

    // Seed Fees
    console.log('🌱 Seeding fees...');
    await client.query(`
      INSERT INTO edupulse_fees (student_id, title, amount, status, due_date, paid_date)
      VALUES 
        ($1, 'Term 1 Tuition Fee', 1500.00, 'paid', '2026-06-01', '2026-05-28 10:30:00'),
        ($1, 'Annual Sports Fee', 200.00, 'pending', '2026-07-15', NULL),
        ($2, 'Term 1 Tuition Fee', 1500.00, 'paid', '2026-06-01', '2026-05-29 14:15:00'),
        ($2, 'Annual Sports Fee', 200.00, 'pending', '2026-07-15', NULL);
    `, [student1Id, student2Id]);

    // Seed Announcements
    console.log('🌱 Seeding announcements...');
    await client.query(`
      INSERT INTO edupulse_announcements (title, content, target_role, created_by)
      VALUES 
        ('Welcome to Academic Year 2026/2027', 'Welcome students and parents to the new academic year. We look forward to an amazing learning journey together.', 'all', $1),
        ('Teacher Staff Meeting', 'All teachers are requested to attend the curriculum review meeting in the main hall on Friday at 3:00 PM.', 'teachers', $1);
    `, [adminId]);

    // Seed Activity Logs
    console.log('🌱 Seeding activity logs...');
    await client.query(`
      INSERT INTO edupulse_activity_logs (user_id, action, details)
      VALUES 
        ($1, 'Database Initialized', 'Database tables cleared, created, and seeded successfully.'),
        ($1, 'Create Student', 'Admitted student John Watson Jr. with Student ID STU-2026-0001.'),
        ($1, 'Create Student', 'Admitted student Mary Watson with Student ID STU-2026-0002.');
    `, [adminId]);

    await client.query('COMMIT');
    console.log('🎉 Database initialization and seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
  }
};

initDatabase().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
