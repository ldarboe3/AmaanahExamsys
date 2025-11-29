import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'system_admin', 
  'school_admin',
  'student_parent',
  'examiner',
  'center_admin'
]);

export const schoolTypeEnum = pgEnum('school_type', ['LBS', 'UBS', 'BCS', 'SSS']);
export const schoolStatusEnum = pgEnum('school_status', ['pending', 'verified', 'approved', 'rejected']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'paid', 'failed']);
export const studentStatusEnum = pgEnum('student_status', ['pending', 'approved', 'rejected']);
export const resultStatusEnum = pgEnum('result_status', ['pending', 'validated', 'published']);
export const examinerStatusEnum = pgEnum('examiner_status', ['pending', 'verified', 'active', 'inactive']);
export const genderEnum = pgEnum('gender', ['male', 'female']);

// Session storage table (IMPORTANT: mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (IMPORTANT: mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('school_admin'),
  schoolId: integer("school_id"),
  centerId: integer("center_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Regions
export const regions = pgTable("regions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clusters (sub-regions)
export const clusters = pgTable("clusters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  regionId: integer("region_id").notNull().references(() => regions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Examination Years
export const examYears = pgTable("exam_years", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  year: integer("year").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  hijriYear: varchar("hijri_year", { length: 50 }),
  isActive: boolean("is_active").default(false),
  registrationStartDate: timestamp("registration_start_date"),
  registrationEndDate: timestamp("registration_end_date"),
  examStartDate: timestamp("exam_start_date"),
  examEndDate: timestamp("exam_end_date"),
  resultsPublishDate: timestamp("results_publish_date"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Examination Centers
export const examCenters = pgTable("exam_centers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  address: text("address"),
  regionId: integer("region_id").notNull().references(() => regions.id),
  clusterId: integer("cluster_id").notNull().references(() => clusters.id),
  capacity: integer("capacity").default(500),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schools
export const schools = pgTable("schools", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  registrarName: varchar("registrar_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  schoolType: schoolTypeEnum("school_type").notNull(),
  regionId: integer("region_id").references(() => regions.id),
  clusterId: integer("cluster_id").references(() => clusters.id),
  preferredCenterId: integer("preferred_center_id").references(() => examCenters.id),
  assignedCenterId: integer("assigned_center_id").references(() => examCenters.id),
  status: schoolStatusEnum("status").default('pending'),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationExpiry: timestamp("verification_expiry"),
  isEmailVerified: boolean("is_email_verified").default(false),
  registrationCertificate: varchar("registration_certificate", { length: 500 }),
  landOwnership: varchar("land_ownership", { length: 500 }),
  operationalLicense: varchar("operational_license", { length: 500 }),
  registrationDeadline: timestamp("registration_deadline"),
  hasPenalty: boolean("has_penalty").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Students
export const students = pgTable("students", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  indexNumber: varchar("index_number", { length: 6 }).unique(),
  confirmationCode: varchar("confirmation_code", { length: 10 }).unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  middleName: varchar("middle_name", { length: 255 }),
  dateOfBirth: date("date_of_birth"),
  placeOfBirth: varchar("place_of_birth", { length: 255 }),
  gender: genderEnum("gender").notNull(),
  grade: integer("grade").notNull(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  status: studentStatusEnum("status").default('pending'),
  hasActivatedAccount: boolean("has_activated_account").default(false),
  password: varchar("password", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  totalStudents: integer("total_students").notNull(),
  feePerStudent: decimal("fee_per_student", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default('0'),
  status: paymentStatusEnum("status").default('pending'),
  bankSlipUrl: varchar("bank_slip_url", { length: 500 }),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subjects
export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  arabicName: varchar("arabic_name", { length: 255 }),
  grade: integer("grade").notNull(),
  maxScore: integer("max_score").default(100),
  passingScore: integer("passing_score").default(50),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exam Timetable
export const examTimetable = pgTable("exam_timetable", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  examDate: date("exam_date").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  grade: integer("grade").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Examiners
export const examiners = pgTable("examiners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  qualification: varchar("qualification", { length: 255 }),
  specialization: varchar("specialization", { length: 255 }),
  status: examinerStatusEnum("status").default('pending'),
  verificationToken: varchar("verification_token", { length: 255 }),
  regionId: integer("region_id").references(() => regions.id),
  totalScriptsMarked: integer("total_scripts_marked").default(0),
  totalAllowance: decimal("total_allowance", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Examiner Assignments
export const examinerAssignments = pgTable("examiner_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examinerId: integer("examiner_id").notNull().references(() => examiners.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  centerId: integer("center_id").references(() => examCenters.id),
  assignedScripts: integer("assigned_scripts").default(0),
  completedScripts: integer("completed_scripts").default(0),
  dueDate: timestamp("due_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student Results
export const studentResults = pgTable("student_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer("student_id").notNull().references(() => students.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  firstTermScore: decimal("first_term_score", { precision: 5, scale: 2 }),
  examScore: decimal("exam_score", { precision: 5, scale: 2 }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  grade: varchar("grade", { length: 5 }),
  status: resultStatusEnum("status").default('pending'),
  markedBy: integer("marked_by").references(() => examiners.id),
  validatedBy: varchar("validated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Certificates
export const certificates = pgTable("certificates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(),
  studentId: integer("student_id").notNull().references(() => students.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  templateType: varchar("template_type", { length: 20 }),
  finalResult: varchar("final_result", { length: 50 }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  rank: integer("rank"),
  issuedDate: timestamp("issued_date"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendance Records
export const attendanceRecords = pgTable("attendance_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer("student_id").notNull().references(() => students.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  centerId: integer("center_id").notNull().references(() => examCenters.id),
  isPresent: boolean("is_present").default(false),
  checkInTime: timestamp("check_in_time"),
  notes: text("notes"),
  recordedBy: varchar("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Malpractice Reports
export const malpracticeReports = pgTable("malpractice_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer("student_id").references(() => students.id),
  examinerId: integer("examiner_id").references(() => examiners.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  centerId: integer("center_id").notNull().references(() => examCenters.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  incidentType: varchar("incident_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  evidence: varchar("evidence", { length: 500 }),
  actionTaken: text("action_taken"),
  reportedBy: varchar("reported_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  center: one(examCenters, {
    fields: [users.centerId],
    references: [examCenters.id],
  }),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  clusters: many(clusters),
  schools: many(schools),
  examCenters: many(examCenters),
}));

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  region: one(regions, {
    fields: [clusters.regionId],
    references: [regions.id],
  }),
  schools: many(schools),
  examCenters: many(examCenters),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  region: one(regions, {
    fields: [schools.regionId],
    references: [regions.id],
  }),
  cluster: one(clusters, {
    fields: [schools.clusterId],
    references: [clusters.id],
  }),
  preferredCenter: one(examCenters, {
    fields: [schools.preferredCenterId],
    references: [examCenters.id],
    relationName: 'preferredCenter',
  }),
  assignedCenter: one(examCenters, {
    fields: [schools.assignedCenterId],
    references: [examCenters.id],
    relationName: 'assignedCenter',
  }),
  students: many(students),
  invoices: many(invoices),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  examYear: one(examYears, {
    fields: [students.examYearId],
    references: [examYears.id],
  }),
  results: many(studentResults),
  certificates: many(certificates),
  attendanceRecords: many(attendanceRecords),
}));

export const examCentersRelations = relations(examCenters, ({ one, many }) => ({
  region: one(regions, {
    fields: [examCenters.regionId],
    references: [regions.id],
  }),
  cluster: one(clusters, {
    fields: [examCenters.clusterId],
    references: [clusters.id],
  }),
  assignedSchools: many(schools, { relationName: 'assignedCenter' }),
  attendanceRecords: many(attendanceRecords),
  malpracticeReports: many(malpracticeReports),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  school: one(schools, {
    fields: [invoices.schoolId],
    references: [schools.id],
  }),
  examYear: one(examYears, {
    fields: [invoices.examYearId],
    references: [examYears.id],
  }),
}));

export const examinersRelations = relations(examiners, ({ one, many }) => ({
  user: one(users, {
    fields: [examiners.userId],
    references: [users.id],
  }),
  region: one(regions, {
    fields: [examiners.regionId],
    references: [regions.id],
  }),
  assignments: many(examinerAssignments),
  markedResults: many(studentResults),
}));

export const studentResultsRelations = relations(studentResults, ({ one }) => ({
  student: one(students, {
    fields: [studentResults.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [studentResults.subjectId],
    references: [subjects.id],
  }),
  examYear: one(examYears, {
    fields: [studentResults.examYearId],
    references: [examYears.id],
  }),
  marker: one(examiners, {
    fields: [studentResults.markedBy],
    references: [examiners.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  student: one(students, {
    fields: [certificates.studentId],
    references: [students.id],
  }),
  examYear: one(examYears, {
    fields: [certificates.examYearId],
    references: [examYears.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRegionSchema = createInsertSchema(regions).omit({ id: true, createdAt: true });
export const insertClusterSchema = createInsertSchema(clusters).omit({ id: true, createdAt: true });
export const insertExamYearSchema = createInsertSchema(examYears).omit({ id: true, createdAt: true });
export const insertExamCenterSchema = createInsertSchema(examCenters).omit({ id: true, createdAt: true });
export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true, createdAt: true });
export const insertExamTimetableSchema = createInsertSchema(examTimetable).omit({ id: true, createdAt: true });
export const insertExaminerSchema = createInsertSchema(examiners).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExaminerAssignmentSchema = createInsertSchema(examinerAssignments).omit({ id: true, createdAt: true });
export const insertStudentResultSchema = createInsertSchema(studentResults).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, createdAt: true });
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({ id: true, createdAt: true });
export const insertMalpracticeReportSchema = createInsertSchema(malpracticeReports).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;
export type InsertCluster = z.infer<typeof insertClusterSchema>;
export type Cluster = typeof clusters.$inferSelect;
export type InsertExamYear = z.infer<typeof insertExamYearSchema>;
export type ExamYear = typeof examYears.$inferSelect;
export type InsertExamCenter = z.infer<typeof insertExamCenterSchema>;
export type ExamCenter = typeof examCenters.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertExamTimetable = z.infer<typeof insertExamTimetableSchema>;
export type ExamTimetable = typeof examTimetable.$inferSelect;
export type InsertExaminer = z.infer<typeof insertExaminerSchema>;
export type Examiner = typeof examiners.$inferSelect;
export type InsertExaminerAssignment = z.infer<typeof insertExaminerAssignmentSchema>;
export type ExaminerAssignment = typeof examinerAssignments.$inferSelect;
export type InsertStudentResult = z.infer<typeof insertStudentResultSchema>;
export type StudentResult = typeof studentResults.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertMalpracticeReport = z.infer<typeof insertMalpracticeReportSchema>;
export type MalpracticeReport = typeof malpracticeReports.$inferSelect;
