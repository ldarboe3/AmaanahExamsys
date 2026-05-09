/**
 * Certificate Service — entry point for certificate, transcript, and result slip generation.
 *
 * Certificate generation is dispatched to server/certificates/<gradeN>.ts
 * Transcript generation is dispatched to server/transcripts/<gradeN>.ts
 * Each grade's template lives in its own file for independent customization.
 *
 * Result slip generation (for the public result checker) lives here because
 * it is not grade-specific and does not need per-grade customization.
 */
import path from 'path';
import fs from 'fs';
import { getSharedBrowser } from './chromiumHelper';
import { generateCertificateNumber, generateQRToken } from './certificateTemplates';

// Re-export grade-based dispatchers (routes.ts imports these via dynamic import)
export { generateCertificatePDF } from './certificates/index';
export { generateTranscriptPDF } from './transcripts/index';
export { generateCertificateNumber, generateQRToken };

// ── Result Slip PDF (public result checker — not grade-specific) ──────────────

interface ResultSlipData {
  student: {
    indexNumber: string | null;
    fullName: string;
    schoolEn: string;
    schoolAr: string;
    grade: number;
    levelEn: string;
    levelAr: string;
    examYear: string;
  };
  results: Array<{
    subjectEn: string;
    subjectAr: string;
    score: number;
    maxScore: number;
    grade: string;
    status: string;
    statusAr: string;
  }>;
  summary: {
    totalScore: number;
    maxPossibleScore: number;
    averageScore: number;
    subjectCount: number;
    passedCount: number;
    failedCount: number;
  };
  overallStatus: string;
  overallStatusAr: string;
}

const outputDir = path.join(process.cwd(), 'generated_certificates');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

