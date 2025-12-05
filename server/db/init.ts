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
          is_demo_mode BOOLEAN DEFAULT false
        );
      `,
      `CREATE INDEX IF NOT EXISTS idx_audits_url ON audits(url);`,
      `CREATE INDEX IF NOT EXISTS idx_audits_date ON audits(created_at DESC);`,
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
