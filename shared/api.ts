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
  maxScore: number;
  issues: number;
  recommendations: number;
  details: string;
  priorityLevel?: 'critical' | 'high' | 'medium' | 'low';
  implementationDifficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
  estimatedImpact?: string;
  confidence?: number;
  evidenceLevel?: 'high' | 'medium' | 'low';
  industryComparison?: string;
  industryPercentile?: number;
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
  summary: string;
}