export async function generateResultSlipPDF(data: ResultSlipData): Promise<string> {
  const { student, results, summary, overallStatus, overallStatusAr } = data;

  const resultRows = results.map((result, index) => `
    <tr>
      <td class="num-cell">${index + 1}</td>
      <td class="subject-cell-ar">${result.subjectAr}</td>
      <td class="subject-cell-en">${result.subjectEn}</td>
      <td class="score-cell">${result.score}</td>
      <td class="grade-cell ${result.grade === 'A' || result.grade === 'B' ? 'grade-pass' : result.grade === 'F' ? 'grade-fail' : ''}">${result.grade}</td>
      <td class="status-cell ${result.status === 'PASSED' ? 'status-pass' : 'status-fail'}">${result.status} / ${result.statusAr}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; line-height: 1.4; background: #fff; padding: 20px; }
        .container { max-width: 210mm; margin: 0 auto; background: white; border: 2px solid #1E8F4D; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1E8F4D 0%, #0F5A2F 100%); color: white; padding: 20px; text-align: center; }
        .header h1 { font-size: 22pt; font-weight: bold; margin-bottom: 5px; }
        .header h2 { font-family: 'Amiri', 'Noto Naskh Arabic', serif; font-size: 20pt; margin-bottom: 10px; direction: rtl; }
        .header .subtitle { font-size: 10pt; opacity: 0.9; }
        .header .title-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 20px; margin-top: 10px; font-size: 12pt; font-weight: bold; }
        .content { padding: 20px; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8faf8; border-radius: 8px; border: 1px solid #e0e0e0; }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 9pt; color: #666; margin-bottom: 3px; }
        .info-value { font-size: 11pt; font-weight: 600; color: #333; }
        .info-value-ar { font-family: 'Amiri', 'Noto Naskh Arabic', serif; direction: rtl; text-align: right; }
        .results-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
        .results-table th { background: #1E8F4D; color: white; padding: 10px 8px; text-align: center; font-weight: 600; }
        .results-table td { padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center; }
        .results-table tr:nth-child(even) { background: #f8faf8; }
        .results-table tr:hover { background: #e8f5e9; }
        .num-cell { width: 30px; font-weight: bold; color: #666; }
        .subject-cell-ar { font-family: 'Amiri', 'Noto Naskh Arabic', serif; direction: rtl; text-align: right; font-size: 11pt; }
        .subject-cell-en { text-align: left; }
        .score-cell { font-weight: bold; font-size: 11pt; }
        .grade-cell { font-weight: bold; font-size: 12pt; }
        .grade-pass { color: #1E8F4D; }
        .grade-fail { color: #dc3545; }
        .status-pass { color: #1E8F4D; font-weight: 600; }
        .status-fail { color: #dc3545; font-weight: 600; }
        .summary-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .summary-card { text-align: center; padding: 15px; border-radius: 8px; background: #f8faf8; border: 1px solid #e0e0e0; }
        .summary-card.total { background: linear-gradient(135deg, #1E8F4D 0%, #0F5A2F 100%); color: white; border: none; }
        .summary-card.passed { border-color: #1E8F4D; }
        .summary-card.failed { border-color: #dc3545; }
        .summary-value { font-size: 20pt; font-weight: bold; margin-bottom: 5px; }
        .summary-card.passed .summary-value { color: #1E8F4D; }
        .summary-card.failed .summary-value { color: #dc3545; }
        .summary-label { font-size: 9pt; color: #666; }
        .summary-card.total .summary-label { color: rgba(255,255,255,0.8); }
        .overall-result { text-align: center; padding: 20px; background: ${overallStatus === 'PASSED' ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'}; border-radius: 8px; margin-bottom: 20px; border: 2px solid ${overallStatus === 'PASSED' ? '#1E8F4D' : '#dc3545'}; }
        .overall-result h3 { font-size: 16pt; color: ${overallStatus === 'PASSED' ? '#1E8F4D' : '#dc3545'}; margin-bottom: 5px; }
        .overall-result .ar { font-family: 'Amiri', 'Noto Naskh Arabic', serif; font-size: 18pt; color: ${overallStatus === 'PASSED' ? '#0F5A2F' : '#c62828'}; }
        .footer { text-align: center; padding: 15px; background: #f5f5f5; border-top: 1px solid #e0e0e0; font-size: 9pt; color: #666; }
        .footer .date { font-weight: 600; margin-bottom: 5px; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80pt; color: rgba(30, 143, 77, 0.05); font-weight: bold; pointer-events: none; z-index: -1; }
      </style>
    </head>
    <body>
      <div class="watermark">AMAANAH</div>
      <div class="container">
        <div class="header">
          <h2>الأمانة العامة للتعليم الإسلامي والعربي</h2>
          <h1>AMAANAH - General Secretariat for Islamic &amp; Arabic Education</h1>
          <div class="subtitle">The Gambia | غامبيا</div>
          <div class="title-badge">EXAMINATION RESULT SLIP / كشف نتائج الامتحان</div>
        </div>
        <div class="content">
          <div class="student-info">
            <div class="info-item">
              <span class="info-label">Index Number / رقم الجلوس</span>
              <span class="info-value">${student.indexNumber || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Candidate Name / اسم المرشح</span>
              <span class="info-value">${student.fullName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">School / المدرسة</span>
              <span class="info-value">${student.schoolEn}</span>
              <span class="info-value info-value-ar">${student.schoolAr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Grade Level / المستوى</span>
              <span class="info-value">${student.levelEn}</span>
              <span class="info-value info-value-ar">${student.levelAr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Exam Year / سنة الامتحان</span>
              <span class="info-value">${student.examYear}</span>
            </div>
          </div>
          <table class="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المادة (Arabic)</th>
                <th>Subject (English)</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status / الحالة</th>
              </tr>
            </thead>
            <tbody>${resultRows}</tbody>
          </table>
          <div class="summary-section">
            <div class="summary-card total">
              <div class="summary-value">${summary.averageScore}%</div>
              <div class="summary-label">Average / المعدل</div>
            </div>
            <div class="summary-card passed">
              <div class="summary-value">${summary.passedCount}</div>
              <div class="summary-label">Passed / ناجح</div>
            </div>
            <div class="summary-card failed">
              <div class="summary-value">${summary.failedCount}</div>
              <div class="summary-label">Failed / راسب</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${summary.totalScore}/${summary.maxPossibleScore}</div>
              <div class="summary-label">Total Score / المجموع</div>
            </div>
          </div>
          <div class="overall-result">
            <h3>OVERALL RESULT: ${overallStatus}</h3>
            <div class="ar">النتيجة النهائية: ${overallStatusAr}</div>
          </div>
        </div>
        <div class="footer">
          <div class="date">Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          <div>This is an unofficial result slip. For official certificates, please contact AMAANAH office.</div>
          <div>هذا كشف نتائج غير رسمي. للحصول على الشهادات الرسمية، يرجى التواصل مع مكتب الأمانة.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await getSharedBrowser();
  const page    = await browser.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const fileName = `result_slip_${student.indexNumber || 'unknown'}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    await page.pdf({ path: filePath, format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
    return filePath;
  } finally {
    await page.close();
  }
}
