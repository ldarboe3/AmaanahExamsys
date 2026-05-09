/**
 * Shared transcript types and the generic HTML-based transcript generator.
 *
 * Grades 3, 9, and 12 use this generic HTML template rendered via Chromium.
 * Grade 6 has its own dedicated file (grade6.ts) that uses the specialized
 * bilingual template from transcriptService.ts.
 *
 * To create a specialized transcript for any grade:
 *   1. Open that grade's file (e.g. grade9.ts)
 *   2. Replace the call to `generateGenericTranscriptPDF` with your own
 *      HTML template — use grade6TranscriptHTML.ts as a reference.
 */
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { getSharedBrowser } from '../chromiumHelper';
import { getGradeConfig, getGradeLabelArabic, isEnglishSubject } from '../transcriptTemplates';

export const TRANSCRIPT_OUTPUT_DIR = path.join(process.cwd(), 'generated_certificates');
if (!fs.existsSync(TRANSCRIPT_OUTPUT_DIR)) fs.mkdirSync(TRANSCRIPT_OUTPUT_DIR, { recursive: true });

// ── Shared data types ─────────────────────────────────────────────────────────

export interface TranscriptSubject {
  name: string;
  arabicName: string | null;
  score: number;
  grade: string;
  maxScore: number;
  passingScore?: number;
}

export interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  gender: 'male' | 'female';
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  grade: number;
  indexNumber: string | null;
}

export interface SchoolData {
  id: number;
  name: string;
}

export interface ExamYearData {
  id: number;
  year: number;
  examStartDate: Date | null;
  examEndDate: Date | null;
}

export interface TranscriptData {
  student: StudentData;
  school: SchoolData;
  examYear: ExamYearData;
  subjects: TranscriptSubject[];
  totalScore: number;
  average: number;
  finalGrade: string;
  qrToken: string;
  transcriptNumber: string;
  verifyUrl: string;
  isReprint?: boolean;
}

// ── Generic HTML transcript (Chromium-rendered) ───────────────────────────────

