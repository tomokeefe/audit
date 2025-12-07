import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const dbConfigured = !!process.env.DATABASE_URL;
  const response: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      configured: dbConfigured,
      url: dbConfigured ? "***hidden***" : "NOT SET",
    },
  };

  if (dbConfigured) {
    try {
      const { getPool } = await import("@/server/db/init");
      const pool = await getPool();
      if (pool) {
        const result = await pool.query("SELECT 1");
        response.database.connected = true;
        response.database.status = "Connected";
      } else {
        response.database.connected = false;
        response.database.status = "Pool creation failed";
      }
    } catch (error) {
      response.database.connected = false;
      response.database.status = `Connection failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  } else {
    response.database.status =
      "NOT CONFIGURED - Audits will NOT persist to database";
  }

  return NextResponse.json(response);
}
