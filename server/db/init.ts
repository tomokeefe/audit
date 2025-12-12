// Database initialization
let pool: any = null;
let initialized = false;

// Lazy load pg to avoid bundling issues
async function initPool() {
  if (pool) return pool;

  const DATABASE_URL = process.env.DATABASE_URL;

  // If DATABASE_URL is not set, don't try to connect
  if (!DATABASE_URL) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ DATABASE_URL NOT SET IN ENVIRONMENT");
    console.error("❌ Audits will be lost on server restart!");
    console.error("❌ Shared links will break on every deployment!");
    console.error("=".repeat(80) + "\n");
    return null;
  }

  try {
    console.log("\n" + "=".repeat(80));
    console.log("🔵 INITIALIZING DATABASE CONNECTION");
    console.log("🔵 DATABASE_URL:", DATABASE_URL.substring(0, 30) + "...");
    console.log("=".repeat(80));

    // Try to load pg module
    let pgModule: any = null;

    try {
      pgModule = await import("pg");
      console.log("✅ pg module loaded successfully");
    } catch (importError) {
      console.error("\n" + "=".repeat(80));
      console.error("❌❌❌ CRITICAL ERROR ❌❌❌");
      console.error("❌ Failed to load 'pg' module");
      console.error("❌ Error:", importError);
      console.error("❌ This means PostgreSQL support is broken!");
      console.error("❌ ALL AUDITS WILL BE LOST ON SERVER RESTART!");
      console.error("=".repeat(80) + "\n");
      throw importError; // Throw instead of returning null
    }

    if (!pgModule) {
      throw new Error("pg module is null after import");
    }

    const { Pool } = pgModule;

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Test the connection immediately
    console.log("🔵 Testing database connection...");
    const testResult = await pool.query("SELECT NOW()");
    console.log("✅ Database connection successful!");
    console.log("✅ Server time:", testResult.rows[0].now);
    console.log("=".repeat(80) + "\n");

    return pool;
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("❌❌❌ DATABASE CONNECTION FAILED ❌❌❌");
    console.error("❌ Error:", error);
    console.error("❌ DATABASE_URL:", DATABASE_URL?.substring(0, 50) + "...");
    console.error("❌ ALL AUDITS WILL BE LOST ON SERVER RESTART!");
    console.error("❌ SHARED LINKS WILL NOT WORK!");
    console.error("=".repeat(80) + "\n");

    // Re-throw the error so the server knows about it
    throw error;
  }
}

// Initialize database schema
export async function initializeDatabase() {
  if (initialized) return;

  try {
    const db = await initPool();
    if (!db) {
      console.warn(
        "\n⚠️  Database not configured. Skipping schema initialization.",
      );
      console.warn("⚠️  Audits will only be stored in memory.\n");
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