export async function generateGenericTranscriptPDF(data: TranscriptData): Promise<string> {
  const { student, school, examYear, subjects, totalScore, average, finalGrade, transcriptNumber, verifyUrl, isReprint } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 80,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const fullName   = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const gradeConfig = getGradeConfig(student.grade);
  const gradeLabel  = getGradeLabelArabic(student.grade);

  const subjectRows = subjects.map((subject, index) => {
    const subjectName = subject.arabicName || subject.name;
    const isEnglish   = isEnglishSubject(subjectName);
    return `
    <tr>
      <td class="score-cell">${subject.score || ''}</td>
      <td class="score-cell">${subject.passingScore || 50}</td>
      <td class="score-cell">${subject.maxScore || 100}</td>
      <td class="${isEnglish ? 'subject-cell ltr-text' : 'subject-cell'}">${subjectName}</td>
      <td class="num-cell">${index + 1}</td>
    </tr>`;
  }).join('');

  const maxPossibleScore = subjects.length * 100;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Amiri', 'Noto Naskh Arabic', serif; font-size: 13px; direction: rtl; background: white; }
        .transcript-page { width: 210mm; min-height: 297mm; padding: 15mm; position: relative; background: white; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1E8F4D; padding-bottom: 15px; }
        .header-left { text-align: left; direction: ltr; font-size: 11px; line-height: 1.5; width: 35%; }
        .header-right { text-align: right; font-size: 12px; line-height: 1.6; width: 35%; }
        .header-center { text-align: center; width: 30%; }
        .org-title { font-weight: bold; color: #0F5A2F; }
        .dept-title { color: #1E8F4D; font-weight: bold; margin-top: 8px; }
        .student-info { margin: 15px 0; padding: 10px 15px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; }
        .info-row { display: flex; margin: 8px 0; font-size: 14px; }
        .info-label { font-weight: bold; min-width: 120px; }
        .info-value { color: #0F5A2F; flex: 1; border-bottom: 1px dotted #999; padding-bottom: 2px; }
        .results-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
        .results-table th { background: #1E8F4D; color: white; padding: 10px 8px; border: 1px solid #0F5A2F; font-weight: bold; }
        .results-table td { padding: 8px; border: 1px solid #ddd; text-align: center; }
        .results-table tbody tr:nth-child(even) { background: #f9f9f9; }
        .subject-cell { text-align: right; padding-right: 15px !important; }
        .ltr-text { direction: ltr; text-align: left; padding-left: 15px !important; padding-right: 8px !important; }
        .num-cell { width: 40px; font-weight: bold; }
        .score-cell { width: 80px; }
        .summary-row { background: #e8f5e9 !important; font-weight: bold; }
        .summary-row td { border-top: 2px solid #1E8F4D; }
        .footer-section { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; }
        .signature-block { text-align: center; width: 45%; }
        .signature-title { font-weight: bold; margin-bottom: 40px; }
        .signature-line { border-top: 1px dotted #333; width: 150px; margin: 0 auto; }
        .qr-section { position: absolute; bottom: 20mm; left: 20mm; text-align: center; }
        .qr-section img { width: 60px; height: 60px; }
        .qr-label { font-size: 9px; color: #666; margin-top: 3px; }
        .reprint-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 70px; color: rgba(30, 143, 77, 0.12); font-weight: bold; pointer-events: none; z-index: 1; }
        .grade-indicator { text-align: center; font-size: 16px; font-weight: bold; color: #1E8F4D; margin: 10px 0; padding: 8px; background: #e8f5e9; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="transcript-page">
        ${isReprint ? '<div class="reprint-watermark">إعادة طباعة</div>' : ''}
        <div class="header">
          <div class="header-left">
            <div class="org-title">The General Secretariat for</div>
            <div>Islamic/Arabic Education in</div>
            <div>The Gambia</div>
            <div class="dept-title" style="margin-top: 10px;">Examination affairs unit</div>
          </div>
          <div class="header-center"></div>
          <div class="header-right">
            <div class="org-title">الأمانة العامة للتعليم الإسلامي العربي</div>
            <div>في غامبيا</div>
            <div class="dept-title">قسم الامتحانات</div>
          </div>
        </div>
        <div class="grade-indicator">
          ${gradeConfig?.certificateTitleArabic || 'كشف الدرجات'} - ${gradeLabel}
        </div>
        <div class="student-info">
          <div class="info-row"><span class="info-label">اسم الطالب\\ة:</span><span class="info-value">${fullName}</span></div>
          <div class="info-row"><span class="info-label">الجنسية:</span><span class="info-value">${student.placeOfBirth || 'غامبية'}</span></div>
          <div class="info-row"><span class="info-label">المدرسة:</span><span class="info-value">${school.name}</span></div>
          <div class="info-row"><span class="info-label">رقم القيد:</span><span class="info-value">${student.indexNumber || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">العام الدراسي:</span><span class="info-value">${examYear.year}</span></div>
        </div>
        <table class="results-table">
          <thead>
            <tr>
              <th colspan="3">الدرجات المكتسبة</th>
              <th rowspan="2">المادة</th>
              <th rowspan="2">م</th>
            </tr>
            <tr>
              <th>رقماً</th>
              <th>الصغرى</th>
              <th>الكبرى</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
            <tr class="summary-row">
              <td>${totalScore}</td>
              <td>-</td>
              <td>${maxPossibleScore}</td>
              <td>المجموع الكلي</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
        <div style="text-align: center; margin: 10px 0; font-size: 14px;">
          <strong>المعدل: ${average.toFixed(1)}%</strong> &nbsp;|&nbsp;
          <strong>التقدير: ${finalGrade}</strong>
        </div>
        <div class="footer-section">
          <div class="signature-block">
            <div class="signature-title">توقيع مدير المدرسة</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-block">
            <div class="signature-title">توقيع رئيس الأمانة</div>
            <div class="signature-line"></div>
          </div>
        </div>
        <div class="qr-section">
          <img src="${qrDataUrl}" alt="QR Code" />
          <div class="qr-label">${transcriptNumber}</div>
        </div>
      </div>
    </body>
    </html>`;

  const browser = await getSharedBrowser();
  const page    = await browser.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const fileName = `transcript_${student.indexNumber || student.id}_g${student.grade}_${Date.now()}.pdf`;
    const filePath = path.join(TRANSCRIPT_OUTPUT_DIR, fileName);
    await page.pdf({ path: filePath, format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    return filePath;
  } finally {
    await page.close();
  }
}
