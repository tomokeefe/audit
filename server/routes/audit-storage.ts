import { RequestHandler } from "express";
import { AuditResponse } from "@shared/api";

// In-memory storage for audit results
// In production, this would be replaced with a proper database
const auditStorage = new Map<string, AuditResponse>();

// Store audit result
export const storeAudit: RequestHandler = async (req, res) => {
  try {
    const auditData = req.body as AuditResponse;
    
    if (!auditData.id) {
      return res.status(400).json({ error: 'Audit ID is required' });
    }
    
    // Store the audit data
    auditStorage.set(auditData.id, auditData);
    
    console.log(`Stored audit ${auditData.id} for sharing`);
    
    res.status(200).json({ 
      success: true, 
      id: auditData.id,
      shareUrl: `/share/audit/${auditData.id}`
    });
    
  } catch (error) {
    console.error('Error storing audit:', error);
    res.status(500).json({ 
      error: 'Failed to store audit data' 
    });
  }
};

// Retrieve audit result
export const getAudit: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Audit ID is required' });
    }
    
    const auditData = auditStorage.get(id);
    
    if (!auditData) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    
    console.log(`Retrieved audit ${id} for sharing`);
    
    res.status(200).json(auditData);
    
  } catch (error) {
    console.error('Error retrieving audit:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve audit data' 
    });
  }
};

// List all stored audits (for debugging/admin purposes)
export const listAudits: RequestHandler = async (req, res) => {
  try {
    const audits = Array.from(auditStorage.values()).map(audit => ({
      id: audit.id,
      title: audit.title,
      url: audit.url,
      date: audit.date,
      overallScore: audit.overallScore
    }));
    
    res.status(200).json({ audits });
    
  } catch (error) {
    console.error('Error listing audits:', error);
    res.status(500).json({ 
      error: 'Failed to list audits' 
    });
  }
};

// Delete audit (optional cleanup)
export const deleteAudit: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Audit ID is required' });
    }
    
    const deleted = auditStorage.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    
    console.log(`Deleted audit ${id}`);
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Error deleting audit:', error);
    res.status(500).json({ 
      error: 'Failed to delete audit' 
    });
  }
};
