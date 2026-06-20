import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import parentRoutes from './routes/parent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity, can restrict to client url in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Public endpoint to get school branding and settings
app.get('/api/settings', async (req, res) => {
  try {
    const pool = (await import('./config/db.js')).default;
    const result = await pool.query('SELECT key, value FROM edupulse_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Failed to fetch settings:', err.message);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'EduPulse ERP API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message || err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const initSettingsTable = async () => {
  try {
    const pool = (await import('./config/db.js')).default;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS edupulse_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    
    // Check if default settings are populated
    const checkRes = await pool.query('SELECT COUNT(*) FROM edupulse_settings');
    if (parseInt(checkRes.rows[0].count) === 0) {
      console.log('🌱 Seeding default settings into edupulse_settings...');
      await pool.query(`
        INSERT INTO edupulse_settings (key, value) VALUES
        ('school_name', 'EduPulse School'),
        ('currency', 'USD'),
        ('currency_symbol', '$'),
        ('country', 'US'),
        ('timezone', 'America/New_York');
      `);
    }
    console.log('✅ edupulse_settings table initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize edupulse_settings table:', err.message);
  }
};

app.listen(PORT, async () => {
  console.log(`🚀 EduPulse ERP Server running on http://localhost:${PORT}`);
  await initSettingsTable();
});
