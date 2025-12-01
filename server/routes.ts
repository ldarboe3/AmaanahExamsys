import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { db } from "./db";
import { users, sessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import {
  insertSchoolSchema, insertStudentSchema, insertExamYearSchema,
  insertExamCenterSchema, insertRegionSchema, insertClusterSchema,
  insertInvoiceSchema, insertSubjectSchema, insertExamTimetableSchema,
  insertExaminerSchema, insertExaminerAssignmentSchema, insertStudentResultSchema,
  insertCertificateSchema, insertAttendanceRecordSchema, insertMalpracticeReportSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const PgStore = connectPgSimple(session);

async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role || '')) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "sessions",
        createTableIfMissing: false,
      }),
      secret: process.env.SESSION_SECRET || "amaanah-exam-system-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    })
  );

  // Auth routes
  app.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.get("/api/auth/login", async (req, res) => {
    const userId = req.headers["x-replit-user-id"] as string;
    const userName = req.headers["x-replit-user-name"] as string;
    const userProfileImage = req.headers["x-replit-user-profile-image"] as string;

    if (!userId) {
      return res.status(401).json({ message: "Replit auth headers missing" });
    }

    const user = await storage.upsertUser({
      id: userId,
      email: userName ? `${userName}@replit.user` : undefined,
      firstName: userName,
      profileImageUrl: userProfileImage,
    });

    req.session.userId = user.id;
    res.json(user);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const baseStats = await storage.getDashboardStats();
      const pendingSchools = await storage.getSchoolsByStatus('pending');
      const pendingStudents = await storage.getPendingStudents();
      const pendingInvoices = await storage.getInvoicesByStatus('pending');
      const pendingResults = await storage.getPendingResults();
      const activeExamYear = await storage.getActiveExamYear();
      
      res.json({
        totalSchools: baseStats.totalSchools,
        pendingSchools: pendingSchools.length,
        totalStudents: baseStats.totalStudents,
        pendingStudents: pendingStudents.length,
        totalRevenue: parseFloat(baseStats.totalRevenue),
        pendingPayments: pendingInvoices.length,
        resultsPublished: 0,
        pendingResults: pendingResults.length,
        activeExamYear: activeExamYear ? {
          id: activeExamYear.id,
          name: activeExamYear.name,
          registrationEndDate: activeExamYear.registrationEndDate?.toISOString() || null,
        } : null,
        recentActivity: [],
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Regions API
  app.get("/api/regions", async (req, res) => {
    try {
      const regions = await storage.getAllRegions();
      res.json(regions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/regions/:id", async (req, res) => {
    try {
      const region = await storage.getRegion(parseInt(req.params.id));
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      res.json(region);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/regions", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertRegionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const region = await storage.createRegion(parsed.data);
      res.status(201).json(region);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/regions/:id", isAuthenticated, async (req, res) => {
    try {
      const region = await storage.updateRegion(parseInt(req.params.id), req.body);
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      res.json(region);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/regions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteRegion(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Clusters API
  app.get("/api/clusters", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const clusters = regionId
        ? await storage.getClustersByRegion(regionId)
        : await storage.getAllClusters();
      res.json(clusters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clusters/:id", async (req, res) => {
    try {
      const cluster = await storage.getCluster(parseInt(req.params.id));
      if (!cluster) {
        return res.status(404).json({ message: "Cluster not found" });
      }
      res.json(cluster);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clusters", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertClusterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const cluster = await storage.createCluster(parsed.data);
      res.status(201).json(cluster);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/clusters/:id", isAuthenticated, async (req, res) => {
    try {
      const cluster = await storage.updateCluster(parseInt(req.params.id), req.body);
      if (!cluster) {
        return res.status(404).json({ message: "Cluster not found" });
      }
      res.json(cluster);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/clusters/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCluster(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Exam Years API
  app.get("/api/exam-years", async (req, res) => {
    try {
      const examYears = await storage.getAllExamYears();
      res.json(examYears);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/exam-years/active", async (req, res) => {
    try {
      const examYear = await storage.getActiveExamYear();
      if (!examYear) {
        return res.status(404).json({ message: "No active exam year" });
      }
      res.json(examYear);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/exam-years/:id", async (req, res) => {
    try {
      const examYear = await storage.getExamYear(parseInt(req.params.id));
      if (!examYear) {
        return res.status(404).json({ message: "Exam year not found" });
      }
      res.json(examYear);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/exam-years", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertExamYearSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const examYear = await storage.createExamYear({ ...parsed.data, createdBy: req.session.userId });
      res.status(201).json(examYear);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/exam-years/:id", isAuthenticated, async (req, res) => {
    try {
      const examYear = await storage.updateExamYear(parseInt(req.params.id), req.body);
      if (!examYear) {
        return res.status(404).json({ message: "Exam year not found" });
      }
      res.json(examYear);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/exam-years/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const examYear = await storage.setActiveExamYear(parseInt(req.params.id));
      if (!examYear) {
        return res.status(404).json({ message: "Exam year not found" });
      }
      res.json(examYear);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/exam-years/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExamYear(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Exam Centers API
  app.get("/api/centers", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const clusterId = req.query.clusterId ? parseInt(req.query.clusterId as string) : undefined;
      let centers;
      if (clusterId) {
        centers = await storage.getExamCentersByCluster(clusterId);
      } else if (regionId) {
        centers = await storage.getExamCentersByRegion(regionId);
      } else {
        centers = await storage.getAllExamCenters();
      }
      res.json(centers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/centers/:id", async (req, res) => {
    try {
      const center = await storage.getExamCenter(parseInt(req.params.id));
      if (!center) {
        return res.status(404).json({ message: "Center not found" });
      }
      res.json(center);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/centers/:id/schools", async (req, res) => {
    try {
      const schools = await storage.getSchoolsByCenter(parseInt(req.params.id));
      res.json(schools);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/centers/:id/students", async (req, res) => {
    try {
      const students = await storage.getStudentsByCenter(parseInt(req.params.id));
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/centers", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertExamCenterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const center = await storage.createExamCenter(parsed.data);
      res.status(201).json(center);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/centers/:id", isAuthenticated, async (req, res) => {
    try {
      const center = await storage.updateExamCenter(parseInt(req.params.id), req.body);
      if (!center) {
        return res.status(404).json({ message: "Center not found" });
      }
      res.json(center);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/centers/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExamCenter(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Schools API
  app.get("/api/schools", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      let schools;
      if (status) {
        schools = await storage.getSchoolsByStatus(status);
      } else if (regionId) {
        schools = await storage.getSchoolsByRegion(regionId);
      } else {
        schools = await storage.getAllSchools();
      }
      res.json(schools);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schools/:id", async (req, res) => {
    try {
      const school = await storage.getSchool(parseInt(req.params.id));
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/schools", async (req, res) => {
    try {
      const parsed = insertSchoolSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const existingSchool = await storage.getSchoolByEmail(parsed.data.email);
      if (existingSchool) {
        return res.status(400).json({ message: "School with this email already exists" });
      }
      const school = await storage.createSchool(parsed.data);
      res.status(201).json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schools/verify/:token", async (req, res) => {
    try {
      const school = await storage.verifySchoolEmail(req.params.token);
      if (!school) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      res.json({ message: "Email verified successfully", school });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/schools/:id", isAuthenticated, async (req, res) => {
    try {
      const school = await storage.updateSchool(parseInt(req.params.id), req.body);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/schools/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const school = await storage.approveSchool(parseInt(req.params.id));
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/schools/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const school = await storage.rejectSchool(parseInt(req.params.id));
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/schools/:id/assign-center", isAuthenticated, async (req, res) => {
    try {
      const { centerId } = req.body;
      if (!centerId) {
        return res.status(400).json({ message: "centerId is required" });
      }
      const school = await storage.assignSchoolToCenter(parseInt(req.params.id), centerId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/schools/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSchool(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Students API
  app.get("/api/students", async (req, res) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const status = req.query.status as string | undefined;
      let students;
      if (status === 'pending') {
        students = await storage.getPendingStudents();
      } else if (schoolId) {
        students = await storage.getStudentsBySchool(schoolId);
      } else if (examYearId) {
        students = await storage.getStudentsByExamYear(examYearId);
      } else {
        students = await storage.getAllStudents();
      }
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.getStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/students/index/:indexNumber", async (req, res) => {
    try {
      const student = await storage.getStudentByIndexNumber(req.params.indexNumber);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertStudentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const student = await storage.createStudent(parsed.data);
      res.status(201).json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students/bulk", isAuthenticated, async (req, res) => {
    try {
      const { students: studentList } = req.body;
      if (!Array.isArray(studentList)) {
        return res.status(400).json({ message: "students must be an array" });
      }
      const validStudents: any[] = [];
      const errors: any[] = [];
      studentList.forEach((s, index) => {
        const parsed = insertStudentSchema.safeParse(s);
        if (parsed.success) {
          validStudents.push(parsed.data);
        } else {
          errors.push({ row: index + 1, error: fromZodError(parsed.error).message });
        }
      });
      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation errors", errors, validCount: validStudents.length });
      }
      const students = await storage.createStudentsBulk(validStudents);
      res.status(201).json({ created: students.length, students });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const student = await storage.updateStudent(parseInt(req.params.id), req.body);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const student = await storage.approveStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const student = await storage.rejectStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students/generate-index-numbers", isAuthenticated, async (req, res) => {
    try {
      const { studentIds, prefix } = req.body;
      if (!Array.isArray(studentIds) || !prefix) {
        return res.status(400).json({ message: "studentIds array and prefix are required" });
      }
      const students = await storage.generateIndexNumbers(studentIds, prefix);
      res.json({ generated: students.length, students });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteStudent(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoices API
  app.get("/api/invoices", async (req, res) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const status = req.query.status as string | undefined;
      let invoices;
      if (status) {
        invoices = await storage.getInvoicesByStatus(status);
      } else if (schoolId) {
        invoices = await storage.getInvoicesBySchool(schoolId);
      } else {
        invoices = await storage.getAllInvoices();
      }
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const invoice = await storage.createInvoice(parsed.data);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/generate", isAuthenticated, async (req, res) => {
    try {
      const { schoolId, examYearId, feePerStudent } = req.body;
      if (!schoolId || !examYearId || !feePerStudent) {
        return res.status(400).json({ message: "schoolId, examYearId, and feePerStudent are required" });
      }
      const students = await storage.getStudentsBySchool(schoolId);
      const approvedStudents = students.filter(s => s.status === 'approved');
      if (approvedStudents.length === 0) {
        return res.status(400).json({ message: "No approved students to invoice" });
      }
      const invoiceNumber = `INV-${examYearId}-${schoolId}-${Date.now()}`;
      const totalAmount = (approvedStudents.length * feePerStudent).toFixed(2);
      const invoice = await storage.createInvoice({
        invoiceNumber,
        schoolId,
        examYearId,
        totalStudents: approvedStudents.length,
        feePerStudent: feePerStudent.toString(),
        totalAmount,
      });
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.body);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/pay", isAuthenticated, async (req, res) => {
    try {
      const { paymentMethod, bankSlipUrl } = req.body;
      if (!paymentMethod) {
        return res.status(400).json({ message: "paymentMethod is required" });
      }
      const invoice = await storage.markInvoicePaid(parseInt(req.params.id), paymentMethod, bankSlipUrl);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Subjects API
  app.get("/api/subjects", async (req, res) => {
    try {
      const grade = req.query.grade ? parseInt(req.query.grade as string) : undefined;
      const subjects = grade
        ? await storage.getSubjectsByGrade(grade)
        : await storage.getAllSubjects();
      res.json(subjects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/subjects/:id", async (req, res) => {
    try {
      const subject = await storage.getSubject(parseInt(req.params.id));
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      res.json(subject);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertSubjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const subject = await storage.createSubject(parsed.data);
      res.status(201).json(subject);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const subject = await storage.updateSubject(parseInt(req.params.id), req.body);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      res.json(subject);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSubject(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Exam Timetable API
  app.get("/api/timetable", async (req, res) => {
    try {
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const grade = req.query.grade ? parseInt(req.query.grade as string) : undefined;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      const timetable = grade
        ? await storage.getTimetableByGrade(examYearId, grade)
        : await storage.getTimetableByExamYear(examYearId);
      res.json(timetable);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/timetable", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertExamTimetableSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const entry = await storage.createTimetableEntry(parsed.data);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const entry = await storage.updateTimetableEntry(parseInt(req.params.id), req.body);
      if (!entry) {
        return res.status(404).json({ message: "Timetable entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTimetableEntry(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Examiners API
  app.get("/api/examiners", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      let examiners;
      if (status) {
        examiners = await storage.getExaminersByStatus(status);
      } else if (regionId) {
        examiners = await storage.getExaminersByRegion(regionId);
      } else {
        examiners = await storage.getAllExaminers();
      }
      res.json(examiners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/examiners/:id", async (req, res) => {
    try {
      const examiner = await storage.getExaminer(parseInt(req.params.id));
      if (!examiner) {
        return res.status(404).json({ message: "Examiner not found" });
      }
      res.json(examiner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/examiners", async (req, res) => {
    try {
      const parsed = insertExaminerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const existingExaminer = await storage.getExaminerByEmail(parsed.data.email);
      if (existingExaminer) {
        return res.status(400).json({ message: "Examiner with this email already exists" });
      }
      const examiner = await storage.createExaminer(parsed.data);
      res.status(201).json(examiner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/examiners/:id", isAuthenticated, async (req, res) => {
    try {
      const examiner = await storage.updateExaminer(parseInt(req.params.id), req.body);
      if (!examiner) {
        return res.status(404).json({ message: "Examiner not found" });
      }
      res.json(examiner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/examiners/:id/verify", isAuthenticated, async (req, res) => {
    try {
      const examiner = await storage.verifyExaminer(parseInt(req.params.id));
      if (!examiner) {
        return res.status(404).json({ message: "Examiner not found" });
      }
      res.json(examiner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/examiners/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExaminer(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Examiner Assignments API
  app.get("/api/examiner-assignments", async (req, res) => {
    try {
      const examinerId = req.query.examinerId ? parseInt(req.query.examinerId as string) : undefined;
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      let assignments;
      if (examinerId) {
        assignments = await storage.getExaminerAssignments(examinerId);
      } else if (centerId) {
        assignments = await storage.getAssignmentsByCenter(centerId);
      } else {
        return res.status(400).json({ message: "examinerId or centerId is required" });
      }
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/examiner-assignments", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertExaminerAssignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const assignment = await storage.createExaminerAssignment(parsed.data);
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/examiner-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.updateExaminerAssignment(parseInt(req.params.id), req.body);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/examiner-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExaminerAssignment(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Student Results API
  app.get("/api/results", async (req, res) => {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      const pending = req.query.pending === 'true';
      let results;
      if (pending) {
        results = await storage.getPendingResults();
      } else if (studentId) {
        results = await storage.getResultsByStudent(studentId);
      } else if (subjectId) {
        results = await storage.getResultsBySubject(subjectId);
      } else if (examYearId) {
        results = await storage.getResultsByExamYear(examYearId);
      } else {
        return res.status(400).json({ message: "At least one filter parameter is required" });
      }
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/results/:id", async (req, res) => {
    try {
      const result = await storage.getStudentResult(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/results", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertStudentResultSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const result = await storage.createStudentResult(parsed.data);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/results/bulk", isAuthenticated, async (req, res) => {
    try {
      const { results: resultList } = req.body;
      if (!Array.isArray(resultList)) {
        return res.status(400).json({ message: "results must be an array" });
      }
      const validResults: any[] = [];
      const errors: any[] = [];
      resultList.forEach((r, index) => {
        const parsed = insertStudentResultSchema.safeParse(r);
        if (parsed.success) {
          validResults.push(parsed.data);
        } else {
          errors.push({ row: index + 1, error: fromZodError(parsed.error).message });
        }
      });
      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation errors", errors, validCount: validResults.length });
      }
      const results = await storage.createStudentResultsBulk(validResults);
      res.status(201).json({ created: results.length, results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/results/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.updateStudentResult(parseInt(req.params.id), req.body);
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/results/:id/validate", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.validateResult(parseInt(req.params.id), req.session.userId!);
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/results/publish", isAuthenticated, async (req, res) => {
    try {
      const { examYearId } = req.body;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      const count = await storage.publishResults(examYearId);
      res.json({ message: "Results published", count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/results/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteStudentResult(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public Result Verification
  app.get("/api/verify/result/:indexNumber", async (req, res) => {
    try {
      const student = await storage.getStudentByIndexNumber(req.params.indexNumber);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      const results = await storage.getResultsByStudent(student.id);
      const publishedResults = results.filter(r => r.status === 'published');
      if (publishedResults.length === 0) {
        return res.status(404).json({ message: "No published results found" });
      }
      res.json({
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          indexNumber: student.indexNumber,
          grade: student.grade,
        },
        results: publishedResults,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Certificates API
  app.get("/api/certificates", async (req, res) => {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      let certificates;
      if (studentId) {
        certificates = await storage.getCertificatesByStudent(studentId);
      } else if (examYearId) {
        certificates = await storage.getCertificatesByExamYear(examYearId);
      } else {
        return res.status(400).json({ message: "studentId or examYearId is required" });
      }
      res.json(certificates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/certificates/:id", async (req, res) => {
    try {
      const certificate = await storage.getCertificate(parseInt(req.params.id));
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/certificates/verify/:certificateNumber", async (req, res) => {
    try {
      const certificate = await storage.getCertificateByNumber(req.params.certificateNumber);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/certificates", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCertificateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const certificate = await storage.createCertificate(parsed.data);
      res.status(201).json(certificate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/certificates/:id", isAuthenticated, async (req, res) => {
    try {
      const certificate = await storage.updateCertificate(parseInt(req.params.id), req.body);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/certificates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCertificate(parseInt(req.params.id));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Attendance Records API
  app.get("/api/attendance", async (req, res) => {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      let records;
      if (studentId) {
        records = await storage.getAttendanceByStudent(studentId);
      } else if (centerId && subjectId) {
        records = await storage.getAttendanceByCenter(centerId, subjectId);
      } else {
        return res.status(400).json({ message: "studentId or (centerId and subjectId) are required" });
      }
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertAttendanceRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const record = await storage.createAttendanceRecord({ ...parsed.data, recordedBy: req.session.userId });
      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/attendance/:id", isAuthenticated, async (req, res) => {
    try {
      const record = await storage.updateAttendanceRecord(parseInt(req.params.id), req.body);
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Malpractice Reports API
  app.get("/api/malpractice", async (req, res) => {
    try {
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      let reports;
      if (centerId) {
        reports = await storage.getMalpracticeReportsByCenter(centerId);
      } else if (examYearId) {
        reports = await storage.getMalpracticeReportsByExamYear(examYearId);
      } else {
        return res.status(400).json({ message: "centerId or examYearId is required" });
      }
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/malpractice", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertMalpracticeReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      const report = await storage.createMalpracticeReport({ ...parsed.data, reportedBy: req.session.userId });
      res.status(201).json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/malpractice/:id", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.updateMalpracticeReport(parseInt(req.params.id), req.body);
      if (!report) {
        return res.status(404).json({ message: "Malpractice report not found" });
      }
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics API
  app.get("/api/analytics/students-by-school", async (req, res) => {
    try {
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      const data = await storage.getStudentCountBySchool(examYearId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/students-by-region", async (req, res) => {
    try {
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      const data = await storage.getStudentCountByRegion(examYearId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/results-by-subject", async (req, res) => {
    try {
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      const data = await storage.getResultsAggregateBySubject(examYearId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/results-by-gender", async (req, res) => {
    try {
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      const data = await storage.getResultsAggregateByGender(examYearId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Users management API
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req, res) => {
    try {
      const { role, schoolId, centerId } = req.body;
      if (!role) {
        return res.status(400).json({ message: "role is required" });
      }
      const user = await storage.updateUserRole(req.params.id, role, schoolId, centerId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // CSV Template endpoints for downloads
  app.get("/api/templates/students", (req, res) => {
    const csvContent = `firstName,lastName,middleName,dateOfBirth,placeOfBirth,gender,grade
John,Doe,Michael,2008-05-15,City Name,male,9
Jane,Smith,,2009-03-22,Town Name,female,10`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=students_template.csv');
    res.send(csvContent);
  });

  app.get("/api/templates/results", (req, res) => {
    const csvContent = `indexNumber,subjectCode,firstTermScore,examScore
100001,ARABIC,25,50
100001,ISLAMIC,30,55`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=results_template.csv');
    res.send(csvContent);
  });

  // ============ Audit Logs API ============
  app.get("/api/audit-logs", isAuthenticated, async (req, res) => {
    try {
      const { userId, entityType, action, startDate, endDate } = req.query;
      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (entityType) filters.entityType = entityType as string;
      if (action) filters.action = action as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const logs = await storage.getAuditLogs(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/audit-logs/entity/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByEntity(req.params.entityType, req.params.entityId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Notifications API ============
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(parseInt(req.params.id));
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNotification(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification triggers for system events
  app.post("/api/notifications/send-deadline-reminders", isAuthenticated, async (req, res) => {
    try {
      // Get all schools with pending registration
      const pendingSchools = await storage.getSchoolsByStatus('pending');
      const notificationList = pendingSchools.map(school => ({
        userId: school.adminId || '',
        type: 'registration_deadline' as const,
        title: 'Registration Deadline Reminder',
        message: 'Please complete your school registration before the deadline.',
        data: { schoolId: school.id, schoolName: school.name },
      })).filter(n => n.userId);
      
      if (notificationList.length > 0) {
        await storage.createNotificationsBulk(notificationList);
      }
      res.json({ sent: notificationList.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/send-payment-reminders", isAuthenticated, async (req, res) => {
    try {
      // Get all unpaid invoices
      const unpaidInvoices = await storage.getInvoicesByStatus('pending');
      const schoolIds = [...new Set(unpaidInvoices.map(inv => inv.schoolId))];
      
      const notificationList: any[] = [];
      for (const schoolId of schoolIds) {
        const school = await storage.getSchool(schoolId);
        if (school?.adminId) {
          notificationList.push({
            userId: school.adminId,
            type: 'payment_reminder' as const,
            title: 'Payment Reminder',
            message: `You have pending invoices that require payment.`,
            data: { schoolId, schoolName: school.name },
          });
        }
      }
      
      if (notificationList.length > 0) {
        await storage.createNotificationsBulk(notificationList);
      }
      res.json({ sent: notificationList.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Export API ============
  app.get("/api/export/schools/csv", isAuthenticated, async (req, res) => {
    try {
      const schools = await storage.getAllSchools();
      const csvHeader = "ID,Name,Code,Email,Phone,Address,Region,Status,Total Students,Created At\n";
      const csvRows = schools.map(s => 
        `${s.id},"${s.name}","${s.code}","${s.email}","${s.phone || ''}","${s.address || ''}",${s.regionId},"${s.status}",${s.totalStudents || 0},"${s.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=schools_export.csv');
      res.send(csvHeader + csvRows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/students/csv", isAuthenticated, async (req, res) => {
    try {
      const { schoolId, examYearId, status } = req.query;
      let students = await storage.getAllStudents();
      
      if (schoolId) students = students.filter(s => s.schoolId === parseInt(schoolId as string));
      if (examYearId) students = students.filter(s => s.examYearId === parseInt(examYearId as string));
      if (status) students = students.filter(s => s.status === status);
      
      const csvHeader = "Index Number,First Name,Last Name,Middle Name,Gender,Date of Birth,Grade,School ID,Status,Created At\n";
      const csvRows = students.map(s => 
        `"${s.indexNumber || ''}","${s.firstName}","${s.lastName}","${s.middleName || ''}","${s.gender}","${s.dateOfBirth}",${s.grade},${s.schoolId},"${s.status}","${s.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=students_export.csv');
      res.send(csvHeader + csvRows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/results/csv", isAuthenticated, async (req, res) => {
    try {
      const { examYearId, subjectId, status } = req.query;
      let results: any[] = [];
      
      if (examYearId) {
        results = await storage.getResultsByExamYear(parseInt(examYearId as string));
      } else {
        results = await storage.getPendingResults();
        const published = await storage.getResultsByExamYear(1);
        results = [...results, ...published];
      }
      
      if (subjectId) results = results.filter(r => r.subjectId === parseInt(subjectId as string));
      if (status) results = results.filter(r => r.status === status);
      
      const csvHeader = "Student ID,Subject ID,First Term Score,Exam Score,Total Score,Grade,Status,Validated By,Created At\n";
      const csvRows = results.map(r => 
        `${r.studentId},${r.subjectId},${r.firstTermScore || 0},${r.examScore || 0},"${r.totalScore || ''}","${r.grade || ''}","${r.status}","${r.validatedBy || ''}","${r.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=results_export.csv');
      res.send(csvHeader + csvRows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/invoices/csv", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let invoices = await storage.getAllInvoices();
      
      if (status) invoices = invoices.filter(i => i.status === status);
      
      const csvHeader = "Invoice Number,School ID,Exam Year ID,Total Amount,Paid Amount,Due Date,Status,Payment Method,Created At\n";
      const csvRows = invoices.map(i => 
        `"${i.invoiceNumber}",${i.schoolId},${i.examYearId},"${i.totalAmount}","${i.paidAmount || '0'}","${i.dueDate}","${i.status}","${i.paymentMethod || ''}","${i.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=invoices_export.csv');
      res.send(csvHeader + csvRows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/examiners/csv", isAuthenticated, async (req, res) => {
    try {
      const examiners = await storage.getAllExaminers();
      
      const csvHeader = "ID,First Name,Last Name,Email,Phone,Qualification,Expertise,Region ID,Status,Created At\n";
      const csvRows = examiners.map(e => 
        `${e.id},"${e.firstName}","${e.lastName}","${e.email}","${e.phone || ''}","${e.qualification || ''}","${(e.expertise || []).join('; ')}",${e.regionId || ''},"${e.status}","${e.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=examiners_export.csv');
      res.send(csvHeader + csvRows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // JSON export endpoints for report data
  app.get("/api/export/report/summary", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const schools = await storage.getAllSchools();
      const regions = await storage.getAllRegions();
      
      const reportData = {
        generatedAt: new Date().toISOString(),
        summary: stats,
        schoolsByStatus: {
          pending: schools.filter(s => s.status === 'pending').length,
          approved: schools.filter(s => s.status === 'approved').length,
          rejected: schools.filter(s => s.status === 'rejected').length,
        },
        schoolsByRegion: regions.map(r => ({
          region: r.name,
          count: schools.filter(s => s.regionId === r.id).length,
        })),
      };
      
      res.json(reportData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/report/performance", isAuthenticated, async (req, res) => {
    try {
      const { examYearId } = req.query;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      
      const yearId = parseInt(examYearId as string);
      const bySubject = await storage.getResultsAggregateBySubject(yearId);
      const byGender = await storage.getResultsAggregateByGender(yearId);
      const bySchool = await storage.getStudentCountBySchool(yearId);
      const byRegion = await storage.getStudentCountByRegion(yearId);
      
      const reportData = {
        generatedAt: new Date().toISOString(),
        examYearId: yearId,
        performanceBySubject: bySubject,
        performanceByGender: byGender,
        registrationBySchool: bySchool,
        registrationByRegion: byRegion,
      };
      
      res.json(reportData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
