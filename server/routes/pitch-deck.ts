import { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import * as pdfParse from "pdf-parse";
import officeParser from "officeparser";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf',
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(ppt|pptx|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PPT, PPTX, and PDF files are allowed'));
    }
  }
});

// Extract text from PPT/PPTX file using officeparser
async function extractFromPowerPoint(filePath: string): Promise<string> {
  try {
    console.log('[PPT] Extracting text from PowerPoint:', filePath);

    // Use officeparser which properly handles PPTX files
    const text = await officeParser.parseOfficeAsync(filePath);
    console.log('[PPT] Extracted text length:', text.length);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content extracted from PowerPoint file');
    }

    return text.trim();
  } catch (error) {
    console.error('[PPT] Error extracting from PowerPoint:', error);
    throw new Error('Failed to extract text from PowerPoint file. Please ensure the file is a valid .ppt or .pptx file.');
  }
}

// Extract text from PDF file
async function extractFromPDF(filePath: string): Promise<string> {
  try {
    console.log('[PDF] Extracting text from PDF:', filePath);
    const dataBuffer = await fs.readFile(filePath);
    // @ts-ignore - pdf-parse has ESM/CJS compatibility issues
    const pdf = pdfParse.default || pdfParse;
    const data = await pdf(dataBuffer);
    console.log('[PDF] Extracted text length:', data.text.length);
    console.log('[PDF] Number of pages:', data.numpages);
    return data.text;
  } catch (error) {
    console.error('[PDF] Error extracting from PDF:', error);
    throw new Error('Failed to extract text from PDF file');
  }
}

// Extract text based on file type
async function extractTextFromFile(filePath: string, mimetype: string): Promise<string> {
  console.log('[EXTRACT] Processing file:', filePath, 'Type:', mimetype);
  
  if (mimetype === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    return await extractFromPDF(filePath);
  } else if (
    mimetype.includes('powerpoint') ||
    filePath.toLowerCase().match(/\.(ppt|pptx)$/)
  ) {
    return await extractFromPowerPoint(filePath);
  } else {
    throw new Error('Unsupported file type');
  }
}

// Handle pitch deck audit request
export const handlePitchDeckAudit: RequestHandler = async (req, res) => {
  console.log('[PITCH DECK] Audit request received');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { file } = req;
    console.log('[PITCH DECK] File uploaded:', file.originalname, file.mimetype, file.size);

    // Extract text from the uploaded file
    const extractedText = await extractTextFromFile(file.path, file.mimetype);
    
    console.log('[PITCH DECK] Extracted text preview:', extractedText.substring(0, 500));

    // Import audit generation logic
    const { generatePitchDeckAudit } = await import('./audit.js');
    
    // Generate audit using AI
    const auditResult = await generatePitchDeckAudit({
      fileName: file.originalname,
      fileType: file.mimetype,
      extractedText: extractedText,
      fileSize: file.size,
    });

    // Clean up uploaded file
    try {
      await fs.unlink(file.path);
      console.log('[PITCH DECK] Cleaned up file:', file.path);
    } catch (cleanupError) {
      console.warn('[PITCH DECK] Failed to clean up file:', cleanupError);
    }

    // Return audit result
    res.json(auditResult);
  } catch (error) {
    console.error('[PITCH DECK] Error processing audit:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch {}
    }
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process pitch deck audit'
    });
  }
};

// Export upload middleware and handler
export const uploadMiddleware = upload.single('file');
