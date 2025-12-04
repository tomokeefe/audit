import pkg from "pg";
const { Pool } = pkg;

// Initialize database connection from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create tables on initialization
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log("Initializing database...");

    // Create audits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audits (
        id VARCHAR(50) PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        overall_score DECIMAL(5, 2),
        status VARCHAR(50),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        audit_data JSONB NOT NULL,
        is_demo_mode BOOLEAN DEFAULT false
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audits_url ON audits(url);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audits_date ON audits(created_at DESC);
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Get database connection pool
export function getPool() {
  return pool;
}

// Close database connections
export async function closeDatabase() {
  await pool.end();
}
