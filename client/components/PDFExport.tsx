import React from 'react';
import { AuditResponse } from '@shared/api';
import { Button } from '@/components/ui/button';
import { Download, FileText, Mail, Share2 } from 'lucide-react';

interface PDFExportProps {
  auditData: AuditResponse;
  className?: string;
}

export const PDFExport: React.FC<PDFExportProps> = ({ auditData, className = '' }) => {
  // Generate PDF using browser's print functionality
  const generatePDF = () => {
    // Create a new window with the audit data formatted for printing
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    
    if (!printWindow) {
      alert('Please allow popups to generate PDF');
      return;
    }

    const printContent = generatePrintContent(auditData);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  // Generate a shareable link for the PDF
  const generateShareableReport = async () => {
    try {
      // Create a formatted HTML report
      const reportContent = generateDetailedReport(auditData);
      
      // Create a blob and download it
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${auditData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_audit_report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    }
  };

  // Email the report
  const emailReport = () => {
    const subject = encodeURIComponent(`Brand Audit Report: ${auditData.title}`);
    const body = encodeURIComponent(`Hi,

I'm sharing the brand audit report for ${auditData.title}:

Overall Score: ${auditData.overallScore}%
Audit Date: ${auditData.date}

Key Findings:
${auditData.sections.slice(0, 3).map(section => 
  `• ${section.name}: ${section.score}% (${section.recommendations} recommendations)`
).join('\n')}

You can view the full interactive report here: ${window.location.href}

Best regards`);

    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button
        onClick={generatePDF}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Print Report
      </Button>
      
      <Button
        onClick={generateShareableReport}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Download HTML
      </Button>
      
      <Button
        onClick={emailReport}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Mail className="h-4 w-4" />
        Email Report
      </Button>
    </div>
  );
};

// Generate print-optimized content
function generatePrintContent(auditData: AuditResponse): string {
  const getScoreBadge = (score: number) => {
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
    return `<span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">${score}%</span>`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <title>${auditData.title} - Brand Audit Report</title>
    <meta charset="UTF-8">
    <style>
        @media print {
            body { 
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                line-height: 1.5;
                color: #374151;
            }
            .page-break { page-break-before: always; }
            .no-print { display: none; }
        }
        
        body {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3B82F6;
        }
        
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 8px;
        }
        
        .subtitle {
            font-size: 16px;
            color: #6B7280;
            margin-bottom: 12px;
        }
        
        .overall-score {
            font-size: 48px;
            font-weight: bold;
            color: #3B82F6;
            margin: 20px 0;
        }
        
        .summary-section {
            background-color: #F8FAFC;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid #E2E8F0;
        }
        
        .sections-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        @media (max-width: 600px) {
            .sections-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .section-card {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
            background-color: white;
        }
        
        .section-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .section-title {
            font-weight: 600;
            font-size: 16px;
            color: #1F2937;
        }
        
        .section-metrics {
            font-size: 12px;
            color: #6B7280;
            margin-top: 8px;
        }
        
        .details-section {
            margin-top: 40px;
        }
        
        .section-details {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #FAFBFC;
            border-radius: 8px;
            border: 1px solid #E2E8F0;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E2E8F0;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
        }
        
        h1, h2, h3 { color: #1F2937; }
        h2 { border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${auditData.title}</div>
        <div class="subtitle">${auditData.url}</div>
        <div class="subtitle">Audit Date: ${auditData.date}</div>
        <div class="overall-score">${auditData.overallScore}%</div>
        <div style="color: #6B7280;">Overall Brand Audit Score</div>
    </div>
    
    <div class="summary-section">
        <h2>Executive Summary</h2>
        <p>${auditData.summary || 'This comprehensive brand audit evaluates key aspects of digital presence and provides actionable recommendations for improvement.'}</p>
    </div>
    
    <h2>Section Scores Overview</h2>
    <div class="sections-grid">
        ${auditData.sections.map(section => `
            <div class="section-card">
                <div class="section-header">
                    <div class="section-title">${section.name}</div>
                    <div>${getScoreBadge(section.score)}</div>
                </div>
                <div class="section-metrics">
                    ${section.issues} issues found • ${section.recommendations} recommendations
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="page-break"></div>
    
    <div class="details-section">
        <h1>Detailed Analysis & Recommendations</h1>
        
        ${auditData.sections.map(section => `
            <div class="section-details">
                <h2>${section.name} ${getScoreBadge(section.score)}</h2>
                <div style="margin-bottom: 10px;">
                    <strong>Issues Found:</strong> ${section.issues} | 
                    <strong>Recommendations:</strong> ${section.recommendations}
                </div>
                <div style="white-space: pre-wrap; text-align: justify;">
                    ${section.details || 'Detailed analysis and recommendations for this section.'}
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <p>This report was generated on ${new Date().toLocaleDateString()} using professional brand audit analysis.</p>
        <p>For the interactive version of this report, visit: ${window.location.href}</p>
    </div>
</body>
</html>`;
}

// Generate detailed HTML report for download
function generateDetailedReport(auditData: AuditResponse): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${auditData.title} - Brand Audit Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #F9FAFB;
        }
        
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #3B82F6;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 18px;
            color: #6B7280;
            margin-bottom: 15px;
        }
        
        .score-display {
            display: inline-block;
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 36px;
            font-weight: bold;
            margin: 20px 0;
        }
        
        .summary {
            background: #F0F9FF;
            border: 1px solid #0EA5E9;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 40px;
        }
        
        .sections-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .section-card {
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
        }
        
        .section-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .section-title {
            font-weight: 600;
            font-size: 18px;
            color: #1F2937;
        }
        
        .score-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            color: white;
        }
        
        .score-excellent { background-color: #10B981; }
        .score-good { background-color: #F59E0B; }
        .score-needs-improvement { background-color: #EF4444; }
        
        .section-metrics {
            color: #6B7280;
            font-size: 14px;
        }
        
        .detailed-analysis {
            margin-top: 50px;
        }
        
        .section-detail {
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .section-detail h2 {
            color: #1F2937;
            border-bottom: 2px solid #3B82F6;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .analysis-content {
            white-space: pre-wrap;
            text-align: justify;
            color: #4B5563;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
        }
        
        @media (max-width: 768px) {
            .container { padding: 20px; }
            .title { font-size: 24px; }
            .score-display { font-size: 28px; padding: 15px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">${auditData.title}</div>
            <div class="subtitle">${auditData.url}</div>
            <div class="subtitle">Generated on ${auditData.date}</div>
            <div class="score-display">${auditData.overallScore}%</div>
            <div style="color: #6B7280; margin-top: 10px;">Overall Brand Audit Score</div>
        </div>
        
        <div class="summary">
            <h2 style="color: #0EA5E9; margin-top: 0;">Executive Summary</h2>
            <p>${auditData.summary || 'This comprehensive brand audit provides detailed analysis and actionable recommendations to enhance your digital presence and brand effectiveness.'}</p>
        </div>
        
        <h2>Section Performance Overview</h2>
        <div class="sections-overview">
            ${auditData.sections.map(section => {
              const scoreClass = section.score >= 80 ? 'score-excellent' : 
                                section.score >= 60 ? 'score-good' : 'score-needs-improvement';
              return `
                <div class="section-card">
                    <div class="section-header">
                        <div class="section-title">${section.name}</div>
                        <div class="score-badge ${scoreClass}">${section.score}%</div>
                    </div>
                    <div class="section-metrics">
                        ${section.issues} issues identified<br>
                        ${section.recommendations} recommendations provided
                    </div>
                </div>
              `;
            }).join('')}
        </div>
        
        <div class="detailed-analysis">
            <h1 style="color: #1F2937; text-align: center; margin-bottom: 40px;">
                Detailed Analysis & Recommendations
            </h1>
            
            ${auditData.sections.map(section => {
              const scoreClass = section.score >= 80 ? 'score-excellent' : 
                                section.score >= 60 ? 'score-good' : 'score-needs-improvement';
              return `
                <div class="section-detail">
                    <h2>${section.name} 
                        <span class="score-badge ${scoreClass}" style="float: right;">${section.score}%</span>
                    </h2>
                    <div style="margin-bottom: 20px; color: #6B7280;">
                        <strong>Analysis Summary:</strong> ${section.issues} issues found, ${section.recommendations} recommendations provided
                    </div>
                    <div class="analysis-content">
                        ${section.details || 'Detailed analysis and strategic recommendations for this section will help improve your brand performance and digital presence.'}
                    </div>
                </div>
              `;
            }).join('')}
        </div>
        
        <div class="footer">
            <h3 style="color: #1F2937;">About This Report</h3>
            <p>This comprehensive brand audit was generated using advanced AI analysis and industry benchmarks. 
               The recommendations are based on current best practices and proven strategies for digital brand enhancement.</p>
            <p style="margin-top: 20px; font-size: 14px;">
                Report generated on ${new Date().toLocaleDateString()} • 
                Interactive version available at: <a href="${window.location.href}" style="color: #3B82F6;">${window.location.href}</a>
            </p>
        </div>
    </div>
</body>
</html>`;
}

export default PDFExport;
