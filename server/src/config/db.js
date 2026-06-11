import pg from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const host = process.env.DB_HOST;
const isLocal = !host || host === 'localhost' || host === '127.0.0.1';

let resolvedHost = host;
if (!isLocal) {
  try {
    console.log(`🌐 Resolving cloud DB host: ${host}...`);
    const addresses = await dns.promises.resolve4(host);
    if (addresses && addresses.length > 0) {
      resolvedHost = addresses[0];
      console.log(`✅ Resolved database host to IPv4: ${resolvedHost}`);
    }
  } catch (err) {
    console.warn(`⚠️ DNS resolution failed for database host ${host}, falling back:`, err.message);
  }
}

// If local, use Unix socket peer authentication on /var/run/postgresql
// If cloud, use resolved IPv4 host, user, password, and SSL with SNI
const dbConfig = isLocal
  ? {
      host: '/var/run/postgresql',
      database: process.env.DB_DATABASE || 'edupulse',
    }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: resolvedHost,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_DATABASE,
      ssl: {
        rejectUnauthorized: false,
        servername: host // Crucial for Neon SNI routing
      }
    };

const pool = new Pool(dbConfig);

pool.on('connect', () => {
  console.log(`⚡ Connected to the EduPulse PostgreSQL database (${isLocal ? 'Local socket' : 'Cloud'}) successfully!`);
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on idle client:', err);
});

export default pool;
