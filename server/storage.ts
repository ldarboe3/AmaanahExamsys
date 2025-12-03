import { eq, and, desc, asc, sql, ilike, or, gte, lte, inArray, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, regions, clusters, examYears, examCenters, schools, students,
  invoices, invoiceItems, subjects, examTimetable, examiners, examinerAssignments,
  studentResults, certificates, transcripts, attendanceRecords, malpracticeReports,
  auditLogs, notifications, examCards, systemSettings, schoolInvitations,
  newsCategories, newsArticles, resourceCategories, resources, announcements,
  newsletterSubscribers, impactStats,
  paperMovements, scriptMovements, centerAssignments, centerActivityLogs,
  type User, type UpsertUser, type Region, type InsertRegion,
  type Cluster, type InsertCluster, type ExamYear, type InsertExamYear,
  type ExamCenter, type InsertExamCenter, type School, type InsertSchool,
  type Student, type InsertStudent, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Subject, type InsertSubject, type ExamTimetable, type InsertExamTimetable,
  type Examiner, type InsertExaminer, type ExaminerAssignment, type InsertExaminerAssignment,
  type StudentResult, type InsertStudentResult, type Certificate, type InsertCertificate,
  type Transcript, type InsertTranscript,
  type AttendanceRecord, type InsertAttendanceRecord, type MalpracticeReport, type InsertMalpracticeReport,
  type AuditLog, type InsertAuditLog, type Notification, type InsertNotification,
  type ExamCard, type InsertExamCard, type SystemSetting, type InsertSystemSetting,
  type SchoolInvitation, type InsertSchoolInvitation,
  type NewsCategory, type InsertNewsCategory, type NewsArticle, type InsertNewsArticle,
  type ResourceCategory, type InsertResourceCategory, type Resource, type InsertResource,
  type Announcement, type InsertAnnouncement, type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type ImpactStat, type InsertImpactStat,
  type PaperMovement, type InsertPaperMovement,
  type ScriptMovement, type InsertScriptMovement,
  type CenterAssignment, type InsertCenterAssignment,
  type CenterActivityLog, type InsertCenterActivityLog,
} from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string, schoolId?: number, centerId?: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Regions
  createRegion(region: InsertRegion): Promise<Region>;
  getRegion(id: number): Promise<Region | undefined>;
  getAllRegions(): Promise<Region[]>;
  updateRegion(id: number, region: Partial<InsertRegion>): Promise<Region | undefined>;
  deleteRegion(id: number): Promise<boolean>;

  // Clusters
  createCluster(cluster: InsertCluster): Promise<Cluster>;
  getCluster(id: number): Promise<Cluster | undefined>;
  getClustersByRegion(regionId: number): Promise<Cluster[]>;
  getAllClusters(): Promise<Cluster[]>;
  updateCluster(id: number, cluster: Partial<InsertCluster>): Promise<Cluster | undefined>;
  deleteCluster(id: number): Promise<boolean>;

  // Exam Years
  createExamYear(examYear: InsertExamYear): Promise<ExamYear>;
  getExamYear(id: number): Promise<ExamYear | undefined>;
  getActiveExamYear(): Promise<ExamYear | undefined>;
  getAllExamYears(): Promise<ExamYear[]>;
  updateExamYear(id: number, examYear: Partial<InsertExamYear>): Promise<ExamYear | undefined>;
  setActiveExamYear(id: number): Promise<ExamYear | undefined>;
  deleteExamYear(id: number): Promise<boolean>;

  // Exam Centers
  createExamCenter(center: InsertExamCenter): Promise<ExamCenter>;
  getExamCenter(id: number): Promise<ExamCenter | undefined>;
  getExamCentersByRegion(regionId: number): Promise<ExamCenter[]>;
  getExamCentersByCluster(clusterId: number): Promise<ExamCenter[]>;
  getAllExamCenters(): Promise<ExamCenter[]>;
  updateExamCenter(id: number, center: Partial<InsertExamCenter>): Promise<ExamCenter | undefined>;
  deleteExamCenter(id: number): Promise<boolean>;

  // Schools
  createSchool(school: InsertSchool): Promise<School>;
  getSchool(id: number): Promise<School | undefined>;
  getSchoolByEmail(email: string): Promise<School | undefined>;
  getSchoolByAdminUserId(userId: string): Promise<School | undefined>;
  getSchoolsByStatus(status: string): Promise<School[]>;
  getSchoolsByRegion(regionId: number): Promise<School[]>;
  getSchoolsByCenter(centerId: number): Promise<School[]>;
  getAllSchools(): Promise<School[]>;
  updateSchool(id: number, school: Partial<InsertSchool>): Promise<School | undefined>;
  verifySchoolEmail(token: string): Promise<School | undefined>;
  approveSchool(id: number): Promise<School | undefined>;
  rejectSchool(id: number): Promise<School | undefined>;
  assignSchoolToCenter(schoolId: number, centerId: number): Promise<School | undefined>;
  deleteSchool(id: number): Promise<boolean>;

  // School Invitations
  createSchoolInvitation(invitation: InsertSchoolInvitation): Promise<SchoolInvitation>;
  getSchoolInvitation(id: number): Promise<SchoolInvitation | undefined>;
  getSchoolInvitationByToken(token: string): Promise<SchoolInvitation | undefined>;
  getSchoolInvitationsBySchool(schoolId: number): Promise<SchoolInvitation[]>;
  updateSchoolInvitation(id: number, invitation: Partial<InsertSchoolInvitation>): Promise<SchoolInvitation | undefined>;
  deleteSchoolInvitation(id: number): Promise<boolean>;

  // Students
  createStudent(student: InsertStudent): Promise<Student>;
  createStudentsBulk(students: InsertStudent[]): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByIndexNumber(indexNumber: string): Promise<Student | undefined>;
  getStudentByConfirmationCode(code: string): Promise<Student | undefined>;
  getStudentsBySchool(schoolId: number): Promise<Student[]>;
  getStudentsByExamYear(examYearId: number): Promise<Student[]>;
  getStudentsByStatus(status: string): Promise<Student[]>;
  getStudentsByCenter(centerId: number): Promise<Student[]>;
  getPendingStudents(): Promise<Student[]>;
  getAllStudents(): Promise<Student[]>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  approveStudent(id: number): Promise<Student | undefined>;
  rejectStudent(id: number): Promise<Student | undefined>;
  generateIndexNumbers(studentIds: number[], prefix: string): Promise<Student[]>;
  deleteStudent(id: number): Promise<boolean>;

  // Invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoicesBySchool(schoolId: number): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  markInvoicePaid(id: number, paymentMethod: string, bankSlipUrl?: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  
  // Invoice Items
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  createInvoiceItemsBulk(items: InsertInvoiceItem[]): Promise<InvoiceItem[]>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  deleteInvoiceItemsByInvoice(invoiceId: number): Promise<boolean>;

  // Subjects
  createSubject(subject: InsertSubject): Promise<Subject>;
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjectsByGrade(grade: number): Promise<Subject[]>;
  getAllSubjects(): Promise<Subject[]>;
  updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<boolean>;

  // Exam Timetable
  createTimetableEntry(entry: InsertExamTimetable): Promise<ExamTimetable>;
  getTimetableByExamYear(examYearId: number): Promise<ExamTimetable[]>;
  getTimetableByGrade(examYearId: number, grade: number): Promise<ExamTimetable[]>;
  updateTimetableEntry(id: number, entry: Partial<InsertExamTimetable>): Promise<ExamTimetable | undefined>;
  deleteTimetableEntry(id: number): Promise<boolean>;

  // Examiners
  createExaminer(examiner: InsertExaminer): Promise<Examiner>;
  getExaminer(id: number): Promise<Examiner | undefined>;
  getExaminerByEmail(email: string): Promise<Examiner | undefined>;
  getExaminersByStatus(status: string): Promise<Examiner[]>;
  getExaminersByRegion(regionId: number): Promise<Examiner[]>;
  getAllExaminers(): Promise<Examiner[]>;
  updateExaminer(id: number, examiner: Partial<InsertExaminer>): Promise<Examiner | undefined>;
  verifyExaminer(id: number): Promise<Examiner | undefined>;
  deleteExaminer(id: number): Promise<boolean>;

  // Examiner Assignments
  createExaminerAssignment(assignment: InsertExaminerAssignment): Promise<ExaminerAssignment>;
  getExaminerAssignments(examinerId: number): Promise<ExaminerAssignment[]>;
  getAssignmentsByCenter(centerId: number): Promise<ExaminerAssignment[]>;
  updateExaminerAssignment(id: number, assignment: Partial<InsertExaminerAssignment>): Promise<ExaminerAssignment | undefined>;
  deleteExaminerAssignment(id: number): Promise<boolean>;

  // Student Results
  createStudentResult(result: InsertStudentResult): Promise<StudentResult>;
  createStudentResultsBulk(results: InsertStudentResult[]): Promise<StudentResult[]>;
  getStudentResult(id: number): Promise<StudentResult | undefined>;
  getResultsByStudent(studentId: number): Promise<StudentResult[]>;
  getResultsByExamYear(examYearId: number): Promise<StudentResult[]>;
  getResultsBySubject(subjectId: number): Promise<StudentResult[]>;
  getPendingResults(): Promise<StudentResult[]>;
  updateStudentResult(id: number, result: Partial<InsertStudentResult>): Promise<StudentResult | undefined>;
  validateResult(id: number, validatorId: string): Promise<StudentResult | undefined>;
  publishResults(examYearId: number): Promise<number>;
  deleteStudentResult(id: number): Promise<boolean>;

  // Certificates
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  getCertificate(id: number): Promise<Certificate | undefined>;
  getCertificateByNumber(certificateNumber: string): Promise<Certificate | undefined>;
  getCertificateByQrToken(qrToken: string): Promise<Certificate | undefined>;
  getCertificatesByStudent(studentId: number): Promise<Certificate[]>;
  getCertificatesByExamYear(examYearId: number): Promise<Certificate[]>;
  getAllCertificates(): Promise<Certificate[]>;
  updateCertificate(id: number, certificate: Partial<InsertCertificate>): Promise<Certificate | undefined>;
  incrementCertificatePrintCount(id: number): Promise<Certificate | undefined>;
  deleteCertificate(id: number): Promise<boolean>;

  // Transcripts
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  getTranscript(id: number): Promise<Transcript | undefined>;
  getTranscriptByNumber(transcriptNumber: string): Promise<Transcript | undefined>;
  getTranscriptByQrToken(qrToken: string): Promise<Transcript | undefined>;
  getTranscriptsByStudent(studentId: number): Promise<Transcript[]>;
  getTranscriptsByExamYear(examYearId: number): Promise<Transcript[]>;
  updateTranscript(id: number, transcript: Partial<InsertTranscript>): Promise<Transcript | undefined>;
  incrementTranscriptPrintCount(id: number): Promise<Transcript | undefined>;
  deleteTranscript(id: number): Promise<boolean>;

  // Attendance Records
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  getAttendanceByStudent(studentId: number): Promise<AttendanceRecord[]>;
  getAttendanceByCenter(centerId: number, subjectId: number): Promise<AttendanceRecord[]>;
  updateAttendanceRecord(id: number, record: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord | undefined>;

  // Malpractice Reports
  createMalpracticeReport(report: InsertMalpracticeReport): Promise<MalpracticeReport>;
  getMalpracticeReportsByCenter(centerId: number): Promise<MalpracticeReport[]>;
  getMalpracticeReportsByExamYear(examYearId: number): Promise<MalpracticeReport[]>;
  updateMalpracticeReport(id: number, report: Partial<InsertMalpracticeReport>): Promise<MalpracticeReport | undefined>;

  // Analytics
  getStudentCountBySchool(examYearId: number): Promise<{ schoolId: number; count: number }[]>;
  getStudentCountByRegion(examYearId: number): Promise<{ regionId: number; count: number }[]>;
  getResultsAggregateBySubject(examYearId: number): Promise<{ subjectId: number; avgScore: number; passRate: number }[]>;
  getResultsAggregateByGender(examYearId: number): Promise<{ gender: string; avgScore: number; passRate: number }[]>;
  getDashboardStats(): Promise<{
    totalSchools: number;
    totalStudents: number;
    totalExaminers: number;
    pendingApprovals: number;
    totalRevenue: string;
  }>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: string; entityType?: string; action?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  createNotificationsBulk(notifications: InsertNotification[]): Promise<Notification[]>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;

  // Authentication
  getUserByUsername(username: string): Promise<User | undefined>;
  createUserWithPassword(userData: UpsertUser & { password: string }): Promise<User>;
  verifyPassword(userId: string, password: string): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
  updateUserStatus(userId: string, status: string): Promise<User | undefined>;

  // Exam Cards
  createExamCard(card: InsertExamCard): Promise<ExamCard>;
  getExamCard(id: number): Promise<ExamCard | undefined>;
  getExamCardByCardNumber(cardNumber: string): Promise<ExamCard | undefined>;
  getExamCardByActivationToken(token: string): Promise<ExamCard | undefined>;
  getExamCardsByStudent(studentId: number): Promise<ExamCard[]>;
  activateExamCard(id: number, userId: string): Promise<ExamCard | undefined>;
  deleteExamCard(id: number): Promise<boolean>;

  // System Settings
  getSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSettings(): Promise<SystemSetting[]>;
  getSettingsByCategory(category: string): Promise<SystemSetting[]>;
  upsertSetting(key: string, value: string, description?: string, category?: string): Promise<SystemSetting>;
  deleteSetting(key: string): Promise<boolean>;

  // ===== WEBSITE CONTENT MANAGEMENT =====

  // News Categories
  createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory>;
  getNewsCategory(id: number): Promise<NewsCategory | undefined>;
  getAllNewsCategories(): Promise<NewsCategory[]>;
  updateNewsCategory(id: number, category: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined>;
  deleteNewsCategory(id: number): Promise<boolean>;

  // News Articles
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  getNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined>;
  getPublishedNewsArticles(): Promise<NewsArticle[]>;
  getFeaturedNewsArticles(): Promise<NewsArticle[]>;
  getNewsArticlesByCategory(categoryId: number): Promise<NewsArticle[]>;
  getAllNewsArticles(): Promise<NewsArticle[]>;
  updateNewsArticle(id: number, article: Partial<InsertNewsArticle>): Promise<NewsArticle | undefined>;
  incrementNewsArticleViewCount(id: number): Promise<void>;
  deleteNewsArticle(id: number): Promise<boolean>;

  // Resource Categories
  createResourceCategory(category: InsertResourceCategory): Promise<ResourceCategory>;
  getResourceCategory(id: number): Promise<ResourceCategory | undefined>;
  getAllResourceCategories(): Promise<ResourceCategory[]>;
  updateResourceCategory(id: number, category: Partial<InsertResourceCategory>): Promise<ResourceCategory | undefined>;
  deleteResourceCategory(id: number): Promise<boolean>;

  // Resources
  createResource(resource: InsertResource): Promise<Resource>;
  getResource(id: number): Promise<Resource | undefined>;
  getPublishedResources(): Promise<Resource[]>;
  getResourcesByCategory(categoryId: number): Promise<Resource[]>;
  getAllResources(): Promise<Resource[]>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource | undefined>;
  incrementResourceDownloadCount(id: number): Promise<void>;
  deleteResource(id: number): Promise<boolean>;

  // Announcements
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  getHomepageAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<boolean>;

  // Newsletter Subscribers
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscriber(id: number): Promise<NewsletterSubscriber | undefined>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  updateNewsletterSubscriber(id: number, subscriber: Partial<InsertNewsletterSubscriber>): Promise<NewsletterSubscriber | undefined>;
  unsubscribeNewsletter(email: string): Promise<boolean>;
  deleteNewsletterSubscriber(id: number): Promise<boolean>;

  // Impact Stats
  createImpactStat(stat: InsertImpactStat): Promise<ImpactStat>;
  getImpactStat(id: number): Promise<ImpactStat | undefined>;
  getActiveImpactStats(): Promise<ImpactStat[]>;
  getAllImpactStats(): Promise<ImpactStat[]>;
  updateImpactStat(id: number, stat: Partial<InsertImpactStat>): Promise<ImpactStat | undefined>;
  deleteImpactStat(id: number): Promise<boolean>;

  // ===== LOGISTICS MANAGEMENT =====

  // Paper Movements
  createPaperMovement(movement: InsertPaperMovement): Promise<PaperMovement>;
  getPaperMovement(id: number): Promise<PaperMovement | undefined>;
  getPaperMovementsByCenter(centerId: number, examYearId: number): Promise<PaperMovement[]>;
  getPaperMovementsByExamYear(examYearId: number): Promise<PaperMovement[]>;
  updatePaperMovement(id: number, movement: Partial<InsertPaperMovement>): Promise<PaperMovement | undefined>;
  deletePaperMovement(id: number): Promise<boolean>;

  // Script Movements
  createScriptMovement(movement: InsertScriptMovement): Promise<ScriptMovement>;
  getScriptMovement(id: number): Promise<ScriptMovement | undefined>;
  getScriptMovementsByCenter(centerId: number, examYearId: number): Promise<ScriptMovement[]>;
  getScriptMovementsByExamYear(examYearId: number): Promise<ScriptMovement[]>;
  updateScriptMovement(id: number, movement: Partial<InsertScriptMovement>): Promise<ScriptMovement | undefined>;
  deleteScriptMovement(id: number): Promise<boolean>;

  // Center Assignments
  createCenterAssignment(assignment: InsertCenterAssignment): Promise<CenterAssignment>;
  getCenterAssignment(id: number): Promise<CenterAssignment | undefined>;
  getCenterAssignmentsByExamYear(examYearId: number): Promise<CenterAssignment[]>;
  getCenterAssignmentsByCenter(centerId: number, examYearId: number): Promise<CenterAssignment[]>;
  getCenterAssignmentBySchool(schoolId: number, examYearId: number): Promise<CenterAssignment | undefined>;
  updateCenterAssignment(id: number, assignment: Partial<InsertCenterAssignment>): Promise<CenterAssignment | undefined>;
  deleteCenterAssignment(id: number): Promise<boolean>;

  // Center Activity Logs
  createCenterActivityLog(log: InsertCenterActivityLog): Promise<CenterActivityLog>;
  getCenterActivityLogs(centerId: number, examYearId?: number): Promise<CenterActivityLog[]>;
  getCenterActivityLogsByType(centerId: number, activityType: string): Promise<CenterActivityLog[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string, schoolId?: number, centerId?: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, schoolId, centerId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Regions
  async createRegion(region: InsertRegion): Promise<Region> {
    const [created] = await db.insert(regions).values(region).returning();
    return created;
  }

  async getRegion(id: number): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region;
  }

  async getAllRegions(): Promise<Region[]> {
    return db.select().from(regions).orderBy(asc(regions.name));
  }

  async updateRegion(id: number, region: Partial<InsertRegion>): Promise<Region | undefined> {
    const [updated] = await db.update(regions).set(region).where(eq(regions.id, id)).returning();
    return updated;
  }

  async deleteRegion(id: number): Promise<boolean> {
    const result = await db.delete(regions).where(eq(regions.id, id));
    return true;
  }

  // Clusters
  async createCluster(cluster: InsertCluster): Promise<Cluster> {
    const [created] = await db.insert(clusters).values(cluster).returning();
    return created;
  }

  async getCluster(id: number): Promise<Cluster | undefined> {
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
    return cluster;
  }

  async getClustersByRegion(regionId: number): Promise<Cluster[]> {
    return db.select().from(clusters).where(eq(clusters.regionId, regionId)).orderBy(asc(clusters.name));
  }

  async getAllClusters(): Promise<Cluster[]> {
    return db.select().from(clusters).orderBy(asc(clusters.name));
  }

  async updateCluster(id: number, cluster: Partial<InsertCluster>): Promise<Cluster | undefined> {
    const [updated] = await db.update(clusters).set(cluster).where(eq(clusters.id, id)).returning();
    return updated;
  }

  async deleteCluster(id: number): Promise<boolean> {
    await db.delete(clusters).where(eq(clusters.id, id));
    return true;
  }

  // Exam Years
  async createExamYear(examYear: InsertExamYear): Promise<ExamYear> {
    const [created] = await db.insert(examYears).values(examYear).returning();
    return created;
  }

  async getExamYear(id: number): Promise<ExamYear | undefined> {
    const [examYear] = await db.select().from(examYears).where(eq(examYears.id, id));
    return examYear;
  }

  async getActiveExamYear(): Promise<ExamYear | undefined> {
    const [examYear] = await db.select().from(examYears).where(eq(examYears.isActive, true));
    return examYear;
  }

  async getAllExamYears(): Promise<ExamYear[]> {
    return db.select().from(examYears).orderBy(desc(examYears.year));
  }

  async updateExamYear(id: number, examYear: Partial<InsertExamYear>): Promise<ExamYear | undefined> {
    // Convert date strings to Date objects if they are strings
    const processedData = {
      ...examYear,
      registrationStartDate: examYear.registrationStartDate 
        ? (typeof examYear.registrationStartDate === 'string' ? new Date(examYear.registrationStartDate) : examYear.registrationStartDate)
        : undefined,
      registrationEndDate: examYear.registrationEndDate 
        ? (typeof examYear.registrationEndDate === 'string' ? new Date(examYear.registrationEndDate) : examYear.registrationEndDate)
        : undefined,
      examStartDate: examYear.examStartDate 
        ? (typeof examYear.examStartDate === 'string' ? new Date(examYear.examStartDate) : examYear.examStartDate)
        : undefined,
      examEndDate: examYear.examEndDate 
        ? (typeof examYear.examEndDate === 'string' ? new Date(examYear.examEndDate) : examYear.examEndDate)
        : undefined,
      resultsPublishDate: examYear.resultsPublishDate 
        ? (typeof examYear.resultsPublishDate === 'string' ? new Date(examYear.resultsPublishDate) : examYear.resultsPublishDate)
        : undefined,
    };
    
    // Remove undefined values
    Object.keys(processedData).forEach(key => {
      if (processedData[key as keyof typeof processedData] === undefined) {
        delete processedData[key as keyof typeof processedData];
      }
    });
    
    const [updated] = await db.update(examYears).set(processedData).where(eq(examYears.id, id)).returning();
    return updated;
  }

  async setActiveExamYear(id: number): Promise<ExamYear | undefined> {
    await db.update(examYears).set({ isActive: false });
    const [updated] = await db.update(examYears).set({ isActive: true }).where(eq(examYears.id, id)).returning();
    return updated;
  }

  async deleteExamYear(id: number): Promise<boolean> {
    await db.delete(examYears).where(eq(examYears.id, id));
    return true;
  }

  // Exam Centers
  async createExamCenter(center: InsertExamCenter): Promise<ExamCenter> {
    const [created] = await db.insert(examCenters).values(center).returning();
    return created;
  }

  async getExamCenter(id: number): Promise<ExamCenter | undefined> {
    const [center] = await db.select().from(examCenters).where(eq(examCenters.id, id));
    return center;
  }

  async getExamCentersByRegion(regionId: number): Promise<ExamCenter[]> {
    return db.select().from(examCenters).where(eq(examCenters.regionId, regionId)).orderBy(asc(examCenters.name));
  }

  async getExamCentersByCluster(clusterId: number): Promise<ExamCenter[]> {
    return db.select().from(examCenters).where(eq(examCenters.clusterId, clusterId)).orderBy(asc(examCenters.name));
  }

  async getAllExamCenters(): Promise<ExamCenter[]> {
    return db.select().from(examCenters).orderBy(asc(examCenters.name));
  }

  async updateExamCenter(id: number, center: Partial<InsertExamCenter>): Promise<ExamCenter | undefined> {
    const [updated] = await db.update(examCenters).set(center).where(eq(examCenters.id, id)).returning();
    return updated;
  }

  async deleteExamCenter(id: number): Promise<boolean> {
    await db.delete(examCenters).where(eq(examCenters.id, id));
    return true;
  }

  // Schools
  async createSchool(school: InsertSchool): Promise<School> {
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [created] = await db.insert(schools).values({
      ...school,
      verificationToken,
      verificationExpiry,
    }).returning();
    return created;
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async getSchoolByEmail(email: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.email, email));
    return school;
  }

  async getSchoolByAdminUserId(userId: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.adminUserId, userId));
    return school;
  }

  async getSchoolsByStatus(status: string): Promise<School[]> {
    return db.select().from(schools).where(eq(schools.status, status as any)).orderBy(asc(schools.name));
  }

  async getSchoolsByRegion(regionId: number): Promise<School[]> {
    return db.select().from(schools).where(eq(schools.regionId, regionId)).orderBy(asc(schools.name));
  }

  async getSchoolsByCenter(centerId: number): Promise<School[]> {
    return db.select().from(schools).where(eq(schools.assignedCenterId, centerId)).orderBy(asc(schools.name));
  }

  async getAllSchools(): Promise<School[]> {
    return db.select().from(schools).orderBy(asc(schools.name));
  }

  async updateSchool(id: number, school: Partial<InsertSchool>): Promise<School | undefined> {
    const [updated] = await db.update(schools).set({ ...school, updatedAt: new Date() }).where(eq(schools.id, id)).returning();
    return updated;
  }

  async verifySchoolEmail(token: string): Promise<School | undefined> {
    const [school] = await db
      .update(schools)
      .set({ isEmailVerified: true, status: 'verified' as any, updatedAt: new Date() })
      .where(and(eq(schools.verificationToken, token), gte(schools.verificationExpiry, new Date())))
      .returning();
    return school;
  }

  async approveSchool(id: number): Promise<School | undefined> {
    const [updated] = await db.update(schools).set({ status: 'approved' as any, updatedAt: new Date() }).where(eq(schools.id, id)).returning();
    return updated;
  }

  async rejectSchool(id: number): Promise<School | undefined> {
    const [updated] = await db.update(schools).set({ status: 'rejected' as any, updatedAt: new Date() }).where(eq(schools.id, id)).returning();
    return updated;
  }

  async assignSchoolToCenter(schoolId: number, centerId: number): Promise<School | undefined> {
    const [updated] = await db.update(schools).set({ assignedCenterId: centerId, updatedAt: new Date() }).where(eq(schools.id, schoolId)).returning();
    return updated;
  }

  async deleteSchool(id: number): Promise<boolean> {
    await db.delete(schools).where(eq(schools.id, id));
    return true;
  }

  // School Invitations
  async createSchoolInvitation(invitation: InsertSchoolInvitation): Promise<SchoolInvitation> {
    const [created] = await db.insert(schoolInvitations).values(invitation).returning();
    return created;
  }

  async getSchoolInvitation(id: number): Promise<SchoolInvitation | undefined> {
    const [invitation] = await db.select().from(schoolInvitations).where(eq(schoolInvitations.id, id));
    return invitation;
  }

  async getSchoolInvitationByToken(token: string): Promise<SchoolInvitation | undefined> {
    const [invitation] = await db.select().from(schoolInvitations).where(eq(schoolInvitations.token, token));
    return invitation;
  }

  async getSchoolInvitationsBySchool(schoolId: number): Promise<SchoolInvitation[]> {
    return db.select().from(schoolInvitations).where(eq(schoolInvitations.schoolId, schoolId)).orderBy(desc(schoolInvitations.createdAt));
  }

  async updateSchoolInvitation(id: number, invitation: Partial<InsertSchoolInvitation>): Promise<SchoolInvitation | undefined> {
    const [updated] = await db.update(schoolInvitations).set(invitation).where(eq(schoolInvitations.id, id)).returning();
    return updated;
  }

  async deleteSchoolInvitation(id: number): Promise<boolean> {
    await db.delete(schoolInvitations).where(eq(schoolInvitations.id, id));
    return true;
  }

  // Students
  async createStudent(student: InsertStudent): Promise<Student> {
    const [created] = await db.insert(students).values(student).returning();
    return created;
  }

  async createStudentsBulk(studentList: InsertStudent[]): Promise<Student[]> {
    if (studentList.length === 0) return [];
    return db.insert(students).values(studentList).returning();
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByIndexNumber(indexNumber: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.indexNumber, indexNumber));
    return student;
  }

  async getStudentByConfirmationCode(code: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.confirmationCode, code));
    return student;
  }

  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    return db.select().from(students).where(eq(students.schoolId, schoolId)).orderBy(asc(students.lastName), asc(students.firstName));
  }

  async getStudentsByExamYear(examYearId: number): Promise<Student[]> {
    return db.select().from(students).where(eq(students.examYearId, examYearId)).orderBy(asc(students.lastName));
  }

  async getStudentsByStatus(status: string): Promise<Student[]> {
    return db.select().from(students).where(eq(students.status, status as any)).orderBy(asc(students.lastName));
  }

  async getStudentsByCenter(centerId: number): Promise<Student[]> {
    const schoolsInCenter = await this.getSchoolsByCenter(centerId);
    const schoolIds = schoolsInCenter.map(s => s.id);
    if (schoolIds.length === 0) return [];
    return db.select().from(students).where(inArray(students.schoolId, schoolIds)).orderBy(asc(students.lastName));
  }

  async getPendingStudents(): Promise<Student[]> {
    return db.select().from(students).where(eq(students.status, 'pending')).orderBy(desc(students.createdAt));
  }

  async getAllStudents(): Promise<Student[]> {
    return db.select().from(students).orderBy(asc(students.lastName), asc(students.firstName));
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updated] = await db.update(students).set({ ...student, updatedAt: new Date() }).where(eq(students.id, id)).returning();
    return updated;
  }

  async approveStudent(id: number): Promise<Student | undefined> {
    const [updated] = await db.update(students).set({ status: 'approved' as any, updatedAt: new Date() }).where(eq(students.id, id)).returning();
    return updated;
  }

  async rejectStudent(id: number): Promise<Student | undefined> {
    const [updated] = await db.update(students).set({ status: 'rejected' as any, updatedAt: new Date() }).where(eq(students.id, id)).returning();
    return updated;
  }

  async generateIndexNumbers(studentIds: number[], prefix: string): Promise<Student[]> {
    const results: Student[] = [];
    for (let i = 0; i < studentIds.length; i++) {
      const indexNumber = `${prefix}${String(i + 1).padStart(4, '0')}`;
      const confirmationCode = randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
      const [updated] = await db
        .update(students)
        .set({ indexNumber, confirmationCode, updatedAt: new Date() })
        .where(eq(students.id, studentIds[i]))
        .returning();
      if (updated) results.push(updated);
    }
    return results;
  }

  async deleteStudent(id: number): Promise<boolean> {
    await db.delete(students).where(eq(students.id, id));
    return true;
  }

  // Invoices
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice;
  }

  async getInvoicesBySchool(schoolId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.status, status as any)).orderBy(desc(invoices.createdAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...invoice, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async markInvoicePaid(id: number, paymentMethod: string, bankSlipUrl?: string): Promise<Invoice | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;
    const [updated] = await db
      .update(invoices)
      .set({
        status: 'paid' as any,
        paidAmount: invoice.totalAmount,
        paymentMethod,
        bankSlipUrl,
        paymentDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
  }

  // Invoice Items
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [created] = await db.insert(invoiceItems).values(item).returning();
    return created;
  }

  async createInvoiceItemsBulk(items: InsertInvoiceItem[]): Promise<InvoiceItem[]> {
    if (items.length === 0) return [];
    const created = await db.insert(invoiceItems).values(items).returning();
    return created;
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async deleteInvoiceItemsByInvoice(invoiceId: number): Promise<boolean> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    return true;
  }

  // Subjects
  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [created] = await db.insert(subjects).values(subject).returning();
    return created;
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async getSubjectsByGrade(grade: number): Promise<Subject[]> {
    return db.select().from(subjects).where(eq(subjects.grade, grade)).orderBy(asc(subjects.name));
  }

  async getAllSubjects(): Promise<Subject[]> {
    return db.select().from(subjects).orderBy(asc(subjects.grade), asc(subjects.name));
  }

  async updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [updated] = await db.update(subjects).set(subject).where(eq(subjects.id, id)).returning();
    return updated;
  }

  async deleteSubject(id: number): Promise<boolean> {
    await db.delete(subjects).where(eq(subjects.id, id));
    return true;
  }

  // Exam Timetable
  async createTimetableEntry(entry: InsertExamTimetable): Promise<ExamTimetable> {
    const [created] = await db.insert(examTimetable).values(entry).returning();
    return created;
  }

  async getTimetableByExamYear(examYearId: number): Promise<ExamTimetable[]> {
    return db.select().from(examTimetable).where(eq(examTimetable.examYearId, examYearId)).orderBy(asc(examTimetable.examDate));
  }

  async getTimetableByGrade(examYearId: number, grade: number): Promise<ExamTimetable[]> {
    return db.select().from(examTimetable).where(and(eq(examTimetable.examYearId, examYearId), eq(examTimetable.grade, grade))).orderBy(asc(examTimetable.examDate));
  }

  async updateTimetableEntry(id: number, entry: Partial<InsertExamTimetable>): Promise<ExamTimetable | undefined> {
    const [updated] = await db.update(examTimetable).set(entry).where(eq(examTimetable.id, id)).returning();
    return updated;
  }

  async deleteTimetableEntry(id: number): Promise<boolean> {
    await db.delete(examTimetable).where(eq(examTimetable.id, id));
    return true;
  }

  // Examiners
  async createExaminer(examiner: InsertExaminer): Promise<Examiner> {
    const verificationToken = randomBytes(32).toString('hex');
    const [created] = await db.insert(examiners).values({ ...examiner, verificationToken }).returning();
    return created;
  }

  async getExaminer(id: number): Promise<Examiner | undefined> {
    const [examiner] = await db.select().from(examiners).where(eq(examiners.id, id));
    return examiner;
  }

  async getExaminerByEmail(email: string): Promise<Examiner | undefined> {
    const [examiner] = await db.select().from(examiners).where(eq(examiners.email, email));
    return examiner;
  }

  async getExaminersByStatus(status: string): Promise<Examiner[]> {
    return db.select().from(examiners).where(eq(examiners.status, status as any)).orderBy(asc(examiners.lastName));
  }

  async getExaminersByRegion(regionId: number): Promise<Examiner[]> {
    return db.select().from(examiners).where(eq(examiners.regionId, regionId)).orderBy(asc(examiners.lastName));
  }

  async getAllExaminers(): Promise<Examiner[]> {
    return db.select().from(examiners).orderBy(asc(examiners.lastName), asc(examiners.firstName));
  }

  async updateExaminer(id: number, examiner: Partial<InsertExaminer>): Promise<Examiner | undefined> {
    const [updated] = await db.update(examiners).set({ ...examiner, updatedAt: new Date() }).where(eq(examiners.id, id)).returning();
    return updated;
  }

  async verifyExaminer(id: number): Promise<Examiner | undefined> {
    const [updated] = await db.update(examiners).set({ status: 'verified' as any, updatedAt: new Date() }).where(eq(examiners.id, id)).returning();
    return updated;
  }

  async deleteExaminer(id: number): Promise<boolean> {
    await db.delete(examiners).where(eq(examiners.id, id));
    return true;
  }

  // Examiner Assignments
  async createExaminerAssignment(assignment: InsertExaminerAssignment): Promise<ExaminerAssignment> {
    const [created] = await db.insert(examinerAssignments).values(assignment).returning();
    return created;
  }

  async getExaminerAssignments(examinerId: number): Promise<ExaminerAssignment[]> {
    return db.select().from(examinerAssignments).where(eq(examinerAssignments.examinerId, examinerId));
  }

  async getAssignmentsByCenter(centerId: number): Promise<ExaminerAssignment[]> {
    return db.select().from(examinerAssignments).where(eq(examinerAssignments.centerId, centerId));
  }

  async updateExaminerAssignment(id: number, assignment: Partial<InsertExaminerAssignment>): Promise<ExaminerAssignment | undefined> {
    const [updated] = await db.update(examinerAssignments).set(assignment).where(eq(examinerAssignments.id, id)).returning();
    return updated;
  }

  async deleteExaminerAssignment(id: number): Promise<boolean> {
    await db.delete(examinerAssignments).where(eq(examinerAssignments.id, id));
    return true;
  }

  // Student Results
  async createStudentResult(result: InsertStudentResult): Promise<StudentResult> {
    const [created] = await db.insert(studentResults).values(result).returning();
    return created;
  }

  async createStudentResultsBulk(resultList: InsertStudentResult[]): Promise<StudentResult[]> {
    if (resultList.length === 0) return [];
    return db.insert(studentResults).values(resultList).returning();
  }

  async getStudentResult(id: number): Promise<StudentResult | undefined> {
    const [result] = await db.select().from(studentResults).where(eq(studentResults.id, id));
    return result;
  }

  async getResultsByStudent(studentId: number): Promise<StudentResult[]> {
    return db.select().from(studentResults).where(eq(studentResults.studentId, studentId));
  }

  async getResultsByExamYear(examYearId: number): Promise<StudentResult[]> {
    return db.select().from(studentResults).where(eq(studentResults.examYearId, examYearId));
  }

  async getResultsBySubject(subjectId: number): Promise<StudentResult[]> {
    return db.select().from(studentResults).where(eq(studentResults.subjectId, subjectId));
  }

  async getPendingResults(): Promise<StudentResult[]> {
    return db.select().from(studentResults).where(eq(studentResults.status, 'pending'));
  }

  async updateStudentResult(id: number, result: Partial<InsertStudentResult>): Promise<StudentResult | undefined> {
    const [updated] = await db.update(studentResults).set({ ...result, updatedAt: new Date() }).where(eq(studentResults.id, id)).returning();
    return updated;
  }

  async validateResult(id: number, validatorId: string): Promise<StudentResult | undefined> {
    const [updated] = await db.update(studentResults).set({ status: 'validated' as any, validatedBy: validatorId, updatedAt: new Date() }).where(eq(studentResults.id, id)).returning();
    return updated;
  }

  async publishResults(examYearId: number): Promise<number> {
    const result = await db.update(studentResults).set({ status: 'published' as any, updatedAt: new Date() }).where(and(eq(studentResults.examYearId, examYearId), eq(studentResults.status, 'validated')));
    return 0;
  }

  async deleteStudentResult(id: number): Promise<boolean> {
    await db.delete(studentResults).where(eq(studentResults.id, id));
    return true;
  }

  // Certificates
  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const [created] = await db.insert(certificates).values(certificate).returning();
    return created;
  }

  async getCertificate(id: number): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.id, id));
    return certificate;
  }

  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.certificateNumber, certificateNumber));
    return certificate;
  }

  async getCertificatesByStudent(studentId: number): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.studentId, studentId));
  }

  async getCertificatesByExamYear(examYearId: number): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.examYearId, examYearId));
  }

  async updateCertificate(id: number, certificate: Partial<InsertCertificate>): Promise<Certificate | undefined> {
    const [updated] = await db.update(certificates).set({ ...certificate, updatedAt: new Date() }).where(eq(certificates.id, id)).returning();
    return updated;
  }

  async getCertificateByQrToken(qrToken: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.qrToken, qrToken));
    return certificate;
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return db.select().from(certificates).orderBy(desc(certificates.createdAt));
  }

  async incrementCertificatePrintCount(id: number): Promise<Certificate | undefined> {
    const cert = await this.getCertificate(id);
    if (!cert) return undefined;
    const [updated] = await db.update(certificates).set({ 
      printCount: (cert.printCount || 0) + 1,
      updatedAt: new Date()
    }).where(eq(certificates.id, id)).returning();
    return updated;
  }

  async deleteCertificate(id: number): Promise<boolean> {
    await db.delete(certificates).where(eq(certificates.id, id));
    return true;
  }

  // Transcripts
  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    const [created] = await db.insert(transcripts).values(transcript).returning();
    return created;
  }

  async getTranscript(id: number): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.id, id));
    return transcript;
  }

  async getTranscriptByNumber(transcriptNumber: string): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.transcriptNumber, transcriptNumber));
    return transcript;
  }

  async getTranscriptByQrToken(qrToken: string): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.qrToken, qrToken));
    return transcript;
  }

  async getTranscriptsByStudent(studentId: number): Promise<Transcript[]> {
    return db.select().from(transcripts).where(eq(transcripts.studentId, studentId));
  }

  async getTranscriptsByExamYear(examYearId: number): Promise<Transcript[]> {
    return db.select().from(transcripts).where(eq(transcripts.examYearId, examYearId));
  }

  async updateTranscript(id: number, transcript: Partial<InsertTranscript>): Promise<Transcript | undefined> {
    const [updated] = await db.update(transcripts).set(transcript).where(eq(transcripts.id, id)).returning();
    return updated;
  }

  async incrementTranscriptPrintCount(id: number): Promise<Transcript | undefined> {
    const trans = await this.getTranscript(id);
    if (!trans) return undefined;
    const [updated] = await db.update(transcripts).set({ 
      printCount: (trans.printCount || 0) + 1
    }).where(eq(transcripts.id, id)).returning();
    return updated;
  }

  async deleteTranscript(id: number): Promise<boolean> {
    await db.delete(transcripts).where(eq(transcripts.id, id));
    return true;
  }

  // Attendance Records
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [created] = await db.insert(attendanceRecords).values(record).returning();
    return created;
  }

  async getAttendanceByStudent(studentId: number): Promise<AttendanceRecord[]> {
    return db.select().from(attendanceRecords).where(eq(attendanceRecords.studentId, studentId));
  }

  async getAttendanceByCenter(centerId: number, subjectId: number): Promise<AttendanceRecord[]> {
    return db.select().from(attendanceRecords).where(and(eq(attendanceRecords.centerId, centerId), eq(attendanceRecords.subjectId, subjectId)));
  }

  async updateAttendanceRecord(id: number, record: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord | undefined> {
    const [updated] = await db.update(attendanceRecords).set(record).where(eq(attendanceRecords.id, id)).returning();
    return updated;
  }

  // Malpractice Reports
  async createMalpracticeReport(report: InsertMalpracticeReport): Promise<MalpracticeReport> {
    const [created] = await db.insert(malpracticeReports).values(report).returning();
    return created;
  }

  async getMalpracticeReportsByCenter(centerId: number): Promise<MalpracticeReport[]> {
    return db.select().from(malpracticeReports).where(eq(malpracticeReports.centerId, centerId));
  }

  async getMalpracticeReportsByExamYear(examYearId: number): Promise<MalpracticeReport[]> {
    return db.select().from(malpracticeReports).where(eq(malpracticeReports.examYearId, examYearId));
  }

  async updateMalpracticeReport(id: number, report: Partial<InsertMalpracticeReport>): Promise<MalpracticeReport | undefined> {
    const [updated] = await db.update(malpracticeReports).set(report).where(eq(malpracticeReports.id, id)).returning();
    return updated;
  }

  // Analytics
  async getStudentCountBySchool(examYearId: number): Promise<{ schoolId: number; count: number }[]> {
    const result = await db
      .select({ schoolId: students.schoolId, count: count() })
      .from(students)
      .where(eq(students.examYearId, examYearId))
      .groupBy(students.schoolId);
    return result.map(r => ({ schoolId: r.schoolId, count: Number(r.count) }));
  }

  async getStudentCountByRegion(examYearId: number): Promise<{ regionId: number; count: number }[]> {
    const result = await db
      .select({ regionId: schools.regionId, count: count() })
      .from(students)
      .innerJoin(schools, eq(students.schoolId, schools.id))
      .where(eq(students.examYearId, examYearId))
      .groupBy(schools.regionId);
    return result.map(r => ({ regionId: r.regionId!, count: Number(r.count) }));
  }

  async getResultsAggregateBySubject(examYearId: number): Promise<{ subjectId: number; avgScore: number; passRate: number }[]> {
    const results = await db
      .select({ subjectId: studentResults.subjectId, totalScore: studentResults.totalScore })
      .from(studentResults)
      .where(eq(studentResults.examYearId, examYearId));

    const subjectStats: { [key: number]: { total: number; count: number; passed: number } } = {};
    results.forEach(r => {
      if (!subjectStats[r.subjectId]) {
        subjectStats[r.subjectId] = { total: 0, count: 0, passed: 0 };
      }
      const score = parseFloat(r.totalScore || '0');
      subjectStats[r.subjectId].total += score;
      subjectStats[r.subjectId].count++;
      if (score >= 50) subjectStats[r.subjectId].passed++;
    });

    return Object.entries(subjectStats).map(([id, stats]) => ({
      subjectId: parseInt(id),
      avgScore: stats.count > 0 ? stats.total / stats.count : 0,
      passRate: stats.count > 0 ? (stats.passed / stats.count) * 100 : 0,
    }));
  }

  async getResultsAggregateByGender(examYearId: number): Promise<{ gender: string; avgScore: number; passRate: number }[]> {
    const results = await db
      .select({ gender: students.gender, totalScore: studentResults.totalScore })
      .from(studentResults)
      .innerJoin(students, eq(studentResults.studentId, students.id))
      .where(eq(studentResults.examYearId, examYearId));

    const genderStats: { [key: string]: { total: number; count: number; passed: number } } = {};
    results.forEach(r => {
      if (!genderStats[r.gender]) {
        genderStats[r.gender] = { total: 0, count: 0, passed: 0 };
      }
      const score = parseFloat(r.totalScore || '0');
      genderStats[r.gender].total += score;
      genderStats[r.gender].count++;
      if (score >= 50) genderStats[r.gender].passed++;
    });

    return Object.entries(genderStats).map(([gender, stats]) => ({
      gender,
      avgScore: stats.count > 0 ? stats.total / stats.count : 0,
      passRate: stats.count > 0 ? (stats.passed / stats.count) * 100 : 0,
    }));
  }

  async getDashboardStats(): Promise<{
    totalSchools: number;
    totalStudents: number;
    totalExaminers: number;
    pendingApprovals: number;
    totalRevenue: string;
  }> {
    const [schoolCount] = await db.select({ count: count() }).from(schools);
    const [studentCount] = await db.select({ count: count() }).from(students);
    const [examinerCount] = await db.select({ count: count() }).from(examiners);
    const [pendingCount] = await db.select({ count: count() }).from(schools).where(eq(schools.status, 'pending'));
    const [revenue] = await db.select({ total: sql<string>`COALESCE(SUM(paid_amount), 0)` }).from(invoices).where(eq(invoices.status, 'paid'));

    return {
      totalSchools: Number(schoolCount.count),
      totalStudents: Number(studentCount.count),
      totalExaminers: Number(examinerCount.count),
      pendingApprovals: Number(pendingCount.count),
      totalRevenue: revenue.total || '0',
    };
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(filters?: { userId?: string; entityType?: string; action?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(500);
    }
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return db.select().from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt));
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async createNotificationsBulk(notificationList: InsertNotification[]): Promise<Notification[]> {
    if (notificationList.length === 0) return [];
    return db.insert(notifications).values(notificationList).returning();
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number): Promise<boolean> {
    await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  // Authentication
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUserWithPassword(userData: UpsertUser & { password: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const { password, ...rest } = userData;
    const [user] = await db.insert(users)
      .values({ ...rest, passwordHash, status: 'active' })
      .returning();
    return user;
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return true;
  }

  async updateUserStatus(userId: string, status: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Exam Cards
  async createExamCard(card: InsertExamCard): Promise<ExamCard> {
    const [created] = await db.insert(examCards).values(card).returning();
    return created;
  }

  async getExamCard(id: number): Promise<ExamCard | undefined> {
    const [card] = await db.select().from(examCards).where(eq(examCards.id, id));
    return card;
  }

  async getExamCardByCardNumber(cardNumber: string): Promise<ExamCard | undefined> {
    const [card] = await db.select().from(examCards).where(eq(examCards.cardNumber, cardNumber));
    return card;
  }

  async getExamCardByActivationToken(token: string): Promise<ExamCard | undefined> {
    const [card] = await db.select().from(examCards).where(eq(examCards.activationToken, token));
    return card;
  }

  async getExamCardsByStudent(studentId: number): Promise<ExamCard[]> {
    return db.select().from(examCards).where(eq(examCards.studentId, studentId));
  }

  async activateExamCard(id: number, userId: string): Promise<ExamCard | undefined> {
    const [updated] = await db.update(examCards)
      .set({ isActivated: true, activatedAt: new Date(), activatedByUserId: userId })
      .where(eq(examCards.id, id))
      .returning();
    return updated;
  }

  async deleteExamCard(id: number): Promise<boolean> {
    await db.delete(examCards).where(eq(examCards.id, id));
    return true;
  }

  // System Settings
  async getSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return db.select().from(systemSettings).orderBy(asc(systemSettings.category), asc(systemSettings.key));
  }

  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return db.select().from(systemSettings).where(eq(systemSettings.category, category));
  }

  async upsertSetting(key: string, value: string, description?: string, category?: string): Promise<SystemSetting> {
    const [setting] = await db.insert(systemSettings)
      .values({ key, value, description, category: category || 'general' })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, description, category: category || 'general', updatedAt: new Date() }
      })
      .returning();
    return setting;
  }

  async deleteSetting(key: string): Promise<boolean> {
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
    return true;
  }

  // ===== WEBSITE CONTENT MANAGEMENT =====

  // News Categories
  async createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory> {
    const [created] = await db.insert(newsCategories).values(category).returning();
    return created;
  }

  async getNewsCategory(id: number): Promise<NewsCategory | undefined> {
    const [category] = await db.select().from(newsCategories).where(eq(newsCategories.id, id));
    return category;
  }

  async getAllNewsCategories(): Promise<NewsCategory[]> {
    return db.select().from(newsCategories).orderBy(asc(newsCategories.name));
  }

  async updateNewsCategory(id: number, category: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined> {
    const [updated] = await db.update(newsCategories).set(category).where(eq(newsCategories.id, id)).returning();
    return updated;
  }

  async deleteNewsCategory(id: number): Promise<boolean> {
    await db.delete(newsCategories).where(eq(newsCategories.id, id));
    return true;
  }

  // News Articles
  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const [created] = await db.insert(newsArticles).values(article).returning();
    return created;
  }

  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
    return article;
  }

  async getNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.slug, slug));
    return article;
  }

  async getPublishedNewsArticles(): Promise<NewsArticle[]> {
    return db.select().from(newsArticles)
      .where(eq(newsArticles.isPublished, true))
      .orderBy(desc(newsArticles.publishedAt));
  }

  async getFeaturedNewsArticles(): Promise<NewsArticle[]> {
    return db.select().from(newsArticles)
      .where(and(eq(newsArticles.isPublished, true), eq(newsArticles.isFeatured, true)))
      .orderBy(desc(newsArticles.publishedAt));
  }

  async getNewsArticlesByCategory(categoryId: number): Promise<NewsArticle[]> {
    return db.select().from(newsArticles)
      .where(and(eq(newsArticles.categoryId, categoryId), eq(newsArticles.isPublished, true)))
      .orderBy(desc(newsArticles.publishedAt));
  }

  async getAllNewsArticles(): Promise<NewsArticle[]> {
    return db.select().from(newsArticles).orderBy(desc(newsArticles.createdAt));
  }

  async updateNewsArticle(id: number, article: Partial<InsertNewsArticle>): Promise<NewsArticle | undefined> {
    const [updated] = await db.update(newsArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(eq(newsArticles.id, id))
      .returning();
    return updated;
  }

  async incrementNewsArticleViewCount(id: number): Promise<void> {
    await db.update(newsArticles)
      .set({ viewCount: sql`${newsArticles.viewCount} + 1` })
      .where(eq(newsArticles.id, id));
  }

  async deleteNewsArticle(id: number): Promise<boolean> {
    await db.delete(newsArticles).where(eq(newsArticles.id, id));
    return true;
  }

  // Resource Categories
  async createResourceCategory(category: InsertResourceCategory): Promise<ResourceCategory> {
    const [created] = await db.insert(resourceCategories).values(category).returning();
    return created;
  }

  async getResourceCategory(id: number): Promise<ResourceCategory | undefined> {
    const [category] = await db.select().from(resourceCategories).where(eq(resourceCategories.id, id));
    return category;
  }

  async getAllResourceCategories(): Promise<ResourceCategory[]> {
    return db.select().from(resourceCategories).orderBy(asc(resourceCategories.name));
  }

  async updateResourceCategory(id: number, category: Partial<InsertResourceCategory>): Promise<ResourceCategory | undefined> {
    const [updated] = await db.update(resourceCategories).set(category).where(eq(resourceCategories.id, id)).returning();
    return updated;
  }

  async deleteResourceCategory(id: number): Promise<boolean> {
    await db.delete(resourceCategories).where(eq(resourceCategories.id, id));
    return true;
  }

  // Resources
  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  async getPublishedResources(): Promise<Resource[]> {
    return db.select().from(resources)
      .where(eq(resources.isPublished, true))
      .orderBy(desc(resources.createdAt));
  }

  async getResourcesByCategory(categoryId: number): Promise<Resource[]> {
    return db.select().from(resources)
      .where(and(eq(resources.categoryId, categoryId), eq(resources.isPublished, true)))
      .orderBy(desc(resources.createdAt));
  }

  async getAllResources(): Promise<Resource[]> {
    return db.select().from(resources).orderBy(desc(resources.createdAt));
  }

  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource | undefined> {
    const [updated] = await db.update(resources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();
    return updated;
  }

  async incrementResourceDownloadCount(id: number): Promise<void> {
    await db.update(resources)
      .set({ downloadCount: sql`${resources.downloadCount} + 1` })
      .where(eq(resources.id, id));
  }

  async deleteResource(id: number): Promise<boolean> {
    await db.delete(resources).where(eq(resources.id, id));
    return true;
  }

  // Announcements
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [ann] = await db.select().from(announcements).where(eq(announcements.id, id));
    return ann;
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const now = new Date();
    return db.select().from(announcements)
      .where(and(
        eq(announcements.isActive, true),
        or(
          sql`${announcements.displayStartDate} IS NULL`,
          lte(announcements.displayStartDate, now)
        ),
        or(
          sql`${announcements.displayEndDate} IS NULL`,
          gte(announcements.displayEndDate, now)
        )
      ))
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }

  async getHomepageAnnouncements(): Promise<Announcement[]> {
    const now = new Date();
    return db.select().from(announcements)
      .where(and(
        eq(announcements.isActive, true),
        eq(announcements.displayOnHomepage, true),
        or(
          sql`${announcements.displayStartDate} IS NULL`,
          lte(announcements.displayStartDate, now)
        ),
        or(
          sql`${announcements.displayEndDate} IS NULL`,
          gte(announcements.displayEndDate, now)
        )
      ))
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [updated] = await db.update(announcements)
      .set({ ...announcement, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    await db.delete(announcements).where(eq(announcements.id, id));
    return true;
  }

  // Newsletter Subscribers
  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [created] = await db.insert(newsletterSubscribers).values(subscriber).returning();
    return created;
  }

  async getNewsletterSubscriber(id: number): Promise<NewsletterSubscriber | undefined> {
    const [sub] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
    return sub;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const [sub] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    return sub;
  }

  async getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.isActive, true))
      .orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async updateNewsletterSubscriber(id: number, subscriber: Partial<InsertNewsletterSubscriber>): Promise<NewsletterSubscriber | undefined> {
    const [updated] = await db.update(newsletterSubscribers)
      .set(subscriber)
      .where(eq(newsletterSubscribers.id, id))
      .returning();
    return updated;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    await db.update(newsletterSubscribers)
      .set({ isActive: false, unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));
    return true;
  }

  async deleteNewsletterSubscriber(id: number): Promise<boolean> {
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
    return true;
  }

  // Impact Stats
  async createImpactStat(stat: InsertImpactStat): Promise<ImpactStat> {
    const [created] = await db.insert(impactStats).values(stat).returning();
    return created;
  }

  async getImpactStat(id: number): Promise<ImpactStat | undefined> {
    const [stat] = await db.select().from(impactStats).where(eq(impactStats.id, id));
    return stat;
  }

  async getActiveImpactStats(): Promise<ImpactStat[]> {
    return db.select().from(impactStats)
      .where(eq(impactStats.isActive, true))
      .orderBy(asc(impactStats.displayOrder));
  }

  async getAllImpactStats(): Promise<ImpactStat[]> {
    return db.select().from(impactStats).orderBy(asc(impactStats.displayOrder));
  }

  async updateImpactStat(id: number, stat: Partial<InsertImpactStat>): Promise<ImpactStat | undefined> {
    const [updated] = await db.update(impactStats)
      .set({ ...stat, updatedAt: new Date() })
      .where(eq(impactStats.id, id))
      .returning();
    return updated;
  }

  async deleteImpactStat(id: number): Promise<boolean> {
    await db.delete(impactStats).where(eq(impactStats.id, id));
    return true;
  }

  // ===== LOGISTICS MANAGEMENT =====

  // Paper Movements
  async createPaperMovement(movement: InsertPaperMovement): Promise<PaperMovement> {
    const [created] = await db.insert(paperMovements).values(movement).returning();
    return created;
  }

  async getPaperMovement(id: number): Promise<PaperMovement | undefined> {
    const [movement] = await db.select().from(paperMovements).where(eq(paperMovements.id, id));
    return movement;
  }

  async getPaperMovementsByCenter(centerId: number, examYearId: number): Promise<PaperMovement[]> {
    return db.select().from(paperMovements)
      .where(and(eq(paperMovements.centerId, centerId), eq(paperMovements.examYearId, examYearId)))
      .orderBy(desc(paperMovements.createdAt));
  }

  async getPaperMovementsByExamYear(examYearId: number): Promise<PaperMovement[]> {
    return db.select().from(paperMovements)
      .where(eq(paperMovements.examYearId, examYearId))
      .orderBy(desc(paperMovements.createdAt));
  }

  async updatePaperMovement(id: number, movement: Partial<InsertPaperMovement>): Promise<PaperMovement | undefined> {
    const [updated] = await db.update(paperMovements)
      .set(movement)
      .where(eq(paperMovements.id, id))
      .returning();
    return updated;
  }

  async deletePaperMovement(id: number): Promise<boolean> {
    await db.delete(paperMovements).where(eq(paperMovements.id, id));
    return true;
  }

  // Script Movements
  async createScriptMovement(movement: InsertScriptMovement): Promise<ScriptMovement> {
    const [created] = await db.insert(scriptMovements).values(movement).returning();
    return created;
  }

  async getScriptMovement(id: number): Promise<ScriptMovement | undefined> {
    const [movement] = await db.select().from(scriptMovements).where(eq(scriptMovements.id, id));
    return movement;
  }

  async getScriptMovementsByCenter(centerId: number, examYearId: number): Promise<ScriptMovement[]> {
    return db.select().from(scriptMovements)
      .where(and(eq(scriptMovements.centerId, centerId), eq(scriptMovements.examYearId, examYearId)))
      .orderBy(desc(scriptMovements.createdAt));
  }

  async getScriptMovementsByExamYear(examYearId: number): Promise<ScriptMovement[]> {
    return db.select().from(scriptMovements)
      .where(eq(scriptMovements.examYearId, examYearId))
      .orderBy(desc(scriptMovements.createdAt));
  }

  async updateScriptMovement(id: number, movement: Partial<InsertScriptMovement>): Promise<ScriptMovement | undefined> {
    const [updated] = await db.update(scriptMovements)
      .set(movement)
      .where(eq(scriptMovements.id, id))
      .returning();
    return updated;
  }

  async deleteScriptMovement(id: number): Promise<boolean> {
    await db.delete(scriptMovements).where(eq(scriptMovements.id, id));
    return true;
  }

  // Center Assignments
  async createCenterAssignment(assignment: InsertCenterAssignment): Promise<CenterAssignment> {
    const [created] = await db.insert(centerAssignments).values(assignment).returning();
    return created;
  }

  async getCenterAssignment(id: number): Promise<CenterAssignment | undefined> {
    const [assignment] = await db.select().from(centerAssignments).where(eq(centerAssignments.id, id));
    return assignment;
  }

  async getCenterAssignmentsByExamYear(examYearId: number): Promise<CenterAssignment[]> {
    return db.select().from(centerAssignments)
      .where(eq(centerAssignments.examYearId, examYearId))
      .orderBy(desc(centerAssignments.createdAt));
  }

  async getCenterAssignmentsByCenter(centerId: number, examYearId: number): Promise<CenterAssignment[]> {
    return db.select().from(centerAssignments)
      .where(and(eq(centerAssignments.centerId, centerId), eq(centerAssignments.examYearId, examYearId)))
      .orderBy(desc(centerAssignments.createdAt));
  }

  async getCenterAssignmentBySchool(schoolId: number, examYearId: number): Promise<CenterAssignment | undefined> {
    const [assignment] = await db.select().from(centerAssignments)
      .where(and(eq(centerAssignments.schoolId, schoolId), eq(centerAssignments.examYearId, examYearId)));
    return assignment;
  }

  async updateCenterAssignment(id: number, assignment: Partial<InsertCenterAssignment>): Promise<CenterAssignment | undefined> {
    const [updated] = await db.update(centerAssignments)
      .set(assignment)
      .where(eq(centerAssignments.id, id))
      .returning();
    return updated;
  }

  async deleteCenterAssignment(id: number): Promise<boolean> {
    await db.delete(centerAssignments).where(eq(centerAssignments.id, id));
    return true;
  }

  // Center Activity Logs
  async createCenterActivityLog(log: InsertCenterActivityLog): Promise<CenterActivityLog> {
    const [created] = await db.insert(centerActivityLogs).values(log).returning();
    return created;
  }

  async getCenterActivityLogs(centerId: number, examYearId?: number): Promise<CenterActivityLog[]> {
    if (examYearId) {
      return db.select().from(centerActivityLogs)
        .where(and(eq(centerActivityLogs.centerId, centerId), eq(centerActivityLogs.examYearId, examYearId)))
        .orderBy(desc(centerActivityLogs.createdAt));
    }
    return db.select().from(centerActivityLogs)
      .where(eq(centerActivityLogs.centerId, centerId))
      .orderBy(desc(centerActivityLogs.createdAt));
  }

  async getCenterActivityLogsByType(centerId: number, activityType: string): Promise<CenterActivityLog[]> {
    return db.select().from(centerActivityLogs)
      .where(and(eq(centerActivityLogs.centerId, centerId), eq(centerActivityLogs.activityType, activityType)))
      .orderBy(desc(centerActivityLogs.createdAt));
  }
}

export const storage = new DatabaseStorage();
