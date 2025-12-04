import { AuditResponse } from "@shared/api";

/**
 * Save audit to database for sharing across browsers/devices
 * This bypasses the backend and saves directly to Neon via a Netlify function
 */
export async function saveAuditToDatabase(audit: AuditResponse): Promise<boolean> {
  try {
    console.log(`Saving audit ${audit.id} to database...`);

    // Call Netlify function to save to Neon
    const response = await fetch("/.netlify/functions/save-audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(audit),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to save audit to database:", error);
      return false;
    }

    console.log(`✓ Audit ${audit.id} saved to database`);
    return true;
  } catch (error) {
    console.error("Error saving audit to database:", error);
    // Don't throw - saving to database is optional
    return false;
  }
}

/**
 * Retrieve audit from database
 */
export async function getAuditFromDatabase(id: string): Promise<AuditResponse | null> {
  try {
    const response = await fetch(`/.netlify/functions/get-audit/${id}`);

    if (!response.ok) {
      console.warn(`Audit ${id} not found in database`);
      return null;
    }

    const audit = await response.json();
    console.log(`✓ Retrieved audit ${id} from database`);
    return audit;
  } catch (error) {
    console.error("Error retrieving audit from database:", error);
    return null;
  }
}
