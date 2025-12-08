/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Audit-related interfaces
 */
export interface AuditRequest {
  url: string;
}

export interface AuditSection {
  name: string;
  score: number;
  details: string;
}

export interface AuditResponse {
  id: string;
  url: string;
  title: string;
  description: string;
  overallScore: number;
  date: string;
  status: string;
  sections: AuditSection[];
  summary?: string;
  strengths?: string[];
  opportunities?: string[];
  detailedAnalysis?: string;
  recommendations?: string[];
  rawAnalysis?: string;
  shareToken?: string; // Unique token for secure sharing
}
