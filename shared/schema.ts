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
  'examination_admin',
  'logistics_admin',
  'school_admin',
  'examiner',
  'candidate'
]);

export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'suspended', 'inactive']);

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

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone", { length: 50 }),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('school_admin'),
  status: userStatusEnum("status").default('pending'),
  schoolId: integer("school_id"),
  centerId: integer("center_id"),
  studentId: integer("student_id"),
  examinerId: integer("examiner_id"),
  mustChangePassword: boolean("must_change_password").default(false),
  lastLoginAt: timestamp("last_login_at"),
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
  schoolTypes: text("school_types").array().default([]),
  regionId: integer("region_id").references(() => regions.id),
  clusterId: integer("cluster_id").references(() => clusters.id),
  preferredCenterId: integer("preferred_center_id").references(() => examCenters.id),
  assignedCenterId: integer("assigned_center_id").references(() => examCenters.id),
  status: schoolStatusEnum("status").default('pending'),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationExpiry: timestamp("verification_expiry"),
  isEmailVerified: boolean("is_email_verified").default(false),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  adminUserId: varchar("admin_user_id").references(() => users.id),
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
  userId: varchar("user_id").references(() => users.id),
  hasActivatedAccount: boolean("has_activated_account").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exam Cards for candidate activation
export const examCards = pgTable("exam_cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer("student_id").notNull().references(() => students.id),
  cardNumber: varchar("card_number", { length: 20 }).notNull().unique(),
  activationToken: varchar("activation_token", { length: 100 }).unique(),
  isActivated: boolean("is_activated").default(false),
  activatedAt: timestamp("activated_at"),
  activatedByUserId: varchar("activated_by_user_id").references(() => users.id),
  printedAt: timestamp("printed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: varchar("description", { length: 500 }),
  category: varchar("category", { length: 100 }).default('general'),
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
  venue: varchar("venue", { length: 255 }),
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

// Examiner Assignments (for marking scripts)
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

// Invigilator Assignments (for supervising exams at centers)
export const invigilatorRoleEnum = pgEnum('invigilator_role', ['chief_invigilator', 'invigilator', 'assistant']);

export const invigilatorAssignments = pgTable("invigilator_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examinerId: integer("examiner_id").notNull().references(() => examiners.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  centerId: integer("center_id").notNull().references(() => examCenters.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  timetableId: integer("timetable_id").references(() => examTimetable.id),
  role: invigilatorRoleEnum("role").default('invigilator'),
  assignedDate: timestamp("assigned_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice items for detailed breakdown by grade
export const invoiceItems = pgTable("invoice_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  grade: integer("grade").notNull(),
  studentCount: integer("student_count").notNull(),
  feePerStudent: decimal("fee_per_student", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bulk upload tracking
export const bulkUploadStatusEnum = pgEnum('bulk_upload_status', ['pending', 'processing', 'completed', 'failed']);

export const bulkUploads = pgTable("bulk_uploads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  uploadType: varchar("upload_type", { length: 50 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successRows: integer("success_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  errorLog: text("error_log"),
  status: bulkUploadStatusEnum("status").default('pending'),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  examYearId: integer("exam_year_id").references(() => examYears.id),
  regionId: integer("region_id").references(() => regions.id),
  clusterId: integer("cluster_id").references(() => clusters.id),
  schoolId: integer("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
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

// Certificate status enum
export const certificateStatusEnum = pgEnum('certificate_status', ['pending', 'generated', 'printed', 'revoked']);

// Certificates
export const certificates = pgTable("certificates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(),
  studentId: integer("student_id").notNull().references(() => students.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  grade: integer("grade").notNull(),
  templateType: varchar("template_type", { length: 20 }),
  finalResult: varchar("final_result", { length: 50 }),
  finalGradeWord: varchar("final_grade_word", { length: 50 }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  rank: integer("rank"),
  qrToken: varchar("qr_token", { length: 100 }).unique(),
  issuedDate: timestamp("issued_date"),
  issuedDateHijri: varchar("issued_date_hijri", { length: 50 }),
  examWindowStart: varchar("exam_window_start", { length: 50 }),
  examWindowEnd: varchar("exam_window_end", { length: 50 }),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  printCount: integer("print_count").default(0),
  status: certificateStatusEnum("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transcripts table
export const transcripts = pgTable("transcripts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  transcriptNumber: varchar("transcript_number", { length: 50 }).notNull().unique(),
  studentId: integer("student_id").notNull().references(() => students.id),
  examYearId: integer("exam_year_id").notNull().references(() => examYears.id),
  grade: integer("grade").notNull(),
  qrToken: varchar("qr_token", { length: 100 }).unique(),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  printCount: integer("print_count").default(0),
  issuedDate: timestamp("issued_date"),
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

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 50 }),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notificationTypeEnum = pgEnum('notification_type', [
  'registration_deadline', 
  'payment_reminder', 
  'result_published', 
  'school_approved',
  'student_approved',
  'exam_reminder',
  'system_alert'
]);

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").default(false),
  sentViaEmail: boolean("sent_via_email").default(false),
  sentViaSms: boolean("sent_via_sms").default(false),
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

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  student: one(students, {
    fields: [transcripts.studentId],
    references: [students.id],
  }),
  examYear: one(examYears, {
    fields: [transcripts.examYearId],
    references: [examYears.id],
  }),
}));

// Insert schemas - using pick pattern to avoid omit type issues
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email().optional(),
  username: z.string().min(3).max(100).optional(),
  passwordHash: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
}).pick({
  email: true,
  username: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  phone: true,
  profileImageUrl: true,
  role: true,
  status: true,
  schoolId: true,
  centerId: true,
  studentId: true,
  examinerId: true,
  mustChangePassword: true,
});

export const insertRegionSchema = createInsertSchema(regions).pick({
  name: true,
  code: true,
});

export const insertClusterSchema = createInsertSchema(clusters).pick({
  name: true,
  code: true,
  regionId: true,
});

// Helper to convert date strings to Date objects
const dateStringToDate = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    return val;
  },
  z.date().optional()
);

export const insertExamYearSchema = createInsertSchema(examYears).pick({
  year: true,
  name: true,
  hijriYear: true,
  isActive: true,
  createdBy: true,
}).extend({
  registrationStartDate: dateStringToDate,
  registrationEndDate: dateStringToDate,
  examStartDate: dateStringToDate,
  examEndDate: dateStringToDate,
  resultsPublishDate: dateStringToDate,
});

export const insertExamCenterSchema = createInsertSchema(examCenters).pick({
  name: true,
  code: true,
  address: true,
  regionId: true,
  clusterId: true,
  capacity: true,
  contactPerson: true,
  contactPhone: true,
  contactEmail: true,
  isActive: true,
});

export const insertSchoolSchema = createInsertSchema(schools).pick({
  name: true,
  registrarName: true,
  email: true,
  phone: true,
  address: true,
  schoolType: true,
  schoolTypes: true,
  regionId: true,
  clusterId: true,
  preferredCenterId: true,
  assignedCenterId: true,
  status: true,
  verificationToken: true,
  verificationExpiry: true,
  isEmailVerified: true,
  registrationCertificate: true,
  landOwnership: true,
  operationalLicense: true,
  registrationDeadline: true,
  hasPenalty: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  indexNumber: true,
  confirmationCode: true,
  firstName: true,
  lastName: true,
  middleName: true,
  dateOfBirth: true,
  placeOfBirth: true,
  gender: true,
  grade: true,
  schoolId: true,
  examYearId: true,
  status: true,
  userId: true,
  hasActivatedAccount: true,
});

export const insertExamCardSchema = createInsertSchema(examCards).pick({
  studentId: true,
  cardNumber: true,
  activationToken: true,
  isActivated: true,
  activatedAt: true,
  activatedByUserId: true,
  printedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).pick({
  key: true,
  value: true,
  description: true,
  category: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  invoiceNumber: true,
  schoolId: true,
  examYearId: true,
  totalStudents: true,
  feePerStudent: true,
  totalAmount: true,
  paidAmount: true,
  status: true,
  bankSlipUrl: true,
  paymentDate: true,
  paymentMethod: true,
  notes: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  name: true,
  code: true,
  arabicName: true,
  grade: true,
  maxScore: true,
  passingScore: true,
  isActive: true,
});

export const insertExamTimetableSchema = createInsertSchema(examTimetable).pick({
  examYearId: true,
  subjectId: true,
  examDate: true,
  startTime: true,
  endTime: true,
  grade: true,
});

export const insertExaminerSchema = createInsertSchema(examiners).pick({
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  qualification: true,
  specialization: true,
  status: true,
  verificationToken: true,
  regionId: true,
  totalScriptsMarked: true,
  totalAllowance: true,
});

export const insertExaminerAssignmentSchema = createInsertSchema(examinerAssignments).pick({
  examinerId: true,
  examYearId: true,
  centerId: true,
  subjectId: true,
  role: true,
  assignedDate: true,
  completedDate: true,
  scriptsMarked: true,
  allowanceRate: true,
  totalAllowance: true,
});

export const insertStudentResultSchema = createInsertSchema(studentResults).pick({
  studentId: true,
  subjectId: true,
  examYearId: true,
  rawScore: true,
  scaledScore: true,
  grade: true,
  totalScore: true,
  status: true,
  markedBy: true,
  markedAt: true,
  verifiedBy: true,
  verifiedAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).pick({
  studentId: true,
  examYearId: true,
  certificateNumber: true,
  grade: true,
  templateType: true,
  qrToken: true,
  pdfUrl: true,
  issuedDate: true,
  status: true,
  printCount: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).pick({
  studentId: true,
  examYearId: true,
  transcriptNumber: true,
  grade: true,
  qrToken: true,
  pdfUrl: true,
  issuedDate: true,
  status: true,
  printCount: true,
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).pick({
  studentId: true,
  centerId: true,
  subjectId: true,
  examDate: true,
  isPresent: true,
  notes: true,
  recordedBy: true,
});

export const insertMalpracticeReportSchema = createInsertSchema(malpracticeReports).pick({
  studentId: true,
  centerId: true,
  subjectId: true,
  reportType: true,
  description: true,
  evidenceUrl: true,
  reportedBy: true,
  decision: true,
  decidedBy: true,
  decidedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  userId: true,
  action: true,
  resourceType: true,
  resourceId: true,
  details: true,
  ipAddress: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  link: true,
});

export const insertInvigilatorAssignmentSchema = createInsertSchema(invigilatorAssignments).pick({
  examinerId: true,
  examYearId: true,
  centerId: true,
  subjectId: true,
  timetableId: true,
  role: true,
  assignedDate: true,
  notes: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).pick({
  invoiceId: true,
  grade: true,
  studentCount: true,
  feePerStudent: true,
  subtotal: true,
});

export const insertBulkUploadSchema = createInsertSchema(bulkUploads).pick({
  uploadType: true,
  fileName: true,
  fileUrl: true,
  totalRows: true,
  processedRows: true,
  successRows: true,
  failedRows: true,
  errorLog: true,
  status: true,
  uploadedBy: true,
  examYearId: true,
  regionId: true,
  clusterId: true,
  schoolId: true,
});

// ===== WEBSITE CONTENT MANAGEMENT =====

// News Article Categories
export const newsCategories = pgTable("news_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#1E8F4D"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// News Articles
export const newsArticles = pgTable("news_articles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: varchar("featured_image", { length: 500 }),
  categoryId: integer("category_id").references(() => newsCategories.id),
  authorId: varchar("author_id").references(() => users.id),
  isPublished: boolean("is_published").default(false),
  isFeatured: boolean("is_featured").default(false),
  publishedAt: timestamp("published_at"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Resource Categories
export const resourceCategories = pgTable("resource_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Resources/Documents
export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 500 }),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  categoryId: integer("category_id").references(() => resourceCategories.id),
  isPublished: boolean("is_published").default(false),
  downloadCount: integer("download_count").default(0),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Website Announcements
export const announcements = pgTable("announcements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).default("info"), // info, warning, success, urgent
  linkUrl: varchar("link_url", { length: 500 }),
  linkText: varchar("link_text", { length: 100 }),
  isActive: boolean("is_active").default(true),
  displayOnHomepage: boolean("display_on_homepage").default(true),
  displayStartDate: timestamp("display_start_date"),
  displayEndDate: timestamp("display_end_date"),
  priority: integer("priority").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Newsletter Subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  isActive: boolean("is_active").default(true),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: varchar("source", { length: 100 }).default("website"),
});

// Impact Statistics for Homepage
export const impactStats = pgTable("impact_stats", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  label: varchar("label", { length: 100 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Website Content Schemas
export const insertNewsCategorySchema = createInsertSchema(newsCategories).pick({
  name: true,
  slug: true,
  description: true,
  color: true,
  isActive: true,
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).pick({
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  featuredImage: true,
  categoryId: true,
  authorId: true,
  isPublished: true,
  isFeatured: true,
  publishedAt: true,
});

export const insertResourceCategorySchema = createInsertSchema(resourceCategories).pick({
  name: true,
  slug: true,
  description: true,
  icon: true,
  isActive: true,
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  title: true,
  description: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  categoryId: true,
  isPublished: true,
  uploadedBy: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).pick({
  title: true,
  content: true,
  type: true,
  linkUrl: true,
  linkText: true,
  isActive: true,
  displayOnHomepage: true,
  displayStartDate: true,
  displayEndDate: true,
  priority: true,
  createdBy: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).pick({
  email: true,
  name: true,
  isActive: true,
  source: true,
});

export const insertImpactStatSchema = createInsertSchema(impactStats).pick({
  label: true,
  value: true,
  icon: true,
  displayOrder: true,
  isActive: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertExamCard = z.infer<typeof insertExamCardSchema>;
export type ExamCard = typeof examCards.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
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
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertMalpracticeReport = z.infer<typeof insertMalpracticeReportSchema>;
export type MalpracticeReport = typeof malpracticeReports.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertInvigilatorAssignment = z.infer<typeof insertInvigilatorAssignmentSchema>;
export type InvigilatorAssignment = typeof invigilatorAssignments.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertBulkUpload = z.infer<typeof insertBulkUploadSchema>;
export type BulkUpload = typeof bulkUploads.$inferSelect;

// Website Content Types
export type InsertNewsCategory = z.infer<typeof insertNewsCategorySchema>;
export type NewsCategory = typeof newsCategories.$inferSelect;
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertResourceCategory = z.infer<typeof insertResourceCategorySchema>;
export type ResourceCategory = typeof resourceCategories.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertImpactStat = z.infer<typeof insertImpactStatSchema>;
export type ImpactStat = typeof impactStats.$inferSelect;
