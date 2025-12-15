import { db } from '../server/db';
import { schools, students, subjects, studentResults, regions, clusters } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

function clean(text: string): string {
  if (!text) return '';
  let s = text.normalize('NFC');
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  s = s.replace(/[\u0622\u0623\u0625]/g, '\u0627');
  s = s.replace(/\u0629/g, '\u0647');
  s = s.replace(/\u0649/g, '\u064A');
  s = s.replace(/[\u200B-\u200F\uFEFF\u2060-\u206F\u0640]/g, '');
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  return s;
}

function grade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

async function run() {
  const EXAM_YEAR = 10, GRADE = 6;
  console.log('=== FULL IMPORT START ===');

  const workbook = XLSX.readFile('attached_assets/Amaanah_G6_1765840099034.xls');
  const sheet = workbook.Sheets['total'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  
  const headers = data[0];
  const rows = data.slice(1).filter(r => r[0] && r[1]);
  console.log(`Rows: ${rows.length}`);

  // Get column indices
  const cols = {
    name: 0, school: 1, location: 2, region: 3,
    subjects: headers.slice(4).map((h: string, i: number) => ({ name: h, idx: i + 4 }))
      .filter((s: any) => s.name && !['المجموع', 'النسبة', 'التقدير'].some(x => s.name.includes(x)))
  };

  // Load DB data
  const dbSchools = await db.select().from(schools);
  const dbSubjects = await db.select().from(subjects).where(eq(subjects.grade, GRADE));
  const dbRegions = await db.select().from(regions);
  const dbClusters = await db.select().from(clusters);

  // Maps
  const schoolMap = new Map(dbSchools.map(s => [clean(s.name), s.id]));
  const subjectMap = new Map<string, number>();
  dbSubjects.forEach(s => {
    subjectMap.set(clean(s.name), s.id);
    if (s.arabicName) subjectMap.set(clean(s.arabicName), s.id);
  });

  // Match subjects
  const subjectCols: { idx: number; id: number }[] = [];
  for (const col of cols.subjects) {
    const id = subjectMap.get(clean(col.name));
    if (id) subjectCols.push({ idx: col.idx, id });
  }
  console.log(`Matched ${subjectCols.length} subjects`);

  // Get default region/cluster
  const defaultRegion = dbRegions[0]?.id || 340;
  const defaultCluster = dbClusters[0]?.id || 49;

  // Track created schools
  const newSchools = new Map<string, number>();
  const studentCache = new Map<string, number>();
  let indexCounter = 1;

  let created = 0, matched = 0, results = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const studentName = (row[0] || '').trim();
    const schoolName = (row[1] || '').trim();
    const location = (row[2] || '').trim();

    if (!studentName || !schoolName) continue;

    // Find or create school
    let schoolId = schoolMap.get(clean(schoolName)) || newSchools.get(clean(schoolName));
    
    if (!schoolId) {
      // Create school
      const [newSchool] = await db.insert(schools).values({
        name: schoolName,
        registrarName: 'Auto Import',
        email: `import_${Date.now()}_${i}@temp.local`,
        address: location || 'Unknown',
        schoolType: 'LBS',
        regionId: defaultRegion,
        clusterId: defaultCluster,
        status: 'approved',
        isEmailVerified: true,
      }).returning();
      schoolId = newSchool.id;
      newSchools.set(clean(schoolName), schoolId);
      schoolMap.set(clean(schoolName), schoolId);
    }

    // Find or create student
    const studentKey = `${schoolId}_${clean(studentName)}`;
    let studentId = studentCache.get(studentKey);

    if (!studentId) {
      // Check existing
      const existing = await db.select().from(students)
        .where(and(eq(students.schoolId, schoolId), eq(students.grade, GRADE)))
        .limit(500);
      
      const match = existing.find(s => 
        clean(`${s.firstName} ${s.lastName}`) === clean(studentName)
      );

      if (match) {
        studentId = match.id;
        matched++;
        
        // Update to approved with index if missing
        if (!match.indexNumber || match.status !== 'approved') {
          await db.update(students).set({
            status: 'approved',
            indexNumber: match.indexNumber || String(indexCounter++).padStart(6, '0')
          }).where(eq(students.id, studentId));
        }
      } else {
        // Create student
        const parts = studentName.split(/\s+/);
        const [newStudent] = await db.insert(students).values({
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || parts[0],
          schoolId,
          grade: GRADE,
          examYearId: EXAM_YEAR,
          status: 'approved',
          gender: 'male',
          indexNumber: String(indexCounter++).padStart(6, '0')
        }).returning();
        studentId = newStudent.id;
        created++;
      }
      studentCache.set(studentKey, studentId);
    }

    // Insert results
    for (const { idx, id: subjectId } of subjectCols) {
      const val = parseFloat(row[idx]);
      if (isNaN(val) || val < 0 || val > 100) continue;

      const existing = await db.select({ id: studentResults.id }).from(studentResults)
        .where(and(
          eq(studentResults.studentId, studentId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.examYearId, EXAM_YEAR)
        )).limit(1);

      if (existing.length > 0) {
        await db.update(studentResults).set({
          score: val.toFixed(2),
          grade: grade(val),
          updatedAt: new Date()
        }).where(eq(studentResults.id, existing[0].id));
      } else {
        await db.insert(studentResults).values({
          studentId,
          subjectId,
          examYearId: EXAM_YEAR,
          score: val.toFixed(2),
          grade: grade(val),
          status: 'pending'
        });
      }
      results++;
    }

    if ((i + 1) % 50 === 0) console.log(`${i + 1}/${rows.length}...`);
  }

  console.log('\n=== DONE ===');
  console.log(`Schools created: ${newSchools.size}`);
  console.log(`Students matched: ${matched}`);
  console.log(`Students created: ${created}`);
  console.log(`Results: ${results}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
