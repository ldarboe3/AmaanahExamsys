import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from '../server/db';
import { schools, students, subjects, studentResults } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

function cleanArabicText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let s = text;
  s = s.normalize('NFC');
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  s = s.replace(/[\u0622\u0623\u0625]/g, '\u0627');
  s = s.replace(/\u0629/g, '\u0647');
  s = s.replace(/\u0649/g, '\u064A');
  s = s.replace(/\s+/g, ' ');
  s = s.trim();
  s = s.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');
  s = s.replace(/[\u2060-\u206F]/g, '');
  s = s.replace(/\u0640/g, '');
  s = s.toLowerCase();
  return s;
}

function calculateGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

function fuzzyMatch(str1: string, str2: string): boolean {
  if (str1 === str2) return true;
  if (str1.includes(str2) || str2.includes(str1)) {
    const shorterLen = Math.min(str1.length, str2.length);
    const longerLen = Math.max(str1.length, str2.length);
    return shorterLen / longerLen >= 0.5;
  }
  return false;
}

async function importResults() {
  const EXAM_YEAR_ID = 10;
  const GRADE_LEVEL = 6;
  const CSV_PATH = 'attached_assets/Amaanah_G6_2025_result_1765611119939.csv';

  console.log('Starting Grade 6 results import (with student creation)...');
  console.log('Exam Year ID:', EXAM_YEAR_ID);
  console.log('Grade Level:', GRADE_LEVEL);

  let csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }

  const workbook = XLSX.read(csvContent, { type: 'string', codepage: 65001 });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

  console.log(`Parsed ${rows.length} rows from CSV`);

  const allSchools = await db.select().from(schools);
  console.log(`Found ${allSchools.length} schools in database`);

  const schoolMap = new Map<string, number>();
  const schoolNameList: { normalized: string; id: number; original: string }[] = [];
  for (const school of allSchools) {
    const normalized = cleanArabicText(school.name);
    schoolMap.set(normalized, school.id);
    schoolNameList.push({ normalized, id: school.id, original: school.name });
  }

  const allStudents = await db.select().from(students).where(eq(students.grade, GRADE_LEVEL));
  console.log(`Found ${allStudents.length} existing Grade ${GRADE_LEVEL} students in database`);

  const studentsBySchool = new Map<number, { id: number; normalized: string; original: string }[]>();
  for (const student of allStudents) {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    const normalized = cleanArabicText(fullName);
    const schoolId = student.schoolId;
    if (!studentsBySchool.has(schoolId)) {
      studentsBySchool.set(schoolId, []);
    }
    studentsBySchool.get(schoolId)!.push({ id: student.id, normalized, original: fullName });
  }

  const dbSubjects = await db.select().from(subjects).where(eq(subjects.grade, GRADE_LEVEL));
  console.log(`Found ${dbSubjects.length} Grade ${GRADE_LEVEL} subjects in database`);

  const subjectMap = new Map<string, number>();
  for (const subject of dbSubjects) {
    subjectMap.set(cleanArabicText(subject.name), subject.id);
    if (subject.arabicName) {
      subjectMap.set(cleanArabicText(subject.arabicName), subject.id);
    }
  }

  const metadataColumns = [
    'student name', 'school name', 'address', 'region', 'cluster',
    'المجموع', 'النسبة%', 'التقدير', 'المجموع', 'النسبه%', 'النسبة'
  ];

  const firstRow = rows[0];
  const allColumns = Object.keys(firstRow);

  const subjectColumns: { colName: string; subjectId: number }[] = [];
  for (const col of allColumns) {
    const normalizedCol = cleanArabicText(col);
    if (metadataColumns.some(m => normalizedCol.includes(cleanArabicText(m)))) continue;
    if (normalizedCol.length < 2) continue;

    const subjectId = subjectMap.get(normalizedCol);
    if (subjectId) {
      subjectColumns.push({ colName: col, subjectId });
      console.log(`Mapped column "${col}" -> subject ID ${subjectId}`);
    }
  }

  console.log(`Matched ${subjectColumns.length} subject columns`);

  let resultsCreated = 0;
  let resultsUpdated = 0;
  let studentsMatched = 0;
  let studentsCreated = 0;
  let schoolsNotFound = 0;
  const unmatchedSchools = new Set<string>();
  const createdStudentCache = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const schoolName = row['School name'] || row['school name'] || '';
    const studentName = row['Student Name'] || row['Student name'] || row['student name'] || '';

    if (!schoolName.trim() || !studentName.trim()) continue;

    const normalizedSchoolName = cleanArabicText(schoolName);
    let schoolId = schoolMap.get(normalizedSchoolName);

    if (!schoolId) {
      for (const school of schoolNameList) {
        if (fuzzyMatch(normalizedSchoolName, school.normalized)) {
          schoolId = school.id;
          break;
        }
      }
    }

    if (!schoolId) {
      schoolsNotFound++;
      unmatchedSchools.add(schoolName.trim());
      continue;
    }

    const normalizedStudentName = cleanArabicText(studentName);
    const studentCacheKey = `${schoolId}_${normalizedStudentName}`;
    
    let studentId: number | undefined = createdStudentCache.get(studentCacheKey);

    if (!studentId) {
      const schoolStudents = studentsBySchool.get(schoolId) || [];
      
      for (const student of schoolStudents) {
        if (student.normalized === normalizedStudentName) {
          studentId = student.id;
          break;
        }
      }

      if (!studentId) {
        for (const student of schoolStudents) {
          if (fuzzyMatch(normalizedStudentName, student.normalized)) {
            studentId = student.id;
            break;
          }
        }
      }
    }

    if (!studentId) {
      const nameParts = studentName.trim().split(/\s+/);
      const firstName = nameParts[0] || studentName.trim();
      const lastName = nameParts.slice(1).join(' ') || '';

      const [newStudent] = await db.insert(students).values({
        firstName,
        lastName,
        schoolId,
        grade: GRADE_LEVEL,
        examYearId: EXAM_YEAR_ID,
        status: 'approved',
        gender: 'male',
      }).returning();

      studentId = newStudent.id;
      studentsCreated++;
      createdStudentCache.set(studentCacheKey, studentId);

      if (!studentsBySchool.has(schoolId)) {
        studentsBySchool.set(schoolId, []);
      }
      studentsBySchool.get(schoolId)!.push({
        id: studentId,
        normalized: normalizedStudentName,
        original: studentName.trim()
      });
    } else {
      studentsMatched++;
    }

    for (const { colName, subjectId } of subjectColumns) {
      const rawValue = row[colName];
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      const score = parseFloat(rawValue);
      if (isNaN(score) || score < 0 || score > 100) continue;

      const existing = await db.select().from(studentResults)
        .where(and(
          eq(studentResults.studentId, studentId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.examYearId, EXAM_YEAR_ID)
        ));

      if (existing.length > 0) {
        await db.update(studentResults)
          .set({
            score: score.toFixed(2),
            grade: calculateGrade(score),
            status: 'pending',
            updatedAt: new Date()
          })
          .where(and(
            eq(studentResults.studentId, studentId),
            eq(studentResults.subjectId, subjectId),
            eq(studentResults.examYearId, EXAM_YEAR_ID)
          ));
        resultsUpdated++;
      } else {
        await db.insert(studentResults).values({
          studentId,
          subjectId,
          examYearId: EXAM_YEAR_ID,
          score: score.toFixed(2),
          grade: calculateGrade(score),
          status: 'pending',
          remarks: null
        });
        resultsCreated++;
      }
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/${rows.length} rows...`);
    }
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Students matched (existing): ${studentsMatched}`);
  console.log(`Students created (new): ${studentsCreated}`);
  console.log(`Schools not found: ${schoolsNotFound}`);
  console.log(`Results created: ${resultsCreated}`);
  console.log(`Results updated: ${resultsUpdated}`);
  console.log(`Total results: ${resultsCreated + resultsUpdated}`);
  
  if (unmatchedSchools.size > 0) {
    console.log('\nUnmatched schools (need to be created manually):');
    Array.from(unmatchedSchools).forEach(s => console.log('  -', s));
  }

  process.exit(0);
}

importResults().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
