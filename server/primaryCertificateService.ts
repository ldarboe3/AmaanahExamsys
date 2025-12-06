import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import {
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
} from './certificateTemplates';

interface StudentData {
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

interface SchoolData {
  id: number;
  name: string;
  address?: string | null;
}

interface ExamYearData {
  id: number;
  year: number;
  hijriYear?: string | null;
  examStartDate: Date | null;
  examEndDate: Date | null;
}

interface PrimaryCertificateData {
  student: StudentData;
  school: SchoolData;
  examYear: ExamYearData;
  finalGrade: string;
  qrToken: string;
  certificateNumber: string;
  verifyUrl: string;
  isReprint?: boolean;
}

const outputDir = path.join(process.cwd(), 'generated_certificates');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateMaleCertificateHTML(data: PrimaryCertificateData, qrDataUrl: string): string {
  const { student, school, examYear, finalGrade, certificateNumber, isReprint } = data;
  
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  const academicYear = `${examYear.year}/${examYear.year + 1}`;
  const gradeWordAr = getGradeWord(finalGrade);
  const schoolWithAddress = school.address ? `${school.name} - ${school.address}` : school.name;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial;margin:20px;text-align:right;direction:rtl}h1{text-align:center;font-size:18px}h2{text-align:center;font-size:16px}p{line-height:1.8;text-align:right}table{width:100%;margin:20px 0}</style></head><body><h1>شهادة إتمام دراسة المرحلة الابتدائية</h1><h2>GAMBIA MADRASSAH PRIMARY CERTIFICATE</h2><p>تشهد الأمانة العامة بأن الطالب/ <b>${fullName}</b></p><p>المولود في <b>${student.placeOfBirth || ''}</b> بتاريخ <b>${dobFormatted}</b></p><p>قد أتم دراسة المرحلة الابتدائية في <b>${schoolWithAddress}</b></p><p>بعد أن نجح في الامتحان النهائي الذي أشرفت عليه الأمانة العامة</p><p>في الفترة: <b>${academicYear}</b>، وكان تقديره: <b>${gradeWordAr}</b></p><p>سُجلت هذه الشهادة تحت رقم <b>${certificateNumber}</b></p><p>بتاريخ <b>${issueDateHijri}</b> الموافق <b>${issueDateGreg}</b></p><table><tr><td style="text-align:center"><img src="${qrDataUrl}" width="80" height="80"></td><td style="text-align:center">_____<br>التوقيع</td></tr></table></body></html>`;
}

function generateFemaleCertificateHTML(data: PrimaryCertificateData, qrDataUrl: string): string {
  const { student, school, examYear, finalGrade, certificateNumber, isReprint } = data;
  
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  const academicYear = `${examYear.year}/${examYear.year + 1}`;
  const gradeWordAr = getGradeWord(finalGrade);
  const schoolWithAddress = school.address ? `${school.name} - ${school.address}` : school.name;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial;margin:20px;text-align:right;direction:rtl}h1{text-align:center;font-size:18px}h2{text-align:center;font-size:16px}p{line-height:1.8;text-align:right}table{width:100%;margin:20px 0}</style></head><body><h1>شهادة إتمام دراسة المرحلة الابتدائية</h1><h2>GAMBIA MADRASSAH PRIMARY CERTIFICATE</h2><p>تشهد الأمانة العامة بأن الطالبة/ <b>${fullName}</b></p><p>المولودة في <b>${student.placeOfBirth || ''}</b> بتاريخ <b>${dobFormatted}</b></p><p>قد أتمت دراسة المرحلة الابتدائية في <b>${schoolWithAddress}</b></p><p>بعد أن نجحت في الامتحان النهائي الذي أشرفت عليه الأمانة العامة</p><p>في الفترة: <b>${academicYear}</b>، وكان تقديرها: <b>${gradeWordAr}</b></p><p>سُجلت هذه الشهادة تحت رقم <b>${certificateNumber}</b></p><p>بتاريخ <b>${issueDateHijri}</b> الموافق <b>${issueDateGreg}</b></p><table><tr><td style="text-align:center"><img src="${qrDataUrl}" width="80" height="80"></td><td style="text-align:center">_____<br>التوقيع</td></tr></table></body></html>`;
}

export async function generatePrimaryCertificatePDF(data: PrimaryCertificateData): Promise<string> {
  const { student, verifyUrl } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 130,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const htmlContent = student.gender === 'female' 
    ? generateFemaleCertificateHTML(data, qrDataUrl)
    : generateMaleCertificateHTML(data, qrDataUrl);

  const browser = await puppeteer.launch({
    headless: 'new' as any,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-resources']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    const fileName = `primary_cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      scale: 1,
      displayHeaderFooter: false
    });
    
    return filePath;
  } catch (error) {
    console.error(`PDF generation error for student ${student.id}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

export interface CertificateValidationResult {
  isValid: boolean;
  errors: string[];
  errorsAr: string[];
}

export function validateCertificateRequirements(student: StudentData): CertificateValidationResult {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (!student.gender || (student.gender !== 'male' && student.gender !== 'female')) {
    errors.push('Gender is required');
    errorsAr.push('يجب تحديد جنس الطالب/الطالبة');
  }

  if (!student.dateOfBirth) {
    errors.push('Date of birth is required');
    errorsAr.push('يجب إدخال تاريخ الميلاد');
  }

  if (!student.placeOfBirth) {
    errors.push('Place of birth is required');
    errorsAr.push('يجب إدخال مكان الميلاد');
  }

  if (!student.firstName || !student.lastName) {
    errors.push('Student name is required');
    errorsAr.push('يجب إدخال اسم الطالب/الطالبة');
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsAr
  };
}
