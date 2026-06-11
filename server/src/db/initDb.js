import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

const initDatabase = async () => {
  console.log('🔄 Initializing EduPulse database tables...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Drop existing tables if they exist
    console.log('🧹 Clearing existing EduPulse tables if any...');
    await client.query(`
      DROP TABLE IF EXISTS edupulse_announcements CASCADE;
      DROP TABLE IF EXISTS edupulse_fees CASCADE;
      DROP TABLE IF EXISTS edupulse_grades CASCADE;
      DROP TABLE IF EXISTS edupulse_attendance CASCADE;
      DROP TABLE IF EXISTS edupulse_student_profiles CASCADE;
      DROP TABLE IF EXISTS edupulse_classes CASCADE;
      DROP TABLE IF EXISTS edupulse_parents_students CASCADE;
      DROP TABLE IF EXISTS edupulse_users CASCADE;
    `);

    // 2. Create Users Table
    console.log('📁 Creating edupulse_users table...');
    await client.query(`
      CREATE TABLE edupulse_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
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

    // 4. Create Classes Table
    console.log('📁 Creating edupulse_classes table...');
    await client.query(`
      CREATE TABLE edupulse_classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        teacher_id INT REFERENCES edupulse_users(id) ON DELETE SET NULL,
        schedule JSONB
      );
    `);

    // 5. Create Student Profiles Table
    console.log('📁 Creating edupulse_student_profiles table...');
    await client.query(`
      CREATE TABLE edupulse_student_profiles (
        student_id INT PRIMARY KEY REFERENCES edupulse_users(id) ON DELETE CASCADE,
        class_id INT REFERENCES edupulse_classes(id) ON DELETE SET NULL,
        roll_number VARCHAR(20),
        date_of_birth DATE
      );
    `);

    // 6. Create Attendance Table
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

    // 7. Create Grades Table
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

    // 8. Create Fees Table
    console.log('📁 Creating edupulse_fees table...');
    await client.query(`
      CREATE TABLE edupulse_fees (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES edupulse_users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
        due_date DATE NOT NULL,
        paid_date TIMESTAMP
      );
    `);

    // 9. Create Announcements Table
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

    // Hash dummy passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    console.log('🌱 Seeding users...');
    // Seed Admin
    const adminRes = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('Admin Director', 'admin@edupulse.com', $1, 'admin', '555-0100')
      RETURNING id;
    `, [hashedPassword]);
    const adminId = adminRes.rows[0].id;

    // Seed Teachers
    const teacher1Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('Sarah Smith', 'teacher.smith@edupulse.com', $1, 'teacher', '555-0101')
      RETURNING id;
    `, [hashedPassword]);
    const teacher1Id = teacher1Res.rows[0].id;

    const teacher2Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('David Jones', 'teacher.jones@edupulse.com', $1, 'teacher', '555-0102')
      RETURNING id;
    `, [hashedPassword]);
    const teacher2Id = teacher2Res.rows[0].id;

    // Seed Students
    const student1Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('Alex Mercer', 'student.alex@edupulse.com', $1, 'student', '555-0201')
      RETURNING id;
    `, [hashedPassword]);
    const student1Id = student1Res.rows[0].id;

    const student2Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('Emma Watson', 'student.emma@edupulse.com', $1, 'student', '555-0202')
      RETURNING id;
    `, [hashedPassword]);
    const student2Id = student2Res.rows[0].id;

    // Seed Parents
    const parent1Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('John Mercer', 'parent.john@edupulse.com', $1, 'parent', '555-0301')
      RETURNING id;
    `, [hashedPassword]);
    const parent1Id = parent1Res.rows[0].id;

    const parent2Res = await client.query(`
      INSERT INTO edupulse_users (name, email, password, role, phone)
      VALUES ('Helen Watson', 'parent.helen@edupulse.com', $1, 'parent', '555-0302')
      RETURNING id;
    `, [hashedPassword]);
    const parent2Id = parent2Res.rows[0].id;

    // Map Parents to Students
    console.log('🌱 Mapping parents to students...');
    await client.query(`
      INSERT INTO edupulse_parents_students (parent_id, student_id)
      VALUES 
        ($1, $2),
        ($3, $4);
    `, [parent1Id, student1Id, parent2Id, student2Id]);

    // Seed Classes
    console.log('🌱 Seeding classes...');
    const class1Res = await client.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule)
      VALUES (
        'Grade 10-A', 
        $1, 
        '{"Monday": ["Math", "Science", "English"], "Tuesday": ["History", "Math", "Science"], "Wednesday": ["English", "Geography", "Math"], "Thursday": ["Science", "Art", "English"], "Friday": ["Math", "PE", "History"]}'
      )
      RETURNING id;
    `, [teacher1Id]);
    const class1Id = class1Res.rows[0].id;

    const class2Res = await client.query(`
      INSERT INTO edupulse_classes (name, teacher_id, schedule)
      VALUES (
        'Grade 11-B', 
        $1, 
        '{"Monday": ["Physics", "Chemistry", "Math"], "Tuesday": ["Math", "Biology", "English"], "Wednesday": ["Chemistry", "Physics", "Math"], "Thursday": ["Biology", "English", "History"], "Friday": ["PE", "Chemistry", "Physics"]}'
      )
      RETURNING id;
    `, [teacher2Id]);
    const class2Id = class2Res.rows[0].id;

    // Seed Student Profiles
    console.log('🌱 Seeding student profiles...');
    await client.query(`
      INSERT INTO edupulse_student_profiles (student_id, class_id, roll_number, date_of_birth)
      VALUES 
        ($1, $2, 'R1001', '2010-04-15'),
        ($3, $4, 'R1102', '2009-08-22');
    `, [student1Id, class1Id, student2Id, class2Id]);

    // Seed Attendance
    console.log('🌱 Seeding attendance records...');
    const attendanceDates = ['2026-06-08', '2026-06-09', '2026-06-10'];
    for (const date of attendanceDates) {
      await client.query(`
        INSERT INTO edupulse_attendance (student_id, class_id, date, status)
        VALUES 
          ($1, $2, $3, 'present'),
          ($4, $5, $3, $6);
      `, [
        student1Id, class1Id, date, 
        student2Id, class2Id, 
        date === '2026-06-09' ? 'absent' : 'present'
      ]);
    }

    // Seed Grades
    console.log('🌱 Seeding academic grades...');
    await client.query(`
      INSERT INTO edupulse_grades (student_id, subject, exam_name, marks_obtained, max_marks, date)
      VALUES 
        ($1, 'Mathematics', 'Midterm Exam', 88.5, 100.0, '2026-05-10'),
        ($1, 'Science', 'Midterm Exam', 92.0, 100.0, '2026-05-12'),
        ($1, 'English', 'Class Test 1', 18.0, 20.0, '2026-05-20'),
        ($2, 'Physics', 'Midterm Exam', 78.0, 100.0, '2026-05-10'),
        ($2, 'Chemistry', 'Midterm Exam', 85.5, 100.0, '2026-05-11'),
        ($2, 'Mathematics', 'Class Test 1', 19.5, 20.0, '2026-05-22');
    `, [student1Id, student2Id]);

    // Seed Fees
    console.log('🌱 Seeding school fees invoices...');
    await client.query(`
      INSERT INTO edupulse_fees (student_id, title, amount, status, due_date, paid_date)
      VALUES 
        ($1, 'Term 1 Tuition Fee', 2500.00, 'paid', '2026-05-01', '2026-04-28 10:30:00'),
        ($1, 'Annual Sports & Activity Fee', 350.00, 'pending', '2026-06-30', NULL),
        ($2, 'Term 1 Tuition Fee', 2800.00, 'paid', '2026-05-01', '2026-04-29 14:15:00'),
        ($2, 'Chemistry Lab Material Fee', 150.00, 'pending', '2026-06-25', NULL);
    `, [student1Id, student2Id]);

    // Seed Announcements
    console.log('🌱 Seeding announcements...');
    await client.query(`
      INSERT INTO edupulse_announcements (title, content, target_role, created_by)
      VALUES 
        ('Welcome to Academic Year 2026', 'Welcome back students, parents, and teachers. We have upgraded our laboratories and school ERP platform for a smoother experience.', 'all', $1),
        ('Annual Sports Day Scheduling', 'Teachers, please submit your house athletic nominations by next Friday for the Sports Day events.', 'teachers', $1),
        ('Upcoming Parent-Teacher Meeting', 'Dear parents, our first term feedback meeting will take place online on June 18th. Booking links will be shared soon.', 'parents', $1);
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
