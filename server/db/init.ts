// Database initialization
let pool: any = null;
let initialized = false;

// Lazy load pg to avoid bundling issues
async function initPool() {
  if (pool) return pool;

  try {
    // Try to load pg module, but handle gracefully if not available
    let pgModule: any = null;

    try {
      pgModule = await import("pg");
    } catch (importError) {
      console.warn("pg module not available - using fallback mode");
      return null;
    }

    if (!pgModule) return null;

    const { Pool } = pgModule;

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log("Database pool created");
    return pool;
  } catch (error) {
    console.error("Failed to initialize database pool:", error);
    return null;
  }
}

// Initialize database schema
export async function initializeDatabase() {
  if (initialized) return;

  try {
    const db = await initPool();
    if (!db) {
      console.warn("Database not configured. Skipping schema initialization.");
      return;
    }

    console.log("Initializing database schema...");

    const queries = [
      `
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
          is_demo_mode BOOLEAN DEFAULT false,
          share_token VARCHAR(36) UNIQUE
        );
      `,
      // Migration: Add is_demo_mode column if it doesn't exist (for existing tables)
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='audits' AND column_name='is_demo_mode'
          ) THEN
            ALTER TABLE audits ADD COLUMN is_demo_mode BOOLEAN DEFAULT false;
          END IF;
        END $$;
      `,
      // Migration: Add share_token column if it doesn't exist (for existing tables)
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='audits' AND column_name='share_token'
          ) THEN
            ALTER TABLE audits ADD COLUMN share_token VARCHAR(36) UNIQUE;
          END IF;
        END $$;
      `,
      // Backfill share_token for existing audits without one
      `
        UPDATE audits
        SET share_token = gen_random_uuid()::text
        WHERE share_token IS NULL;
      `,
      `CREATE INDEX IF NOT EXISTS idx_audits_url ON audits(url);`,
      `CREATE INDEX IF NOT EXISTS idx_audits_date ON audits(created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_audits_share_token ON audits(share_token);`,
    ];

    for (const query of queries) {
      try {
        await db.query(query);
      } catch (err) {
        console.warn("Query execution warning:", err);
      }
    }

    initialized = true;
    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Get database connection pool
export async function getPool() {
  return await initPool();
}

// Close database connections
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
