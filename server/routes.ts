import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { db } from "./db";
import { users, sessions, schools, invoices, students, invoiceItems, bulkUploads, invigilatorAssignments } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import {
  insertSchoolSchema, insertStudentSchema, insertExamYearSchema,
  insertExamCenterSchema, insertRegionSchema, insertClusterSchema,
  insertInvoiceSchema, insertSubjectSchema, insertExamTimetableSchema,
  insertExaminerSchema, insertExaminerAssignmentSchema, insertStudentResultSchema,
  insertCertificateSchema, insertAttendanceRecordSchema, insertMalpracticeReportSchema,
  insertInvigilatorAssignmentSchema, insertInvoiceItemSchema, insertBulkUploadSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  sendSchoolVerificationEmail,
  sendPaymentConfirmationEmail,
  sendResultsPublishedEmail,
  sendCenterAllocationEmail,
  sendPasswordResetEmail,
  sendSchoolAdminInvitationEmail,
  sendExamYearCreatedNotification,
  sendWeeklyRegistrationReminder,
  sendUrgentRegistrationReminder,
  generateVerificationToken,
  getVerificationExpiry,
  generateIndexNumber,
  generateInvoiceNumber,
} from "./emailService";
import {
  notifyExamYearCreated,
  notifyRegistrationDeadlineApproaching,
} from "./notificationService";
import bcrypt from "bcrypt";
import multer from "multer";
import { randomBytes } from "crypto";
import * as XLSX from "xlsx";

const schoolDocUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file, cb) => {
    // Accept both image/jpeg and image/jpg (some browsers use image/jpg)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const normalizedMimetype = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
    if (allowedTypes.includes(normalizedMimetype)) {
      cb(null, true);
    } else {
      // Mark file as rejected for custom error handling
      req.fileRejected = true;
      req.fileRejectedReason = 'Invalid file type. Only PDF, JPG, and PNG files are allowed.';
      cb(null, false);
    }
  },
});

// Configure multer to handle both file and docType text field
const schoolDocUpload = schoolDocUploadConfig.fields([
  { name: 'file', maxCount: 1 },
  { name: 'docType', maxCount: 1 }
]);

// Bank slip upload config
const bankSlipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for bank slips
  fileFilter: (req: any, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  },
});

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

// Helper function to get school ID for a school admin user
// Checks user.schoolId first, then looks up by adminUserId
async function getSchoolIdForUser(user: any): Promise<number | null> {
  if (user.schoolId) {
    return user.schoolId;
  }
  
  // Try to find school by adminUserId (reverse lookup)
  const schoolByAdmin = await storage.getSchoolByAdminUserId(user.id);
  if (schoolByAdmin) {
    // Update user's schoolId for future lookups
    await db.update(users)
      .set({ schoolId: schoolByAdmin.id, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return schoolByAdmin.id;
  }
  
  return null;
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

    // Check if we have Replit auth headers
    if (userId) {
      const user = await storage.upsertUser({
        id: userId,
        email: userName ? `${userName}@replit.user` : undefined,
        firstName: userName,
        profileImageUrl: userProfileImage,
      });

      req.session.userId = user.id;
      return res.json(user);
    }

    // Dev mode fallback - create a test user if no Replit headers
    if (process.env.NODE_ENV !== "production") {
      const testUserId = "dev-user-" + Date.now();
      const user = await storage.upsertUser({
        id: testUserId,
        email: testUserId + "@amaanah.local",
        firstName: "Admin",
        role: "super_admin",
        profileImageUrl: undefined,
      });

      req.session.userId = user.id;
      return res.json(user);
    }

    return res.status(401).json({ message: "Replit auth headers missing" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  // Password-based login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, rememberMe } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Try to find user by username or email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.status === 'suspended' || user.status === 'inactive') {
        return res.status(403).json({ message: "Account is " + user.status });
      }

      const isValidPassword = await storage.verifyPassword(user.id, password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      // Set longer session duration if "Remember Me" is checked (30 days vs 24 hours)
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }
      
      // Update last login
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

      res.json({ 
        ...user, 
        passwordHash: undefined,
        mustChangePassword: user.mustChangePassword 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Register new user (admin only for most roles)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, phone, role } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // For non-admin roles, require authentication
      const allowedPublicRoles = ['school_admin'];
      if (role && !allowedPublicRoles.includes(role)) {
        if (!req.session.userId) {
          return res.status(401).json({ message: "Authentication required for this role" });
        }
        const currentUser = await storage.getUser(req.session.userId);
        if (!currentUser || !['super_admin', 'examination_admin'].includes(currentUser.role || '')) {
          return res.status(403).json({ message: "Only admins can create users with this role" });
        }
      }

      const user = await storage.createUserWithPassword({
        username,
        email,
        firstName,
        lastName,
        phone,
        role: role || 'school_admin',
        password,
      });

      res.status(201).json({ ...user, passwordHash: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Change password
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const isValid = await storage.verifyPassword(req.session.userId!, currentPassword);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      await storage.updatePassword(req.session.userId!, newPassword);
      
      // Clear the mustChangePassword flag after successful password change
      await db.update(users)
        .set({ mustChangePassword: false })
        .where(eq(users.id, req.session.userId!));
      
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user profile
  app.post("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone } = req.body;
      
      // Users can only update their own profile, unless they're admin
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const isAdmin = ['super_admin', 'examination_admin'].includes(currentUser.role || '');
      if (currentUser.id !== id && !isAdmin) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const updatedUser = await db.update(users)
        .set({ 
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...updatedUser[0], passwordHash: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reset password (admin only)
  app.post("/api/auth/reset-password", isAuthenticated, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || !['super_admin', 'examination_admin'].includes(currentUser.role || '')) {
        return res.status(403).json({ message: "Only admins can reset passwords" });
      }

      await storage.updatePassword(userId, newPassword);
      
      // Set flag to require password change on next login
      await db.update(users)
        .set({ mustChangePassword: true })
        .where(eq(users.id, userId));

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seed initial users
  app.post("/api/auth/seed-users", async (req, res) => {
    try {
      const seedUsers: Array<{username: string, email: string, firstName: string, lastName: string, role: 'super_admin' | 'examination_admin' | 'logistics_admin' | 'school_admin' | 'examiner' | 'candidate', password: string}> = [
        { username: 'superadmin', email: 'superadmin@amaanah.org', firstName: 'Super', lastName: 'Admin', role: 'super_admin', password: 'Admin@123' },
        { username: 'examadmin', email: 'examadmin@amaanah.org', firstName: 'Examination', lastName: 'Admin', role: 'examination_admin', password: 'Admin@123' },
        { username: 'logisticsadmin', email: 'logistics@amaanah.org', firstName: 'Logistics', lastName: 'Admin', role: 'logistics_admin', password: 'Admin@123' },
        { username: 'schooladmin', email: 'school@amaanah.org', firstName: 'School', lastName: 'Admin', role: 'school_admin', password: 'Admin@123' },
        { username: 'examiner1', email: 'examiner@amaanah.org', firstName: 'Test', lastName: 'Examiner', role: 'examiner', password: 'Admin@123' },
        { username: 'candidate1', email: 'candidate@amaanah.org', firstName: 'Test', lastName: 'Candidate', role: 'candidate', password: 'Admin@123' },
      ];

      const createdUsers = [];
      for (const userData of seedUsers) {
        const existing = await storage.getUserByUsername(userData.username);
        if (!existing) {
          const user = await storage.createUserWithPassword(userData as any);
          createdUsers.push({ ...user, passwordHash: undefined });
        }
      }

      res.json({ 
        message: `Created ${createdUsers.length} users`,
        users: createdUsers,
        credentials: seedUsers.map(u => ({ username: u.username, password: u.password, role: u.role }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
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
      
      // Enrich regions with clusters and counts
      const enrichedRegions = await Promise.all(
        regions.map(async (region) => {
          const regionClusters = await storage.getClustersByRegion(region.id);
          const regionSchools = await db.select().from(schools).where(eq(schools.regionId, region.id));
          const regionStudents = await db.select().from(students).innerJoin(schools, eq(students.schoolId, schools.id)).where(eq(schools.regionId, region.id));
          
          return {
            ...region,
            clusters: regionClusters,
            schoolsCount: regionSchools.length,
            studentsCount: regionStudents.length,
          };
        })
      );
      
      res.json(enrichedRegions);
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

  app.get("/api/exam-years/:id/statistics", async (req, res) => {
    try {
      const examYearId = parseInt(req.params.id);
      const examYear = await storage.getExamYear(examYearId);
      if (!examYear) {
        return res.status(404).json({ message: "Exam year not found" });
      }

      // Get students for this exam year
      const students = await storage.getStudentsByExamYear(examYearId);
      
      // Get unique schools with students in this exam year
      const schoolIds = new Set(students.map(s => s.schoolId));
      const registeredSchools = schoolIds.size;
      const totalStudents = students.length;

      // Calculate published results percentage
      const publishedCount = students.filter(s => s.resultStatus === 'published' || s.resultStatus === 'released').length;
      const publishedPercentage = totalStudents > 0 ? Math.round((publishedCount / totalStudents) * 100) : 0;

      res.json({
        registeredSchools,
        totalStudents,
        publishedPercentage,
        publishedCount,
      });
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
      
      // Send in-app notifications to all users based on their roles
      notifyExamYearCreated(
        examYear.name,
        examYear.id,
        examYear.registrationEndDate ? new Date(examYear.registrationEndDate) : null,
        req.session.userId!
      ).catch(err => console.error('Failed to send in-app notifications:', err));
      
      // Send email notifications to all approved schools if registration end date is set
      if (examYear.registrationEndDate) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const approvedSchools = await storage.getSchoolsByStatus('approved');
        
        // Send email notifications in the background (don't block response)
        (async () => {
          let successCount = 0;
          let failCount = 0;
          
          for (const school of approvedSchools) {
            try {
              await sendExamYearCreatedNotification(
                school.email,
                school.name,
                school.registrarName || 'School Administrator',
                examYear.name,
                new Date(examYear.registrationEndDate!),
                baseUrl
              );
              successCount++;
            } catch (error) {
              console.error(`Failed to send exam year notification to ${school.email}:`, error);
              failCount++;
            }
          }
          console.log(`Exam year notification emails: ${successCount} sent, ${failCount} failed`);
        })();
      }
      
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

  // Send registration deadline reminders - can be called by cron job or manually
  app.post("/api/exam-years/send-reminders", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear || !activeExamYear.registrationEndDate) {
        return res.status(400).json({ message: "No active exam year with registration deadline" });
      }
      
      const registrationEndDate = new Date(activeExamYear.registrationEndDate);
      const now = new Date();
      const timeDiff = registrationEndDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.ceil((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (daysRemaining < 0) {
        return res.status(400).json({ message: "Registration deadline has passed" });
      }
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const approvedSchools = await storage.getSchoolsByStatus('approved');
      
      let successCount = 0;
      let failCount = 0;
      const isUrgent = daysRemaining < 3;
      
      for (const school of approvedSchools) {
        try {
          // Get student count for this school
          const schoolStudents = await storage.getStudentsBySchool(school.id, activeExamYear.id);
          const registeredStudents = schoolStudents?.length || 0;
          
          if (isUrgent) {
            // Send urgent daily reminder
            await sendUrgentRegistrationReminder(
              school.email,
              school.name,
              school.registrarName || 'School Administrator',
              activeExamYear.name,
              registrationEndDate,
              daysRemaining,
              hoursRemaining,
              registeredStudents,
              baseUrl
            );
          } else {
            // Send weekly reminder
            await sendWeeklyRegistrationReminder(
              school.email,
              school.name,
              school.registrarName || 'School Administrator',
              activeExamYear.name,
              registrationEndDate,
              daysRemaining,
              registeredStudents,
              baseUrl
            );
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to send reminder to ${school.email}:`, error);
          failCount++;
        }
      }
      
      res.json({ 
        message: `${isUrgent ? 'Urgent' : 'Weekly'} reminders sent: ${successCount} successful, ${failCount} failed`,
        isUrgent,
        daysRemaining,
        successCount,
        failCount
      });
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
      
      // For school admins, only show their assigned center
      if (req.session?.role === 'school_admin' && req.session?.schoolId) {
        const school = await storage.getSchool(req.session.schoolId);
        if (school?.assignedCenterId) {
          const center = await storage.getExamCenter(school.assignedCenterId);
          centers = center ? [center] : [];
        } else {
          centers = [];
        }
      } else {
        // Admins see all centers based on filters
        if (clusterId) {
          centers = await storage.getExamCentersByCluster(clusterId);
        } else if (regionId) {
          centers = await storage.getExamCentersByRegion(regionId);
        } else {
          centers = await storage.getAllExamCenters();
        }
      }
      
      // Add school and student counts for each center
      const centersWithCounts = await Promise.all(centers.map(async (center) => {
        const schools = await storage.getSchoolsByCenter(center.id);
        const students = await storage.getStudentsByCenter(center.id);
        return {
          ...center,
          assignedSchoolsCount: schools.length,
          assignedStudentsCount: students.length,
        };
      }));
      
      res.json(centersWithCounts);
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
      let schools = await storage.getAllSchools();
      
      // Apply filters
      const status = req.query.status as string | undefined;
      const schoolType = req.query.schoolType as string | undefined;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const clusterId = req.query.clusterId ? parseInt(req.query.clusterId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      if (status && status !== 'all') {
        schools = schools.filter(s => s.status === status);
      }
      if (schoolType && schoolType !== 'all') {
        schools = schools.filter(s => s.schoolType === schoolType);
      }
      if (regionId) {
        schools = schools.filter(s => s.regionId === regionId);
      }
      if (clusterId) {
        schools = schools.filter(s => s.clusterId === clusterId);
      }
      
      const total = schools.length;
      if (limit) {
        schools = schools.slice(offset, offset + limit);
      }
      
      res.json({ data: schools, total, limit: limit || total, offset });
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
      
      // Generate verification token with 2-hour expiry
      const verificationToken = generateVerificationToken();
      const verificationExpiry = getVerificationExpiry();
      
      const school = await storage.createSchool({
        ...parsed.data,
        verificationToken,
        verificationExpiry,
        status: 'pending',
        isEmailVerified: false,
      });
      
      // Send verification email
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      try {
        await sendSchoolVerificationEmail(
          school.email,
          school.name,
          school.registrarName,
          verificationToken,
          baseUrl
        );
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
      
      res.status(201).json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk school upload API
  const bulkUploadRowSchema = z.object({
    schoolName: z.string().min(2, "School name must be at least 2 characters"),
    address: z.string().optional().default(""),
    region: z.string().min(1, "Region is required"),
    cluster: z.string().min(1, "Cluster is required"),
  });

  const bulkUploadSchema = z.object({
    schools: z.array(bulkUploadRowSchema).min(1, "At least one school is required"),
  });

  app.post("/api/schools/bulk-upload", isAuthenticated, async (req, res) => {
    try {
      const parseResult = bulkUploadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: fromZodError(parseResult.error).message 
        });
      }
      
      const { schools: schoolsData } = parseResult.data;

      const results: {
        success: Array<{
          schoolName: string;
          region: string;
          cluster: string;
          username: string;
          password: string;
          schoolId: number;
        }>;
        errors: Array<{ row: number; error: string; schoolName?: string }>;
      } = {
        success: [],
        errors: [],
      };

      // Helper to normalize Arabic numerals to ASCII
      const normalizeArabicNumerals = (str: string): string => {
        const arabicToAscii: { [key: string]: string } = {
          '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
          '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
        };
        return str.replace(/[٠-٩]/g, (match) => arabicToAscii[match]);
      };

      // Helper to find region by numeric ID or code
      const findRegionByInput = (input: string, allRegions: any[]): any | null => {
        const normalized = normalizeArabicNumerals(input).trim();
        
        // Try numeric ID matching first (input "2" → Region 2 with code RG2)
        if (/^\d+$/.test(normalized)) {
          const regionNum = parseInt(normalized, 10);
          // Match by code like "RG2"
          const matchByCode = allRegions.find(r => r.code === `RG${regionNum}`);
          if (matchByCode) return matchByCode;
          // Match by name like "Region 2"
          const matchByName = allRegions.find(r => r.name.toLowerCase() === `region ${regionNum}`);
          if (matchByName) return matchByName;
        }
        
        // Try exact match on code
        const exactCodeMatch = allRegions.find(r => r.code === normalized.toUpperCase());
        if (exactCodeMatch) return exactCodeMatch;
        
        // Try exact match on name
        const exactNameMatch = allRegions.find(r => r.name.toLowerCase() === normalized.toLowerCase());
        if (exactNameMatch) return exactNameMatch;
        
        return null;
      };

      // Helper to find cluster by region and numeric ID
      const findClusterByInput = (regionId: number, input: string, allClusters: any[]): any | null => {
        const normalized = normalizeArabicNumerals(input).trim();
        
        // Filter clusters for this region
        const regionClusters = allClusters.filter(c => c.regionId === regionId);
        
        // Try numeric ID matching (input "1" → find cluster with code like "CL1" or "RG{n}-1")
        if (/^\d+$/.test(normalized)) {
          const clusterNum = parseInt(normalized, 10);
          // Try exact numeric match in cluster name or ID
          const matchByCode = regionClusters.find(c => {
            // Check if code ends with the number or matches CL{n}
            return c.code === `CL${clusterNum}` || 
                   c.code.endsWith(`-${clusterNum}`) ||
                   c.code === normalized;
          });
          if (matchByCode) return matchByCode;
        }
        
        // Try exact match on code
        const exactCodeMatch = regionClusters.find(c => c.code === normalized.toUpperCase());
        if (exactCodeMatch) return exactCodeMatch;
        
        // Try match on name
        const nameMatch = regionClusters.find(c => c.name.toLowerCase().includes(normalized.toLowerCase()));
        if (nameMatch) return nameMatch;
        
        return null;
      };

      // Helper to generate region code
      const generateRegionCode = (name: string, existingCodes: Set<string>): string => {
        const words = name.trim().split(/\s+/);
        let code = '';
        if (words.length >= 2) {
          code = (words[0][0] + words[1][0]).toUpperCase();
        } else {
          code = name.substring(0, 3).toUpperCase();
        }
        
        let finalCode = code;
        let counter = 1;
        while (existingCodes.has(finalCode)) {
          finalCode = `${code}${counter}`;
          counter++;
        }
        existingCodes.add(finalCode);
        return finalCode;
      };

      // Helper to generate cluster code
      const generateClusterCode = (name: string, regionCode: string, existingCodes: Set<string>): string => {
        const words = name.trim().split(/\s+/);
        let suffix = '';
        if (words.length >= 2) {
          suffix = (words[0][0] + words[1][0]).toUpperCase();
        } else {
          suffix = name.substring(0, 2).toUpperCase();
        }
        
        let code = `${regionCode}-${suffix}`;
        let counter = 1;
        while (existingCodes.has(code)) {
          code = `${regionCode}-${suffix}${counter}`;
          counter++;
        }
        existingCodes.add(code);
        return code;
      };

      // Get existing codes for deduplication
      const allRegions = await storage.getAllRegions();
      const allClusters = await storage.getAllClusters();
      const existingRegionCodes = new Set(allRegions.map(r => r.code));
      const existingClusterCodes = new Set(allClusters.map(c => c.code));
      
      // Get the highest existing sequential number from existing usernames
      const allExistingUsers = await storage.getAllUsers();
      let maxSequentialNumber = 0;
      allExistingUsers.forEach(u => {
        if (u.username) {
          const match = u.username.match(/SchoolAdmin(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxSequentialNumber) maxSequentialNumber = num;
          }
        }
      });

      // Helper to normalize Arabic numerals to ASCII (for JSON endpoint)
      const normalizeArabicNumeralsJSON = (str: string): string => {
        const arabicToAscii: { [key: string]: string } = {
          '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
          '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
        };
        return str.replace(/[٠-٩]/g, (match) => arabicToAscii[match]);
      };

      // Helper to find region by numeric ID or code (for JSON endpoint)
      const findRegionByInputJSON = (input: string, regions: any[]): any | null => {
        const normalized = normalizeArabicNumeralsJSON(input).trim();
        
        if (/^\d+$/.test(normalized)) {
          const regionNum = parseInt(normalized, 10);
          const matchByCode = regions.find(r => r.code === `RG${regionNum}`);
          if (matchByCode) return matchByCode;
          const matchByName = regions.find(r => r.name.toLowerCase() === `region ${regionNum}`);
          if (matchByName) return matchByName;
        }
        
        const exactCodeMatch = regions.find(r => r.code === normalized.toUpperCase());
        if (exactCodeMatch) return exactCodeMatch;
        
        const exactNameMatch = regions.find(r => r.name.toLowerCase() === normalized.toLowerCase());
        if (exactNameMatch) return exactNameMatch;
        
        return null;
      };

      // Helper to find cluster by region and numeric ID (for JSON endpoint)
      const findClusterByInputJSON = (regionId: number, input: string, clusters: any[]): any | null => {
        const normalized = normalizeArabicNumeralsJSON(input).trim();
        
        const regionClusters = clusters.filter(c => c.regionId === regionId);
        
        if (/^\d+$/.test(normalized)) {
          const clusterNum = parseInt(normalized, 10);
          const matchByCode = regionClusters.find(c => {
            return c.code === `CL${clusterNum}` || 
                   c.code.endsWith(`-${clusterNum}`) ||
                   c.code === normalized;
          });
          if (matchByCode) return matchByCode;
        }
        
        const exactCodeMatch = regionClusters.find(c => c.code === normalized.toUpperCase());
        if (exactCodeMatch) return exactCodeMatch;
        
        const nameMatch = regionClusters.find(c => c.name.toLowerCase().includes(normalized.toLowerCase()));
        if (nameMatch) return nameMatch;
        
        return null;
      };

      let currentSequentialNumber = maxSequentialNumber;

      for (let i = 0; i < schoolsData.length; i++) {
        const row = schoolsData[i];
        const rowNum = i + 1;

        try {
          // Validate required fields
          if (!row.schoolName?.trim()) {
            results.errors.push({ row: rowNum, error: "School name is required" });
            continue;
          }
          if (!row.region?.trim()) {
            results.errors.push({ row: rowNum, error: "Region is required", schoolName: row.schoolName });
            continue;
          }
          if (!row.cluster?.trim()) {
            results.errors.push({ row: rowNum, error: "Cluster is required", schoolName: row.schoolName });
            continue;
          }

          const schoolName = row.schoolName.trim();
          const regionInput = row.region.trim();
          const clusterName = row.cluster.trim();
          const address = row.address?.trim() || '';

          // Validate region and cluster exist - NO CREATION
          const matchedRegion = findRegionByInputJSON(regionInput, allRegions);
          
          if (!matchedRegion) {
            results.errors.push({ 
              row: rowNum, 
              error: `Region/Cluster mismatch in Row ${rowNum} — does not match existing records.`,
              schoolName 
            });
            continue;
          }
          
          const regionId = matchedRegion.id;
          const actualRegionName = matchedRegion.name;

          // Find existing cluster - NO CREATION
          const matchedCluster = findClusterByInputJSON(regionId, clusterName, allClusters);
          
          if (!matchedCluster) {
            results.errors.push({ 
              row: rowNum, 
              error: `Region/Cluster mismatch in Row ${rowNum} — does not match existing records.`,
              schoolName 
            });
            continue;
          }
          
          const clusterId = matchedCluster.id;

          // Check for duplicate school
          const existingSchool = await storage.getSchoolByNameAndLocation(schoolName, regionId, clusterId);
          if (existingSchool) {
            results.errors.push({ 
              row: rowNum, 
              error: `School "${schoolName}" already exists in ${clusterName}, ${actualRegionName}`,
              schoolName 
            });
            continue;
          }

          // Generate credentials
          currentSequentialNumber++;
          const username = `SchoolAdmin${currentSequentialNumber.toString().padStart(4, '0')}`;
          const password = 'Admin@123';
          const hashedPassword = await bcrypt.hash(password, 10);

          // Create user account (SEPARATE from school - no email)
          const [user] = await db.insert(users).values({
            username,
            passwordHash: hashedPassword,
            role: 'school_admin',
            firstName: username, // Just username
            lastName: 'Admin',
            mustChangePassword: true, // Force password change on first login
          }).returning();

          // Create school WITHOUT email requirement
          const [createdSchool] = await db.insert(schools).values({
            name: schoolName,
            registrarName: 'School Admin',
            email: `school_${username}@internal.local`, // Internal placeholder only
            address,
            schoolType: 'LBS' as const,
            schoolTypes: ['LBS'],
            regionId,
            clusterId,
            status: 'approved' as const, // Auto-approve bulk uploaded schools
            isEmailVerified: true, // No email verification needed
          }).returning();

          // Link user to school after creation
          await db.update(users).set({ schoolId: createdSchool.id }).where(eq(users.id, user.id));

          results.success.push({
            schoolName,
            region: actualRegionName,
            cluster: clusterName,
            username,
            password, // Plain text password for export
            schoolId: createdSchool.id,
          });
        } catch (error: any) {
          results.errors.push({ 
            row: rowNum, 
            error: error.message || "Unknown error",
            schoolName: row.schoolName 
          });
        }
      }

      res.json({
        message: `Processed ${schoolsData.length} schools`,
        totalProcessed: schoolsData.length,
        successCount: results.success.length,
        errorCount: results.errors.length,
        schools: results.success,
        errors: results.errors,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // CSV Bulk School Upload Configuration
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req: any, file, cb) => {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only CSV files are allowed.'));
      }
    },
  }).single('file');

  // CSV Bulk School Upload API
  app.post("/api/schools/bulk-upload-csv", isAuthenticated, (req, res) => {
    csvUpload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      try {
        // Parse CSV file
        const fileContent = req.file.buffer.toString('utf-8');
        const lines = fileContent.trim().split('\n');
        
        if (lines.length < 2) {
          return res.status(400).json({ message: "CSV file must contain headers and at least one data row" });
        }

        // Parse headers (support both Arabic and English)
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim());
        
        // Normalize header names - support both Arabic and English
        const schoolNameIndex = headers.findIndex(h => 
          h.toLowerCase().includes('school') || h.includes('مدرسة') || h.includes('School Name')
        );
        const addressIndex = headers.findIndex(h => 
          h.toLowerCase().includes('address') || h.includes('عنوان') || h.includes('Address')
        );
        const regionIndex = headers.findIndex(h => 
          h.toLowerCase().includes('region') || h.includes('منطقة') || h.includes('Region')
        );
        const clusterIndex = headers.findIndex(h => 
          h.toLowerCase().includes('cluster') || h.includes('عنقود') || h.includes('Cluster')
        );

        if (schoolNameIndex === -1 || addressIndex === -1 || regionIndex === -1 || clusterIndex === -1) {
          return res.status(400).json({ 
            message: "CSV must contain 'School Name', 'Address', 'Region', and 'Cluster' columns" 
          });
        }

        // Get all existing regions and clusters for lookup
        const allRegions = await storage.getAllRegions();
        const allClusters = await storage.getAllClusters();

        // Helper to normalize Arabic numerals to ASCII
        const normalizeArabicNumerals = (str: string): string => {
          const arabicToAscii: { [key: string]: string } = {
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
          };
          return str.replace(/[٠-٩]/g, (match) => arabicToAscii[match]);
        };

        // Helper to find region by numeric ID or code
        const findRegionByInput = (input: string, regions: any[]): any | null => {
          const normalized = normalizeArabicNumerals(input).trim();
          
          if (/^\d+$/.test(normalized)) {
            const regionNum = parseInt(normalized, 10);
            const matchByCode = regions.find(r => r.code === `RG${regionNum}`);
            if (matchByCode) return matchByCode;
            const matchByName = regions.find(r => r.name.toLowerCase() === `region ${regionNum}`);
            if (matchByName) return matchByName;
          }
          
          const exactCodeMatch = regions.find(r => r.code === normalized.toUpperCase());
          if (exactCodeMatch) return exactCodeMatch;
          
          const exactNameMatch = regions.find(r => r.name.toLowerCase() === normalized.toLowerCase());
          if (exactNameMatch) return exactNameMatch;
          
          return null;
        };

        // Helper to find cluster by region and numeric ID
        const findClusterByInput = (regionId: number, input: string, clusters: any[]): any | null => {
          const normalized = normalizeArabicNumerals(input).trim();
          
          const regionClusters = clusters.filter(c => c.regionId === regionId);
          
          if (/^\d+$/.test(normalized)) {
            const clusterNum = parseInt(normalized, 10);
            const matchByCode = regionClusters.find(c => {
              return c.code === `CL${clusterNum}` || 
                     c.code.endsWith(`-${clusterNum}`) ||
                     c.code === normalized;
            });
            if (matchByCode) return matchByCode;
          }
          
          const exactCodeMatch = regionClusters.find(c => c.code === normalized.toUpperCase());
          if (exactCodeMatch) return exactCodeMatch;
          
          const nameMatch = regionClusters.find(c => c.name.toLowerCase().includes(normalized.toLowerCase()));
          if (nameMatch) return nameMatch;
          
          return null;
        };

        const results: {
          success: Array<{
            schoolName: string;
            address: string;
            regionCode: string;
            clusterCode: string;
            schoolId: number;
            username: string;
            password: string;
          }>;
          errors: Array<{ row: number; error: string; schoolName?: string }>;
        } = {
          success: [],
          errors: [],
        };

        // Track processed schools in this upload to detect duplicates (regionId-clusterId-schoolName)
        const processedSchools = new Set<string>();

        // Process data rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines

          const row: number = i;

          try {
            // Split CSV row - handle quoted fields
            let cells: string[] = [];
            let currentCell = '';
            let insideQuotes = false;

            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === ',' && !insideQuotes) {
                cells.push(currentCell.trim().replace(/^"+|"+$/g, ''));
                currentCell = '';
              } else {
                currentCell += char;
              }
            }
            cells.push(currentCell.trim().replace(/^"+|"+$/g, ''));

            const schoolName = cells[schoolNameIndex]?.trim();
            const address = cells[addressIndex]?.trim() || '';
            const regionInput = cells[regionIndex]?.trim();
            const clusterInput = cells[clusterIndex]?.trim();

            // Validate required fields
            if (!schoolName) {
              results.errors.push({ row: row + 1, error: "School name is required" });
              continue;
            }
            if (!regionInput) {
              results.errors.push({ row: row + 1, error: "Region is required", schoolName });
              continue;
            }
            if (!clusterInput) {
              results.errors.push({ row: row + 1, error: "Cluster is required", schoolName });
              continue;
            }

            // Find matching region and cluster
            const matchedRegion = findRegionByInput(regionInput, allRegions);
            
            if (!matchedRegion) {
              results.errors.push({ 
                row: row + 1, 
                error: `Region/Cluster mismatch in Row ${row + 1} — does not match existing records.`,
                schoolName 
              });
              continue;
            }
            
            const regionId = matchedRegion.id;
            const region = matchedRegion;

            const matchedCluster = findClusterByInput(regionId, clusterInput, allClusters);
            
            if (!matchedCluster) {
              results.errors.push({ 
                row: row + 1, 
                error: `Region/Cluster mismatch in Row ${row + 1} — does not match existing records.`,
                schoolName 
              });
              continue;
            }
            
            const clusterId = matchedCluster.id;
            const cluster = matchedCluster;

            // Check for duplicate within THIS upload
            const schoolKey = `${regionId}-${clusterId}-${schoolName.toLowerCase()}`;
            if (processedSchools.has(schoolKey)) {
              results.errors.push({ 
                row: row + 1, 
                error: `Duplicate: School "${schoolName}" in Region ${region.name}, Cluster ${cluster.name} already processed in this upload. Only the first occurrence will be uploaded.`,
                schoolName 
              });
              continue;
            }

            // Check for duplicate school in database
            const existingSchool = await storage.getSchoolByNameAndLocation(schoolName, regionId, clusterId);
            if (existingSchool) {
              results.errors.push({ 
                row: row + 1, 
                error: `School "${schoolName}" already exists in ${cluster.name}, ${region.name}`,
                schoolName 
              });
              continue;
            }

            // Mark this school as processed
            processedSchools.add(schoolKey);

            // Generate sequential username (separate from school)
            // Get the highest existing sequential number from existing usernames
            const existingAdmins = await db.select({ username: users.username }).from(users).where(eq(users.role, 'school_admin'));
            let maxSequentialNumber = 0;
            existingAdmins.forEach(u => {
              const match = u.username?.match(/SchoolAdmin(\d+)/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxSequentialNumber) maxSequentialNumber = num;
              }
            });
            const sequentialNumber = maxSequentialNumber + 1;
            const username = `SchoolAdmin${sequentialNumber.toString().padStart(4, '0')}`;
            
            // Use fixed default password
            const password = 'Admin@123';
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user account (SEPARATE from school - no email required)
            const [user] = await db.insert(users).values({
              username,
              passwordHash: hashedPassword,
              role: 'school_admin',
              firstName: username, // Just username
              lastName: 'Admin',
              mustChangePassword: true, // Force password change on first login
            }).returning();

            // Create school WITHOUT email requirement
            const [createdSchool] = await db.insert(schools).values({
              name: schoolName,
              registrarName: 'School Admin',
              email: `school_${username}@internal.local`, // Internal placeholder only (not used)
              address,
              schoolType: 'LBS' as const,
              schoolTypes: ['LBS'],
              regionId,
              clusterId,
              status: 'approved' as const,
              isEmailVerified: true, // No email verification needed
            }).returning();

            // Link user to school after creation
            await db.update(users).set({ 
              schoolId: createdSchool.id 
            }).where(eq(users.id, user.id));

            results.success.push({
              schoolName,
              address,
              regionCode: `${region.code}`,
              clusterCode: `${region.code}.${cluster.code}`,
              schoolId: createdSchool.id,
              username,
              password,
            });
          } catch (error: any) {
            results.errors.push({ 
              row: row + 1, 
              error: error.message || "Unknown error"
            });
          }
        }

        res.json({
          message: `Processed ${lines.length - 1} schools from CSV`,
          totalProcessed: lines.length - 1,
          successCount: results.success.length,
          errorCount: results.errors.length,
          schools: results.success,
          errors: results.errors,
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    });
  });

  // Get school info for verification page (validates token without consuming it)
  app.get("/api/schools/verify-info/:token", async (req, res) => {
    try {
      const result = await db.select().from(schools)
        .where(eq(schools.verificationToken, req.params.token));
      
      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      const school = result[0];
      
      // Check if token has expired (2-hour window)
      if (school.verificationExpiry && new Date() > new Date(school.verificationExpiry)) {
        return res.status(400).json({ message: "Verification link has expired. Please request a new one." });
      }
      
      // Check if already verified and has admin user
      const isAlreadyVerified = school.isEmailVerified && school.adminUserId;
      
      res.json({
        id: school.id,
        name: school.name,
        registrarName: school.registrarName,
        email: school.email,
        isAlreadyVerified: !!isAlreadyVerified,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete verification with username/password setup (auto-approves school)
  app.post("/api/schools/verify/:token/complete", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Find school by verification token
      const result = await db.select().from(schools)
        .where(eq(schools.verificationToken, req.params.token));
      
      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      const school = result[0];
      
      // SECURITY: Prevent token re-use - check if already verified with admin
      if (school.adminUserId) {
        return res.status(400).json({ message: "This school has already been verified and set up." });
      }
      
      // Check if token has expired (2-hour window)
      if (school.verificationExpiry && new Date() > new Date(school.verificationExpiry)) {
        return res.status(400).json({ message: "Verification link has expired. Please request a new one." });
      }
      
      // Check if username already exists
      const existingUser = await db.select().from(users)
        .where(eq(users.username, username));
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username already taken. Please choose another." });
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create the school admin user account
      const [newUser] = await db.insert(users).values({
        username,
        passwordHash,
        email: school.email,
        firstName: school.registrarName.split(' ')[0] || school.registrarName,
        lastName: school.registrarName.split(' ').slice(1).join(' ') || '',
        role: 'school_admin',
        status: 'active',
        schoolId: school.id,
      }).returning();
      
      // Mark school as verified, approved, and link to admin user
      const [updatedSchool] = await db.update(schools)
        .set({ 
          isEmailVerified: true, 
          verificationToken: null,
          verificationExpiry: null,
          status: 'approved',
          adminUserId: newUser.id,
          updatedAt: new Date()
        })
        .where(eq(schools.id, school.id))
        .returning();
      
      // Create audit log entry
      try {
        await storage.createAuditLog({
          userId: newUser.id,
          action: 'school_verified',
          resourceType: 'school',
          resourceId: school.id,
          details: { 
            schoolName: school.name,
            username,
            status: 'approved'
          },
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }
      
      res.json({ 
        message: "School verification and account setup complete", 
        school: updatedSchool,
        username 
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Legacy endpoint - redirect to new flow info
  app.get("/api/schools/verify/:token", async (req, res) => {
    try {
      const result = await db.select().from(schools)
        .where(eq(schools.verificationToken, req.params.token));
      
      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      const school = result[0];
      
      if (school.verificationExpiry && new Date() > new Date(school.verificationExpiry)) {
        return res.status(400).json({ message: "Verification link has expired. Please request a new one." });
      }
      
      // Redirect to the new verification page
      res.json({ 
        message: "Please complete verification at the verification page",
        redirectUrl: `/school-verify/${req.params.token}`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Request password reset
  app.post("/api/schools/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find school by email
      const result = await db.select().from(schools)
        .where(eq(schools.email, email));
      
      // Always return success to prevent email enumeration
      if (result.length === 0) {
        return res.json({ message: "If an account exists with that email, you will receive reset instructions." });
      }
      
      const school = result[0];
      
      // Only allow reset for verified schools with an admin user
      if (!school.isEmailVerified || !school.adminUserId) {
        return res.json({ message: "If an account exists with that email, you will receive reset instructions." });
      }
      
      // Generate reset token with 2-hour expiry
      const resetToken = generateVerificationToken();
      const resetExpiry = getVerificationExpiry();
      
      // Save reset token to school
      await db.update(schools)
        .set({ 
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
          updatedAt: new Date()
        })
        .where(eq(schools.id, school.id));
      
      // Send password reset email
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      await sendPasswordResetEmail(
        school.email,
        school.name,
        school.registrarName,
        resetToken,
        baseUrl
      );
      
      res.json({ message: "If an account exists with that email, you will receive reset instructions." });
    } catch (error: any) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reset password with token
  app.post("/api/schools/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Find school by reset token
      const result = await db.select().from(schools)
        .where(eq(schools.passwordResetToken, token));
      
      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      const school = result[0];
      
      // Check if token has expired (2-hour window)
      if (school.passwordResetExpiry && new Date() > new Date(school.passwordResetExpiry)) {
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
      }
      
      if (!school.adminUserId) {
        return res.status(400).json({ message: "No admin account found for this school" });
      }
      
      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Update user's password
      await db.update(users)
        .set({ 
          passwordHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, school.adminUserId));
      
      // Clear reset token
      await db.update(schools)
        .set({ 
          passwordResetToken: null,
          passwordResetExpiry: null,
          updatedAt: new Date()
        })
        .where(eq(schools.id, school.id));
      
      // Create audit log entry
      try {
        await storage.createAuditLog({
          userId: school.adminUserId,
          action: 'password_reset',
          resourceType: 'user',
          resourceId: parseInt(school.adminUserId) || 0,
          details: { 
            schoolName: school.name,
            method: 'email_link'
          },
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }
      
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error('Password reset error:', error);
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

  app.post("/api/schools/:id/resend-verification", isAuthenticated, async (req, res) => {
    try {
      const school = await storage.getSchool(parseInt(req.params.id));
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const verificationExpiry = getVerificationExpiry();
      
      // Send verification email first before updating
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const emailSent = await sendSchoolVerificationEmail(
        school.email,
        school.name,
        school.registrarName,
        verificationToken,
        baseUrl
      );
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
      }
      
      // Only update token if email was sent successfully
      await db.update(schools)
        .set({
          verificationToken,
          verificationExpiry,
          updatedAt: new Date()
        })
        .where(eq(schools.id, school.id));
      
      res.json({ message: "Verification email sent successfully" });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: error.message || "Failed to resend verification email" });
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
      
      // Get center details and active exam year for email notification
      const center = await storage.getExamCenter(centerId);
      const activeExamYear = await storage.getActiveExamYear();
      
      if (center && activeExamYear) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        try {
          await sendCenterAllocationEmail(
            school.email,
            school.name,
            center.name,
            center.address || 'See dashboard for details',
            activeExamYear.name,
            baseUrl
          );
        } catch (emailError) {
          console.error('Failed to send center allocation email:', emailError);
        }
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

  // School Profile API (for school admins)
  app.get("/api/school/profile", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can access this" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }
      
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/school/profile", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can access this" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      // Define valid school types
      const validSchoolTypes = ['LBS', 'UBS', 'BCS', 'SSS', 'ECD', 'QM'] as const;
      
      // Validate input using Zod with enum validation
      const updateProfileSchema = z.object({
        name: z.string().min(3, "School name must be at least 3 characters"),
        registrarName: z.string().min(2, "Registrar name is required"),
        phone: z.string().min(7, "Phone number is required"),
        address: z.string().min(5, "Address is required"),
        schoolType: z.enum(validSchoolTypes, { 
          errorMap: () => ({ message: `School type must be one of: ${validSchoolTypes.join(', ')}` }) 
        }),
        schoolTypes: z.array(z.enum(validSchoolTypes)).optional().default([]),
        regionId: z.number().int().positive().nullable().optional(),
        clusterId: z.number().int().positive().nullable().optional(),
      });

      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: fromZodError(validation.error).message 
        });
      }

      const { name, registrarName, phone, address, schoolType, schoolTypes, regionId, clusterId } = validation.data;
      
      // Validate cluster belongs to selected region if both are provided
      if (clusterId && regionId) {
        const cluster = await storage.getCluster(clusterId);
        if (!cluster) {
          return res.status(400).json({ message: "Selected cluster does not exist" });
        }
        if (cluster.regionId !== regionId) {
          return res.status(400).json({ message: "Selected cluster does not belong to the selected region" });
        }
      }
      
      const school = await storage.updateSchool(schoolId, {
        name,
        registrarName,
        phone,
        address,
        schoolType,
        schoolTypes: schoolTypes || [],
        regionId: regionId || null,
        clusterId: clusterId || null,
      });

      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Log the action
      await storage.createAuditLog({
        action: 'school_profile_updated',
        entityType: 'school',
        entityId: school.id.toString(),
        userId: user.id,
        details: { changes: req.body },
      });

      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Multer error handling wrapper for school document uploads
  const handleSchoolDocUpload = (req: any, res: any, next: any) => {
    schoolDocUpload(req, res, (err: any) => {
      if (err) {
        // Handle Multer errors (file size, etc.)
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File is too large. Maximum size is 10MB." });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: "Unexpected file field. Use 'file' as the field name." });
        }
        return res.status(400).json({ message: err.message || "File upload failed." });
      }
      next();
    });
  };

  // School Document Upload API - using multer for proper multipart parsing
  app.post("/api/school/documents/upload", isAuthenticated, handleSchoolDocUpload, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can upload documents" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      // Check if file was rejected by fileFilter (invalid type)
      if (req.fileRejected) {
        return res.status(400).json({ 
          message: req.fileRejectedReason || "Invalid file type. Only PDF, JPG, and PNG files are allowed."
        });
      }

      // Get file from multer.fields() result
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const file = files?.file?.[0];
      if (!file) {
        return res.status(400).json({ 
          message: "No file uploaded. Please select a PDF, JPG, or PNG file under 10MB." 
        });
      }

      // Validate docType from form data
      const docType = req.body.docType;
      const validDocTypes = ['registrationCertificate', 'landOwnership', 'operationalLicense', 'schoolBadge'];
      if (!docType || !validDocTypes.includes(docType)) {
        return res.status(400).json({ 
          message: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` 
        });
      }

      // For school badge, only allow image files (not PDFs)
      if (docType === 'schoolBadge') {
        const normalizedMime = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
        if (!['image/jpeg', 'image/png'].includes(normalizedMime)) {
          return res.status(400).json({ 
            message: "School badge must be an image file (JPG or PNG only)." 
          });
        }
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();

      // Get upload URL from object storage
      let uploadURL: string;
      let objectPath: string;
      try {
        const result = await objectStorageService.getObjectEntityUploadURL(file.originalname);
        uploadURL = result.uploadURL;
        objectPath = result.objectPath;
      } catch (urlError: any) {
        console.error("Failed to get upload URL:", urlError);
        return res.status(500).json({ message: "Failed to prepare file upload. Please try again." });
      }

      // Upload file buffer to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file.buffer,
        headers: {
          'Content-Type': file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        console.error("Object storage upload failed:", uploadResponse.status, uploadResponse.statusText);
        return res.status(500).json({ message: "Failed to upload file to storage. Please try again." });
      }

      // Set ACL policy to make file publicly accessible
      let publicPath: string;
      try {
        publicPath = await objectStorageService.trySetObjectEntityAclPolicy(
          uploadURL,
          { owner: user.id, visibility: 'public' }
        );
        if (!publicPath) {
          throw new Error("ACL policy returned empty path");
        }
      } catch (aclError: any) {
        console.error("Failed to set ACL policy:", aclError);
        return res.status(500).json({ message: "File uploaded but failed to make it accessible. Please try again." });
      }

      // Update school with document URL
      const updateData: Record<string, string | null> = {};
      updateData[docType] = publicPath;
      
      const school = await storage.updateSchool(schoolId, updateData);
      if (!school) {
        return res.status(500).json({ message: "Failed to update school record with document URL" });
      }

      // Log the action
      await storage.createAuditLog({
        action: 'school_document_uploaded',
        entityType: 'school',
        entityId: schoolId.toString(),
        userId: user.id,
        details: { docType, fileName: file.originalname, fileSize: file.size },
      });

      res.json({ success: true, path: publicPath, school });
    } catch (error: any) {
      console.error("Document upload error:", error);
      res.status(500).json({ message: error.message || "An unexpected error occurred during upload" });
    }
  });

  app.post("/api/school/documents/delete", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can delete documents" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      // Validate docType using Zod
      const deleteDocSchema = z.object({
        docType: z.enum(['registrationCertificate', 'landOwnership', 'operationalLicense', 'schoolBadge']),
      });

      const validation = deleteDocSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid document type. Must be registrationCertificate, landOwnership, operationalLicense, or schoolBadge" });
      }

      const { docType } = validation.data;

      // Update school to remove document URL
      const updateData: Record<string, string | null> = {};
      updateData[docType] = null;
      
      const school = await storage.updateSchool(schoolId, updateData);

      // Log the action
      await storage.createAuditLog({
        action: 'school_document_deleted',
        entityType: 'school',
        entityId: schoolId.toString(),
        userId: user.id,
        details: { docType },
      });

      res.json({ success: true, school });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // School Admin Invitations API
  app.get("/api/school/invitations", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can view invitations" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      const invitations = await storage.getSchoolInvitationsBySchool(schoolId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/school/invitations", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can invite users" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      // Validate input
      const inviteSchema = z.object({
        email: z.string().email("Please enter a valid email address"),
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
      });

      const validation = inviteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: fromZodError(validation.error).message 
        });
      }

      const { email, firstName, lastName } = validation.data;

      // Check if email is already in use by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "This email is already registered in the system" });
      }

      // Check for pending invitation with same email for this school
      const existingInvitations = await storage.getSchoolInvitationsBySchool(schoolId);
      const pendingInvite = existingInvitations.find(i => i.email === email && !i.isUsed && new Date(i.expiresAt) > new Date());
      if (pendingInvite) {
        return res.status(400).json({ message: "An invitation has already been sent to this email" });
      }

      // Get school info
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Generate token and expiry (48 hours)
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create invitation
      const invitation = await storage.createSchoolInvitation({
        schoolId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        token,
        expiresAt,
        invitedById: user.id,
      });

      // Send invitation email
      const verificationUrl = `${req.protocol}://${req.get('host')}/school-invite/${token}`;
      await sendSchoolAdminInvitationEmail(email, school.name, firstName || 'User', verificationUrl);

      // Log the action
      await storage.createAuditLog({
        action: 'school_admin_invited',
        entityType: 'school_invitation',
        entityId: invitation.id.toString(),
        userId: user.id,
        details: { email, schoolId },
      });

      res.json({ success: true, invitation });
    } catch (error: any) {
      console.error("Invitation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/school/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can delete invitations" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getSchoolInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.schoolId !== schoolId) {
        return res.status(403).json({ message: "You can only delete invitations for your school" });
      }

      if (invitation.isUsed) {
        return res.status(400).json({ message: "Cannot delete an already used invitation" });
      }

      await storage.deleteSchoolInvitation(invitationId);

      // Log the action
      await storage.createAuditLog({
        action: 'school_invitation_deleted',
        entityType: 'school_invitation',
        entityId: invitationId.toString(),
        userId: user.id,
        details: { email: invitation.email },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Resend invitation email
  app.post("/api/school/invitations/:id/resend", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can resend invitations" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getSchoolInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.schoolId !== schoolId) {
        return res.status(403).json({ message: "You can only resend invitations for your school" });
      }

      if (invitation.isUsed) {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      // Generate new token and expiry
      const newToken = randomBytes(32).toString('hex');
      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      // Update invitation with new token and expiry
      await storage.updateSchoolInvitation(invitationId, {
        token: newToken,
        expiresAt: newExpiry,
      });

      // Get school info for email
      const school = await storage.getSchool(invitation.schoolId);

      // Send invitation email
      const verificationUrl = `${req.protocol}://${req.get('host')}/school-invite/${newToken}`;
      await sendSchoolAdminInvitationEmail(
        invitation.email, 
        school?.name || 'Your School', 
        invitation.firstName || 'User', 
        verificationUrl
      );

      // Log the action
      await storage.createAuditLog({
        action: 'school_invitation_resent',
        entityType: 'school_invitation',
        entityId: invitationId.toString(),
        userId: user.id,
        details: { email: invitation.email, schoolId },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint to get invitation info
  app.get("/api/school/invitations/:token/info", async (req, res) => {
    try {
      const invitation = await storage.getSchoolInvitationByToken(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invalid invitation link" });
      }

      if (invitation.isUsed) {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Get school info
      const school = await storage.getSchool(invitation.schoolId);

      res.json({
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        schoolName: school?.name || 'Unknown School',
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete invitation - create user account
  app.post("/api/school/invitations/:token/complete", async (req, res) => {
    try {
      const invitation = await storage.getSchoolInvitationByToken(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invalid invitation link" });
      }

      if (invitation.isUsed) {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Validate input
      const completeSchema = z.object({
        username: z.string().min(3, "Username must be at least 3 characters").max(50),
        password: z.string().min(8, "Password must be at least 8 characters"),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
      });

      const validation = completeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: fromZodError(validation.error).message 
        });
      }

      const { username, password, firstName, lastName } = validation.data;

      // Check if username is already taken
      const existingUsers = await storage.getAllUsers();
      const usernameTaken = existingUsers.some(u => u.username === username);
      if (usernameTaken) {
        return res.status(400).json({ message: "This username is already taken" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.upsertUser({
        id: randomBytes(16).toString('hex'),
        email: invitation.email,
        username,
        passwordHash,
        firstName,
        lastName,
        role: 'school_admin',
        status: 'active',
        schoolId: invitation.schoolId,
      });

      // Mark invitation as used
      await storage.updateSchoolInvitation(invitation.id, {
        isUsed: true,
        usedAt: new Date(),
        createdUserId: newUser.id,
      });

      // Log the action
      await storage.createAuditLog({
        action: 'school_admin_account_created',
        entityType: 'user',
        entityId: newUser.id,
        userId: newUser.id,
        details: { schoolId: invitation.schoolId, invitationId: invitation.id },
      });

      res.json({ success: true, message: "Account created successfully. You can now log in." });
    } catch (error: any) {
      console.error("Complete invitation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Students API
  app.get("/api/students", async (req, res) => {
    try {
      let students = await storage.getAllStudents();
      
      // Get all schools for region/cluster filtering
      const allSchools = await storage.getAllSchools();
      
      // Apply filters
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const status = req.query.status as string | undefined;
      const grade = req.query.grade ? parseInt(req.query.grade as string) : undefined;
      const gradeMin = req.query.gradeMin ? parseInt(req.query.gradeMin as string) : undefined;
      const gradeMax = req.query.gradeMax ? parseInt(req.query.gradeMax as string) : undefined;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const clusterId = req.query.clusterId ? parseInt(req.query.clusterId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      if (status && status !== 'all') {
        students = students.filter(s => s.status === status);
      }
      
      // Filter for students without grades (ECD tab) - takes precedence
      const noGrade = req.query.noGrade === "true";
      if (noGrade) {
        students = students.filter(s => s.grade === null || s.grade === undefined);
      }
      // Filter by grade range (for school type tabs) - takes precedence over exact grade
      else if (gradeMin !== undefined && gradeMax !== undefined) {
        students = students.filter(s => {
          const studentGrade = s.grade;
          if (studentGrade === null || studentGrade === undefined) return false;
          return studentGrade >= gradeMin && studentGrade <= gradeMax;
        });
      }
      // Only apply exact grade filter when no tab-based filters are active
      else if (grade) {
        students = students.filter(s => s.grade === grade);
      }
      if (schoolId) {
        students = students.filter(s => s.schoolId === schoolId);
      }
      if (examYearId) {
        students = students.filter(s => s.examYearId === examYearId);
      }
      if (regionId) {
        const schoolIdsInRegion = allSchools.filter(s => s.regionId === regionId).map(s => s.id);
        students = students.filter(s => s.schoolId && schoolIdsInRegion.includes(s.schoolId));
      }
      if (clusterId) {
        const schoolIdsInCluster = allSchools.filter(s => s.clusterId === clusterId).map(s => s.id);
        students = students.filter(s => s.schoolId && schoolIdsInCluster.includes(s.schoolId));
      }
      
      // Enrich students with school and exam year information
      const allExamYears = await storage.getAllExamYears();
      let enrichedStudents = students.map(student => {
        const school = allSchools.find(s => s.id === student.schoolId);
        const examYear = allExamYears.find(ey => ey.id === student.examYearId);
        return {
          ...student,
          school: school ? { id: school.id, name: school.name } : null,
          examYear: examYear ? { id: examYear.id, name: examYear.name } : null
        };
      });
      
      const total = enrichedStudents.length;
      if (limit) {
        enrichedStudents = enrichedStudents.slice(offset, offset + limit);
      }
      
      res.json({ data: enrichedStudents, total, limit: limit || total, offset });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Results entry - students with subjects for grid display
  app.get("/api/results/students-for-entry", isAuthenticated, async (req, res) => {
    try {
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.json({ students: [], subjects: [] });
      }

      let students = await storage.getAllStudents();
      const allSchools = await storage.getAllSchools();
      const allSubjects = await storage.getAllSubjects();
      
      // Apply filters
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : activeExamYear.id;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const clusterId = req.query.clusterId ? parseInt(req.query.clusterId as string) : undefined;
      
      students = students.filter(s => s.examYearId === examYearId);
      
      if (schoolId) {
        students = students.filter(s => s.schoolId === schoolId);
      }
      if (regionId) {
        const schoolIdsInRegion = allSchools.filter(s => s.regionId === regionId).map(s => s.id);
        students = students.filter(s => s.schoolId && schoolIdsInRegion.includes(s.schoolId));
      }
      if (clusterId) {
        const schoolIdsInCluster = allSchools.filter(s => s.clusterId === clusterId).map(s => s.id);
        students = students.filter(s => s.schoolId && schoolIdsInCluster.includes(s.schoolId));
      }
      
      // Get all results for these students
      const allResults = await storage.getAllResults();
      
      // Enrich students with results
      const enrichedStudents = await Promise.all(students.map(async (student) => {
        const school = allSchools.find(s => s.id === student.schoolId);
        const results = allResults.filter(r => r.studentId === student.id && r.examYearId === examYearId);
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          indexNumber: student.indexNumber,
          grade: student.grade,
          school: school ? { id: school.id, name: school.name } : null,
          results: results.map(r => ({
            subjectId: r.subjectId,
            totalScore: r.totalScore,
            grade: r.grade
          }))
        };
      }));
      
      res.json({ students: enrichedStudents, subjects: allSubjects, role: req.session.role });
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

  // Helper function to normalize school names for matching
  function normalizeSchoolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')        // Normalize spaces
      .replace(/\b(the|of|and|school|islamic|arabic|madrasa|madrassa|institute|center|centre)\b/g, '')
      .trim();
  }

  // Calculate similarity score between two strings (simple Levenshtein-based)
  function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeSchoolName(str1);
    const s2 = normalizeSchoolName(str2);
    
    // Exact match after normalization
    if (s1 === s2) return 1.0;
    
    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Simple word overlap score
    const words1 = s1.split(' ').filter(w => w.length > 2);
    const words2 = s2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(w => words2.includes(w));
    const score = (2 * commonWords.length) / (words1.length + words2.length);
    
    return score;
  }

  // Multer config for Excel/CSV file upload
  const studentBulkUploadConfig = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req: any, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'text/csv',
        'application/csv',
      ];
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      
      if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        req.fileRejected = true;
        req.fileRejectedReason = 'Invalid file type. Only XLSX, XLS, and CSV files are allowed.';
        cb(null, false);
      }
    },
  });

  // Admin bulk student upload with school matching - preview/parse phase
  app.post("/api/students/bulk-upload-preview", isAuthenticated, studentBulkUploadConfig.single('file'), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can bulk upload students" });
      }

      if (req.fileRejected) {
        return res.status(400).json({ message: req.fileRejectedReason });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { examYearId, grade } = req.body;
      if (!examYearId || !grade) {
        return res.status(400).json({ message: "examYearId and grade are required" });
      }

      // Parse the Excel/CSV file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length < 2) {
        return res.status(400).json({ message: "File must contain headers and at least one data row" });
      }

      // Get headers (first row) and normalize them
      const headers = (rawData[0] as string[]).map(h => 
        String(h || '').toLowerCase().trim().replace(/\s+/g, '')
      );
      
      // Find column indices for required fields
      const findColumnIndex = (possibleNames: string[]): number => {
        return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
      };

      const studentNameCol = findColumnIndex(['studentname', 'name', 'fullname', 'student']);
      const firstNameCol = findColumnIndex(['firstname', 'first']);
      const lastNameCol = findColumnIndex(['lastname', 'last', 'surname']);
      const schoolNameCol = findColumnIndex(['schoolname', 'school']);
      const regionCol = findColumnIndex(['region', 'regionname']);
      const clusterCol = findColumnIndex(['cluster', 'clustername']);
      const genderCol = findColumnIndex(['gender', 'sex']);

      if (schoolNameCol === -1) {
        return res.status(400).json({ message: "Could not find 'School Name' column in the file" });
      }

      if (studentNameCol === -1 && (firstNameCol === -1 || lastNameCol === -1)) {
        return res.status(400).json({ 
          message: "Could not find student name columns. File must have either 'Student Name' or both 'First Name' and 'Last Name'" 
        });
      }

      // Fetch all schools, regions, and clusters for matching
      const allSchools = await storage.getAllSchools();
      const allRegions = await storage.getAllRegions();
      const allClusters = await storage.getAllClusters();

      // Create lookup maps
      const regionMap = new Map(allRegions.map(r => [r.id, r]));
      const clusterMap = new Map(allClusters.map(c => [c.id, c]));

      // Process each row
      const previewResults: any[] = [];
      const dataRows = rawData.slice(1);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.every(cell => !cell)) continue; // Skip empty rows

        // Extract student data
        let firstName = '';
        let lastName = '';
        let middleName = '';
        
        if (studentNameCol !== -1 && row[studentNameCol]) {
          const nameParts = String(row[studentNameCol]).trim().split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts[nameParts.length - 1] || '';
          if (nameParts.length > 2) {
            middleName = nameParts.slice(1, -1).join(' ');
          }
        } else {
          firstName = firstNameCol !== -1 ? String(row[firstNameCol] || '').trim() : '';
          lastName = lastNameCol !== -1 ? String(row[lastNameCol] || '').trim() : '';
        }

        const schoolName = schoolNameCol !== -1 ? String(row[schoolNameCol] || '').trim() : '';
        const regionName = regionCol !== -1 ? String(row[regionCol] || '').trim() : '';
        const clusterName = clusterCol !== -1 ? String(row[clusterCol] || '').trim() : '';
        const gender = genderCol !== -1 ? String(row[genderCol] || '').trim().toLowerCase() : '';

        if (!firstName || !schoolName) {
          previewResults.push({
            row: i + 2,
            firstName,
            lastName,
            middleName,
            schoolName,
            regionName,
            clusterName,
            gender: gender === 'm' || gender === 'male' ? 'male' : (gender === 'f' || gender === 'female' ? 'female' : ''),
            status: 'error',
            message: !firstName ? 'Missing student name' : 'Missing school name',
            matchedSchoolId: null,
            matchedSchoolName: null,
            matchScore: 0,
          });
          continue;
        }

        // Find matching school
        let bestMatch: { school: any; score: number } | null = null;
        
        // Filter schools by region/cluster if provided
        let candidateSchools = allSchools;
        
        if (regionName) {
          const matchedRegion = allRegions.find(r => 
            normalizeSchoolName(r.name).includes(normalizeSchoolName(regionName)) ||
            normalizeSchoolName(regionName).includes(normalizeSchoolName(r.name))
          );
          if (matchedRegion) {
            candidateSchools = candidateSchools.filter(s => s.regionId === matchedRegion.id);
          }
        }
        
        if (clusterName && candidateSchools.length > 0) {
          const matchedCluster = allClusters.find(c => 
            normalizeSchoolName(c.name).includes(normalizeSchoolName(clusterName)) ||
            normalizeSchoolName(clusterName).includes(normalizeSchoolName(c.name))
          );
          if (matchedCluster) {
            candidateSchools = candidateSchools.filter(s => s.clusterId === matchedCluster.id);
          }
        }

        // Calculate similarity with each candidate school
        for (const school of candidateSchools) {
          const score = calculateSimilarity(schoolName, school.name);
          if (score >= 0.5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { school, score };
          }
        }

        // Check if exact match
        if (!bestMatch) {
          // Try exact match ignoring case
          const exactMatch = candidateSchools.find(s => 
            s.name.toLowerCase() === schoolName.toLowerCase()
          );
          if (exactMatch) {
            bestMatch = { school: exactMatch, score: 1.0 };
          }
        }

        const normalizedGender = gender === 'm' || gender === 'male' ? 'male' : 
                                 (gender === 'f' || gender === 'female' ? 'female' : '');

        previewResults.push({
          row: i + 2,
          firstName,
          lastName,
          middleName,
          schoolName,
          regionName,
          clusterName,
          gender: normalizedGender,
          status: bestMatch ? (bestMatch.score >= 0.8 ? 'matched' : 'ambiguous') : 'unmatched',
          message: bestMatch ? 
            (bestMatch.score >= 0.8 ? `Matched to: ${bestMatch.school.name}` : `Possible match: ${bestMatch.school.name} (${Math.round(bestMatch.score * 100)}%)`) :
            'No matching school found',
          matchedSchoolId: bestMatch?.school.id || null,
          matchedSchoolName: bestMatch?.school.name || null,
          matchScore: bestMatch?.score || 0,
        });
      }

      // Calculate summary
      const matched = previewResults.filter(r => r.status === 'matched').length;
      const ambiguous = previewResults.filter(r => r.status === 'ambiguous').length;
      const unmatched = previewResults.filter(r => r.status === 'unmatched').length;
      const errors = previewResults.filter(r => r.status === 'error').length;

      // Collect unique unmatched schools with their first occurrence row number
      const unmatchedSchoolsMap = new Map<string, number>();
      previewResults
        .filter(r => r.status === 'unmatched')
        .forEach(r => {
          if (!unmatchedSchoolsMap.has(r.schoolName)) {
            unmatchedSchoolsMap.set(r.schoolName, r.row);
          }
        });
      
      const unmatchedSchools = Array.from(unmatchedSchoolsMap.entries()).map(([name, rowNum]) => ({
        schoolName: name,
        originalRowNumber: rowNum,
      }));

      res.json({
        success: true,
        preview: previewResults,
        summary: {
          total: previewResults.length,
          matched,
          ambiguous,
          unmatched,
          errors,
        },
        unmatchedSchools,
        availableSchools: allSchools.map(s => ({ 
          id: s.id, 
          name: s.name, 
          region: regionMap.get(s.regionId!)?.name,
          cluster: clusterMap.get(s.clusterId!)?.name,
        })),
      });
    } catch (error: any) {
      console.error('Bulk upload preview error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin bulk student upload - confirm and create students
  app.post("/api/students/bulk-upload-confirm", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can bulk upload students" });
      }

      const { students: studentList, examYearId, grade } = req.body;
      
      if (!Array.isArray(studentList) || studentList.length === 0) {
        return res.status(400).json({ message: "No students to upload" });
      }

      if (!examYearId || !grade) {
        return res.status(400).json({ message: "examYearId and grade are required" });
      }

      // Get exam year details for fee calculation
      const examYear = await storage.getExamYear(parseInt(examYearId));
      if (!examYear) {
        return res.status(404).json({ message: "Exam year not found" });
      }

      const created: any[] = [];
      const failed: any[] = [];
      const schoolStudentMap = new Map<number, number>(); // Track students by school for invoice creation

      for (const student of studentList) {
        if (!student.matchedSchoolId) {
          failed.push({ ...student, error: 'No school matched' });
          continue;
        }

        try {
          const studentData = {
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName || '',
            gender: student.gender || 'male',
            schoolId: student.matchedSchoolId,
            examYearId: parseInt(examYearId),
            grade: parseInt(grade),
            status: 'approved' as const, // Auto-approve bulk uploaded students
          };

          const parsed = insertStudentSchema.safeParse(studentData);
          if (!parsed.success) {
            failed.push({ ...student, error: fromZodError(parsed.error).message });
            continue;
          }

          const newStudent = await storage.createStudent(parsed.data);
          
          // Auto-generate index number for approved students
          if (newStudent.status === 'approved' && !newStudent.indexNumber) {
            const indexNum = generateIndexNumber();
            newStudent.indexNumber = indexNum;
            await storage.updateStudent(newStudent.id, { indexNumber: indexNum });
          }
          
          created.push(newStudent);
          
          // Track student count by school
          const count = schoolStudentMap.get(student.matchedSchoolId) || 0;
          schoolStudentMap.set(student.matchedSchoolId, count + 1);
        } catch (error: any) {
          failed.push({ ...student, error: error.message });
        }
      }

      // Create financial records (invoices) for each school
      const invoicesCreated: any[] = [];
      for (const [schoolId, studentCount] of Array.from(schoolStudentMap.entries())) {
        try {
          const invoiceNumber = generateInvoiceNumber(schoolId, parseInt(examYearId));
          const feePerStudent = examYear.feePerStudent ? parseFloat(examYear.feePerStudent.toString()) : 100;
          const totalAmount = (feePerStudent * studentCount).toFixed(2);

          const invoice = await storage.createInvoice({
            invoiceNumber,
            schoolId,
            examYearId: parseInt(examYearId),
            totalStudents: studentCount,
            feePerStudent: feePerStudent.toString(),
            totalAmount,
            status: 'paid' as const, // Mark as paid since payment is pre-settled for bulk uploads
          });

          // Create invoice item for this grade
          if (invoice) {
            const subtotal = (feePerStudent * studentCount).toFixed(2);
            await storage.createInvoiceItem({
              invoiceId: invoice.id,
              grade: parseInt(grade),
              studentCount,
              feePerStudent: feePerStudent.toString(),
              subtotal,
            });
            invoicesCreated.push(invoice);
          }
        } catch (error: any) {
          console.error('Error creating invoice for school:', schoolId, error);
        }
      }

      res.json({
        success: true,
        created: created.length,
        failed: failed.length,
        students: created,
        errors: failed,
        invoicesCreated: invoicesCreated.length,
        message: `${created.length} students auto-approved and ${invoicesCreated.length} financial record(s) created`,
      });
    } catch (error: any) {
      console.error('Bulk upload confirm error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Download unmatched schools as CSV
  app.post("/api/students/download-unmatched-schools", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can download unmatched schools" });
      }

      const { unmatchedSchools } = req.body;
      if (!Array.isArray(unmatchedSchools) || unmatchedSchools.length === 0) {
        return res.status(400).json({ message: "No unmatched schools provided" });
      }

      // Create CSV content with UTF-8 BOM
      const BOM = '\uFEFF';
      let csvContent = BOM + '"School name (unmatched)","Original row number"\n';
      
      unmatchedSchools.forEach((school: { schoolName: string; originalRowNumber: number }) => {
        // Escape quotes in school name
        const escapedName = school.schoolName.replace(/"/g, '""');
        csvContent += `"${escapedName}",${school.originalRowNumber}\n`;
      });

      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="unmatched-schools.csv"');
      res.send(csvContent);
    } catch (error: any) {
      console.error('Download unmatched schools error:', error);
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

  // Only super_admin and examination_admin can approve students
  app.post("/api/students/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can approve students" });
      }
      const student = await storage.approveStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Auto-generate index number for approved students
      if (student.status === 'approved' && !student.indexNumber) {
        const indexNum = generateIndexNumber();
        const updatedStudent = await storage.updateStudent(student.id, { indexNumber: indexNum });
        return res.json(updatedStudent || student);
      }
      
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Only super_admin and examination_admin can reject students
  app.post("/api/students/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can reject students" });
      }
      const student = await storage.rejectStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk approve students - only super_admin and examination_admin
  app.post("/api/students/bulk-approve", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can approve students" });
      }
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "studentIds array is required" });
      }
      const approvedStudents = [];
      for (const id of studentIds) {
        let student = await storage.approveStudent(id);
        if (student) {
          // Auto-generate index number for approved students
          if (student.status === 'approved' && !student.indexNumber) {
            const indexNum = generateIndexNumber();
            student = await storage.updateStudent(student.id, { indexNumber: indexNum });
          }
          if (student) approvedStudents.push(student);
        }
      }
      res.json({ approved: approvedStudents.length, students: approvedStudents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk reject students - only super_admin and examination_admin
  app.post("/api/students/bulk-reject", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role)) {
        return res.status(403).json({ message: "Only super admin and examination admin can reject students" });
      }
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "studentIds array is required" });
      }
      const rejectedStudents = [];
      for (const id of studentIds) {
        const student = await storage.rejectStudent(id);
        if (student) rejectedStudents.push(student);
      }
      res.json({ rejected: rejectedStudents.length, students: rejectedStudents });
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
      
      // Enrich invoices with school and exam year information
      const allSchools = await storage.getAllSchools();
      const allExamYears = await storage.getAllExamYears();
      
      const enrichedInvoices = invoices.map(invoice => {
        const school = allSchools.find(s => s.id === invoice.schoolId);
        const examYear = allExamYears.find(ey => ey.id === invoice.examYearId);
        return {
          ...invoice,
          school: school ? { name: school.name } : null,
          examYear: examYear ? { name: examYear.name, id: examYear.id } : null,
        };
      });
      
      res.json(enrichedInvoices);
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
      const { schoolId, examYearId } = req.body;
      if (!schoolId || !examYearId) {
        return res.status(400).json({ message: "schoolId and examYearId are required" });
      }
      
      // Get exam year to get the fee per student
      const examYear = await storage.getExamYear(examYearId);
      if (!examYear) {
        return res.status(404).json({ message: "Exam year not found" });
      }
      
      const feePerStudent = parseFloat(examYear.feePerStudent || '100.00');
      
      // Get all students for this school and exam year
      const allStudents = await storage.getStudentsBySchool(schoolId);
      const examYearStudents = allStudents.filter(s => s.examYearId === examYearId);
      
      if (examYearStudents.length === 0) {
        return res.status(400).json({ message: "No students registered for this exam year" });
      }
      
      // Group students by grade and count
      const studentsByGrade: Record<number, number> = {};
      examYearStudents.forEach(s => {
        studentsByGrade[s.grade] = (studentsByGrade[s.grade] || 0) + 1;
      });
      
      // Calculate total
      const totalStudents = examYearStudents.length;
      const totalAmount = (totalStudents * feePerStudent).toFixed(2);
      
      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber(schoolId, examYearId);
      
      // Create the invoice
      const invoice = await storage.createInvoice({
        invoiceNumber,
        schoolId,
        examYearId,
        totalStudents,
        feePerStudent: feePerStudent.toString(),
        totalAmount,
      });
      
      // Create invoice items per grade
      const invoiceItemsData = Object.entries(studentsByGrade).map(([grade, count]) => ({
        invoiceId: invoice.id,
        grade: parseInt(grade),
        studentCount: count,
        feePerStudent: feePerStudent.toString(),
        subtotal: (count * feePerStudent).toFixed(2),
      }));
      
      const items = await storage.createInvoiceItemsBulk(invoiceItemsData);
      
      res.status(201).json({ invoice, items });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-generate invoice for school admin after student registration
  app.post("/api/invoices/auto-generate", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // School admins can only generate invoices for their own school
      let schoolId = req.body.schoolId;
      if (user.role === 'school_admin') {
        const userSchoolId = await getSchoolIdForUser(user);
        if (!userSchoolId) {
          return res.status(400).json({ message: "School admin not associated with a school" });
        }
        schoolId = userSchoolId;
      }
      
      if (!schoolId) {
        return res.status(400).json({ message: "schoolId is required" });
      }
      
      // Get active exam year
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.status(400).json({ message: "No active exam year found" });
      }
      
      const examYearId = activeExamYear.id;
      // Get all three fee types
      const registrationFee = parseFloat(activeExamYear.feePerStudent || '100.00');
      const certificateFee = parseFloat((activeExamYear as any).certificateFee || '50.00');
      const transcriptFee = parseFloat((activeExamYear as any).transcriptFee || '25.00');
      // Total fee per student = registration + certificate + transcript
      const totalFeePerStudent = registrationFee + certificateFee + transcriptFee;
      
      // Check if invoice already exists for this school and exam year
      const existingInvoices = await storage.getInvoicesBySchool(schoolId);
      const existingInvoice = existingInvoices.find(inv => inv.examYearId === examYearId);
      
      if (existingInvoice) {
        // Update existing invoice with new student counts
        const allStudents = await storage.getStudentsBySchool(schoolId);
        const examYearStudents = allStudents.filter(s => s.examYearId === examYearId);
        
        if (examYearStudents.length === 0) {
          return res.status(400).json({ message: "No students registered for this exam year" });
        }
        
        // Group students by grade
        const studentsByGrade: Record<number, number> = {};
        examYearStudents.forEach(s => {
          studentsByGrade[s.grade] = (studentsByGrade[s.grade] || 0) + 1;
        });
        
        const totalStudents = examYearStudents.length;
        const totalAmount = (totalStudents * totalFeePerStudent).toFixed(2);
        
        // Update invoice with all fee types
        const updatedInvoice = await storage.updateInvoice(existingInvoice.id, {
          totalStudents,
          totalAmount,
          feePerStudent: registrationFee.toString(),
          certificateFee: certificateFee.toString(),
          transcriptFee: transcriptFee.toString(),
        });
        
        // Delete old items and create new ones
        await storage.deleteInvoiceItemsByInvoice(existingInvoice.id);
        
        const invoiceItemsData = Object.entries(studentsByGrade).map(([grade, count]) => ({
          invoiceId: existingInvoice.id,
          grade: parseInt(grade),
          studentCount: count,
          feePerStudent: totalFeePerStudent.toString(),
          subtotal: (count * totalFeePerStudent).toFixed(2),
        }));
        
        const items = await storage.createInvoiceItemsBulk(invoiceItemsData);
        
        return res.json({ 
          invoice: updatedInvoice, 
          items, 
          updated: true,
          message: "Invoice updated with current student count" 
        });
      }
      
      // Create new invoice
      const allStudents = await storage.getStudentsBySchool(schoolId);
      const examYearStudents = allStudents.filter(s => s.examYearId === examYearId);
      
      if (examYearStudents.length === 0) {
        return res.status(400).json({ message: "No students registered for this exam year" });
      }
      
      // Group students by grade
      const studentsByGrade: Record<number, number> = {};
      examYearStudents.forEach(s => {
        studentsByGrade[s.grade] = (studentsByGrade[s.grade] || 0) + 1;
      });
      
      const totalStudents = examYearStudents.length;
      const totalAmount = (totalStudents * totalFeePerStudent).toFixed(2);
      
      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber(schoolId, examYearId);
      
      // Create the invoice with all fee types
      const invoice = await storage.createInvoice({
        invoiceNumber,
        schoolId,
        examYearId,
        totalStudents,
        feePerStudent: registrationFee.toString(),
        certificateFee: certificateFee.toString(),
        transcriptFee: transcriptFee.toString(),
        totalAmount,
      });
      
      // Create invoice items per grade (using total fee per student)
      const invoiceItemsData = Object.entries(studentsByGrade).map(([grade, count]) => ({
        invoiceId: invoice.id,
        grade: parseInt(grade),
        studentCount: count,
        feePerStudent: totalFeePerStudent.toString(),
        subtotal: (count * totalFeePerStudent).toFixed(2),
      }));
      
      const items = await storage.createInvoiceItemsBulk(invoiceItemsData);
      
      res.status(201).json({ 
        invoice, 
        items, 
        updated: false,
        message: "Invoice generated successfully" 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get invoice with items
  app.get("/api/invoices/:id/details", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const items = await storage.getInvoiceItems(invoice.id);
      const school = await storage.getSchool(invoice.schoolId);
      const examYear = invoice.examYearId ? await storage.getExamYear(invoice.examYearId) : null;
      res.json({ invoice, items, school, examYear });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate and download invoice PDF
  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const items = await storage.getInvoiceItems(invoice.id);
      const school = await storage.getSchool(invoice.schoolId);
      const examYear = invoice.examYearId ? await storage.getExamYear(invoice.examYearId) : null;
      
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      const puppeteer = (await import('puppeteer')).default;
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;
      
      // Read logo and convert to base64
      let logoBase64 = '';
      try {
        const logoPath = path.join(process.cwd(), 'attached_assets/Amana_Logo_1764714323051.PNG');
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      } catch (e) {
        console.log('Logo file not found, using placeholder');
      }
      
      // Get banking info from environment variables (with defaults)
      const bankName = process.env.BANK_NAME || 'Guaranty Trust Bank (Gambia) Ltd';
      const accountName = process.env.BANK_ACCOUNT_NAME || 'Amaanah Islamic Education Trust';
      const accountNumber = process.env.BANK_ACCOUNT_NUMBER || '211-123456789-01';
      
      // Parse fee values
      const registrationFee = parseFloat(invoice.feePerStudent || '0');
      const certificateFee = parseFloat(invoice.certificateFee || '0');
      const transcriptFee = parseFloat(invoice.transcriptFee || '0');
      const totalFeePerStudent = registrationFee + certificateFee + transcriptFee;
      
      // Generate invoice items HTML
      const itemRows = items.map((item, index) => `
        <tr>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Grade ${item.grade} Registration</td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.studentCount}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">D${totalFeePerStudent.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">D${item.subtotal}</td>
        </tr>
      `).join('');
      
      const issueDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'processing' ? '#f59e0b' : '#dc2626';
      const statusText = invoice.status === 'paid' ? 'PAID' : invoice.status === 'processing' ? 'PROCESSING' : 'PENDING';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.5;
              background: #fff;
              color: #1f2937;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1E8F4D;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo {
              width: 70px;
              height: 70px;
              object-fit: contain;
            }
            .logo-placeholder {
              width: 70px;
              height: 70px;
              background: #1E8F4D;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 28px;
              font-weight: bold;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #1E8F4D;
            }
            .company-subtitle {
              font-size: 12px;
              color: #6b7280;
            }
            .invoice-title {
              text-align: right;
            }
            .invoice-title h1 {
              font-size: 32px;
              color: #1E8F4D;
              margin-bottom: 5px;
            }
            .invoice-number {
              font-size: 14px;
              color: #6b7280;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              color: white;
              background: ${statusColor};
              margin-top: 10px;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-block {
              max-width: 45%;
            }
            .info-block h3 {
              font-size: 11px;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .info-block p {
              font-size: 13px;
              margin-bottom: 4px;
            }
            .info-block .school-name {
              font-size: 16px;
              font-weight: bold;
              color: #1f2937;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background: #1E8F4D;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            th:first-child { border-radius: 8px 0 0 0; }
            th:last-child { border-radius: 0 8px 0 0; text-align: right; }
            th:nth-child(3), th:nth-child(4) { text-align: center; }
            .fee-breakdown {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .fee-breakdown h3 {
              font-size: 14px;
              margin-bottom: 15px;
              color: #374151;
            }
            .fee-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .fee-row:last-child {
              border-bottom: none;
            }
            .totals {
              margin-left: auto;
              width: 300px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .total-row.grand-total {
              border-top: 2px solid #1E8F4D;
              margin-top: 10px;
              padding-top: 15px;
              font-size: 18px;
              font-weight: bold;
              color: #1E8F4D;
            }
            .payment-info {
              background: #fef3cd;
              border: 1px solid #ffc107;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .payment-info h3 {
              color: #856404;
              margin-bottom: 10px;
            }
            .payment-info p {
              font-size: 13px;
              color: #856404;
              margin-bottom: 5px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-section">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="logo" alt="Amaanah Logo" />` : '<div class="logo-placeholder">A</div>'}
                <div>
                  <div class="company-name">Amaanah</div>
                  <div class="company-subtitle">Islamic Education Trust - The Gambia</div>
                </div>
              </div>
              <div class="invoice-title">
                <h1>INVOICE</h1>
                <div class="invoice-number">${invoice.invoiceNumber}</div>
                <div class="status-badge">${statusText}</div>
              </div>
            </div>
            
            <div class="info-section">
              <div class="info-block">
                <h3>Bill To</h3>
                <p class="school-name">${school.name}</p>
                <p>${school.address || 'The Gambia'}</p>
                <p>Email: ${school.email || 'N/A'}</p>
                <p>Phone: ${school.phone || 'N/A'}</p>
              </div>
              <div class="info-block" style="text-align: right;">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Date:</strong> ${issueDate}</p>
                <p style="font-size: 16px; font-weight: bold; color: #1E8F4D;"><strong>Exam Year:</strong> ${examYear?.name || 'N/A'}</p>
                <p><strong>Total Students:</strong> ${invoice.totalStudents}</p>
              </div>
            </div>
            
            <div class="fee-breakdown">
              <h3>Fee Structure (per student)</h3>
              <div class="fee-row">
                <span>Registration Fee</span>
                <span>D${registrationFee.toFixed(2)}</span>
              </div>
              <div class="fee-row">
                <span>Certificate Fee</span>
                <span>D${certificateFee.toFixed(2)}</span>
              </div>
              <div class="fee-row">
                <span>Transcript Fee</span>
                <span>D${transcriptFee.toFixed(2)}</span>
              </div>
              <div class="fee-row" style="font-weight: bold; color: #1E8F4D;">
                <span>Total per Student</span>
                <span>D${totalFeePerStudent.toFixed(2)}</span>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Description</th>
                  <th style="width: 100px; text-align: center;">Students</th>
                  <th style="width: 120px; text-align: right;">Rate</th>
                  <th style="width: 120px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>D${parseFloat(invoice.totalAmount || '0').toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Due:</span>
                <span>D${parseFloat(invoice.totalAmount || '0').toFixed(2)}</span>
              </div>
            </div>
            
            ${invoice.status !== 'paid' ? `
            <div class="payment-info">
              <h3>Payment Instructions</h3>
              <p><strong>Bank:</strong> ${bankName}</p>
              <p><strong>Account Name:</strong> ${accountName}</p>
              <p><strong>Account Number:</strong> ${accountNumber}</p>
              <p style="margin-top: 10px;">Please upload your bank slip after payment for verification.</p>
            </div>
            ` : ''}
            
            <div class="footer">
              <p>Thank you for your registration with Amaanah Examination Board</p>
              <p>For inquiries: info@amaanah.gm | Tel: +220-1234567</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        res.send(Buffer.from(pdfBuffer));
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      console.error("Invoice PDF generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate and download exam cards PDF
  app.get("/api/students/exam-cards/pdf", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get filter parameters
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const grade = req.query.grade ? parseInt(req.query.grade as string) : undefined;
      
      // Get students based on role
      let students = await storage.getAllStudents();
      
      // School admins can only print cards for their own school
      if (user.role === 'school_admin') {
        const userSchoolId = await getSchoolIdForUser(user);
        if (!userSchoolId) {
          return res.status(403).json({ message: "School admin must be associated with a school" });
        }
        students = students.filter(s => s.schoolId === userSchoolId);
      } else if (schoolId) {
        students = students.filter(s => s.schoolId === schoolId);
      }
      
      // Only approved students with index numbers can have exam cards
      students = students.filter(s => s.status === 'approved' && s.indexNumber);
      
      if (examYearId) {
        students = students.filter(s => s.examYearId === examYearId);
      }
      
      if (grade) {
        students = students.filter(s => s.grade === grade);
      }
      
      if (students.length === 0) {
        return res.status(400).json({ message: "No approved students with index numbers found" });
      }
      
      // Get school and exam year info
      const allSchools = await storage.getAllSchools();
      const allExamYears = await storage.getAllExamYears();
      
      const puppeteer = (await import('puppeteer')).default;
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;
      
      // Read logo
      let logoBase64 = '';
      try {
        const logoPath = path.join(process.cwd(), 'attached_assets/Amana_Logo_1764714323051.PNG');
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      } catch (e) {
        console.log('Logo file not found for exam cards');
      }
      
      // Generate exam cards HTML - 4 cards per page (2x2 grid)
      const cardsHtml = students.map(student => {
        const school = allSchools.find(s => s.id === student.schoolId);
        const examYear = allExamYears.find(ey => ey.id === student.examYearId);
        
        return `
          <div class="card">
            <div class="card-header">
              <div class="logo-section">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="logo" />` : '<div class="logo-placeholder">A</div>'}
                <div>
                  <div class="org-name">Amaanah Islamic Education Trust</div>
                  <div class="card-title">EXAMINATION CARD</div>
                </div>
              </div>
              <div class="exam-year">${examYear?.name || 'Exam Year'}</div>
            </div>
            <div class="card-body">
              <div class="student-photo">
                <div class="photo-placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>
              <div class="student-info">
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span class="value">${student.firstName} ${student.lastName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Index No:</span>
                  <span class="value index-number">${student.indexNumber}</span>
                </div>
                <div class="info-row">
                  <span class="label">School:</span>
                  <span class="value">${school?.name || 'Unknown'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Grade:</span>
                  <span class="value">${student.grade || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Gender:</span>
                  <span class="value">${student.gender === 'male' ? 'Male' : 'Female'}</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="signature-line">
                <div class="line"></div>
                <span>Candidate Signature</span>
              </div>
              <div class="signature-line">
                <div class="line"></div>
                <span>Invigilator Signature</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 10pt;
              background: #fff;
              color: #1f2937;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 10mm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr;
              gap: 8mm;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .card {
              border: 2px solid #1E8F4D;
              border-radius: 8px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              background: linear-gradient(to bottom right, #ffffff 0%, #f0fdf4 100%);
            }
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo {
              width: 35px;
              height: 35px;
              object-fit: contain;
            }
            .logo-placeholder {
              width: 35px;
              height: 35px;
              background: #1E8F4D;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 18px;
              font-weight: bold;
            }
            .org-name {
              font-size: 9pt;
              font-weight: bold;
              color: #1E8F4D;
            }
            .card-title {
              font-size: 8pt;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .exam-year {
              font-size: 9pt;
              font-weight: 600;
              color: #1E8F4D;
              background: #dcfce7;
              padding: 4px 8px;
              border-radius: 4px;
            }
            .card-body {
              flex: 1;
              display: flex;
              gap: 12px;
            }
            .student-photo {
              width: 70px;
              flex-shrink: 0;
            }
            .photo-placeholder {
              width: 70px;
              height: 85px;
              border: 1px dashed #d1d5db;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #9ca3af;
              background: #f9fafb;
            }
            .student-info {
              flex: 1;
            }
            .info-row {
              display: flex;
              margin-bottom: 4px;
              font-size: 9pt;
            }
            .label {
              width: 55px;
              color: #6b7280;
              flex-shrink: 0;
            }
            .value {
              font-weight: 500;
              word-break: break-word;
            }
            .index-number {
              font-family: 'Courier New', monospace;
              font-size: 11pt;
              font-weight: bold;
              color: #1E8F4D;
              background: #dcfce7;
              padding: 2px 6px;
              border-radius: 3px;
            }
            .card-footer {
              display: flex;
              justify-content: space-between;
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
            }
            .signature-line {
              text-align: center;
              font-size: 7pt;
              color: #6b7280;
            }
            .signature-line .line {
              width: 80px;
              border-bottom: 1px solid #9ca3af;
              margin-bottom: 3px;
            }
          </style>
        </head>
        <body>
          ${(() => {
            // Group cards into pages of 4
            const pages = [];
            for (let i = 0; i < students.length; i += 4) {
              const pageCards = cardsHtml.split('</div>\\n        ');
              pages.push(`<div class="page">${students.slice(i, i + 4).map((_, idx) => {
                const cardIndex = i + idx;
                return students[cardIndex] ? cardsHtml.split('<div class="card">')[cardIndex + 1]?.split('</div>\\n          </div>')[0] : '';
              }).join('')}</div>`);
            }
            return pages.join('');
          })()}
        </body>
        </html>
      `;
      
      // Simpler approach - just wrap all cards in pages
      const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 10pt;
              background: #fff;
              color: #1f2937;
            }
            .cards-container {
              width: 210mm;
              padding: 10mm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8mm;
            }
            .card {
              border: 2px solid #1E8F4D;
              border-radius: 8px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              background: linear-gradient(to bottom right, #ffffff 0%, #f0fdf4 100%);
              height: 130mm;
              page-break-inside: avoid;
            }
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo {
              width: 35px;
              height: 35px;
              object-fit: contain;
            }
            .logo-placeholder {
              width: 35px;
              height: 35px;
              background: #1E8F4D;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 18px;
              font-weight: bold;
            }
            .org-name {
              font-size: 9pt;
              font-weight: bold;
              color: #1E8F4D;
            }
            .card-title {
              font-size: 8pt;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .exam-year {
              font-size: 9pt;
              font-weight: 600;
              color: #1E8F4D;
              background: #dcfce7;
              padding: 4px 8px;
              border-radius: 4px;
            }
            .card-body {
              flex: 1;
              display: flex;
              gap: 12px;
            }
            .student-photo {
              width: 70px;
              flex-shrink: 0;
            }
            .photo-placeholder {
              width: 70px;
              height: 85px;
              border: 1px dashed #d1d5db;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #9ca3af;
              background: #f9fafb;
            }
            .student-info {
              flex: 1;
            }
            .info-row {
              display: flex;
              margin-bottom: 4px;
              font-size: 9pt;
            }
            .label {
              width: 55px;
              color: #6b7280;
              flex-shrink: 0;
            }
            .value {
              font-weight: 500;
              word-break: break-word;
            }
            .index-number {
              font-family: 'Courier New', monospace;
              font-size: 11pt;
              font-weight: bold;
              color: #1E8F4D;
              background: #dcfce7;
              padding: 2px 6px;
              border-radius: 3px;
            }
            .card-footer {
              display: flex;
              justify-content: space-between;
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
            }
            .signature-line {
              text-align: center;
              font-size: 7pt;
              color: #6b7280;
            }
            .signature-line .line {
              width: 80px;
              border-bottom: 1px solid #9ca3af;
              margin-bottom: 3px;
            }
          </style>
        </head>
        <body>
          <div class="cards-container">
            ${cardsHtml}
          </div>
        </body>
        </html>
      `;
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      try {
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="exam-cards.pdf"`);
        res.send(Buffer.from(pdfBuffer));
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      console.error("Exam cards PDF generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get school's invoice for active exam year
  app.get("/api/school/invoice", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can access this endpoint" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(403).json({ message: "No school associated with this account" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.json({ invoice: null, message: "No active exam year" });
      }
      
      const invoices = await storage.getInvoicesBySchool(schoolId);
      const invoice = invoices.find(inv => inv.examYearId === activeExamYear.id);
      
      if (!invoice) {
        return res.json({ invoice: null, message: "No invoice found for current exam year" });
      }
      
      const items = await storage.getInvoiceItems(invoice.id);
      res.json({ invoice, items, examYear: activeExamYear });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all school invoices (including past ones) with exam year info
  app.get("/api/school/invoices/all", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin') {
        return res.status(403).json({ message: "Only school admins can access this endpoint" });
      }
      
      const schoolId = await getSchoolIdForUser(user);
      if (!schoolId) {
        return res.status(403).json({ message: "No school associated with this account" });
      }
      
      const invoices = await storage.getInvoicesBySchool(schoolId);
      const examYears = await storage.getAllExamYears();
      const activeExamYear = await storage.getActiveExamYear();
      
      // Determine current exam year ID - use active exam year if exists, otherwise use most recent
      let currentExamYearId: number | null = activeExamYear?.id ?? null;
      if (!currentExamYearId && invoices.length > 0) {
        // Fall back to the most recent invoice's exam year
        const sortedByDate = [...invoices].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        currentExamYearId = sortedByDate[0].examYearId;
      }
      
      // Enrich invoices with exam year info
      const enrichedInvoices = invoices.map(invoice => {
        const examYear = examYears.find(ey => ey.id === invoice.examYearId);
        return {
          ...invoice,
          examYear: examYear ? {
            id: examYear.id,
            name: examYear.name,
            isActive: examYear.isActive,
          } : null,
          isCurrentYear: invoice.examYearId === currentExamYearId,
        };
      });
      
      // Sort: current year first, then by creation date descending
      enrichedInvoices.sort((a, b) => {
        if (a.isCurrentYear && !b.isCurrentYear) return -1;
        if (!a.isCurrentYear && b.isCurrentYear) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      res.json(enrichedInvoices);
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

  // Bank slip upload endpoint for school admins
  app.post("/api/invoices/bank-slip", isAuthenticated, bankSlipUpload.single('file'), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Only school admins and super admins can upload bank slips
      if (user.role !== 'school_admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only school admins can upload bank slips" });
      }
      
      const invoiceId = parseInt(req.body.invoiceId);
      if (!invoiceId || isNaN(invoiceId)) {
        return res.status(400).json({ message: "Valid invoiceId is required" });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Verify school admin owns this invoice
      if (user.role === 'school_admin') {
        const userSchoolId = await getSchoolIdForUser(user);
        if (!userSchoolId || userSchoolId !== invoice.schoolId) {
          return res.status(403).json({ message: "Not authorized to update this invoice" });
        }
      }
      
      // Prevent uploading slips for already paid invoices
      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Invoice is already paid" });
      }
      
      // Allow re-upload if payment was rejected
      const isReupload = invoice.status === 'rejected';
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Please upload PDF, JPG, or PNG." });
      }
      
      // Upload file to object storage instead of storing base64
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      
      // Generate unique filename for the bank slip
      const fileExt = req.file.originalname.split('.').pop() || 'png';
      const uniqueFilename = `bank-slip-${invoiceId}-${Date.now()}.${fileExt}`;
      
      // Get upload URL from object storage
      let uploadURL: string;
      let objectPath: string;
      try {
        const result = await objectStorageService.getObjectEntityUploadURL(uniqueFilename);
        uploadURL = result.uploadURL;
        objectPath = result.objectPath;
      } catch (urlError: any) {
        console.error("Failed to get upload URL for bank slip:", urlError);
        return res.status(500).json({ message: "Failed to prepare file upload. Please try again." });
      }
      
      // Upload file buffer to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          'Content-Type': req.file.mimetype,
        },
      });
      
      if (!uploadResponse.ok) {
        console.error("Bank slip upload failed:", uploadResponse.status, uploadResponse.statusText);
        return res.status(500).json({ message: "Failed to upload file. Please try again." });
      }
      
      // Set ACL policy to make file accessible
      let bankSlipUrl: string;
      try {
        bankSlipUrl = await objectStorageService.trySetObjectEntityAclPolicy(
          uploadURL,
          { owner: user.id, visibility: 'public' }
        );
        if (!bankSlipUrl) {
          throw new Error("ACL policy returned empty path");
        }
      } catch (aclError: any) {
        console.error("Failed to set ACL policy for bank slip:", aclError);
        return res.status(500).json({ message: "File uploaded but failed to make it accessible. Please try again." });
      }
      
      // Update invoice with bank slip URL and set to processing status
      // Clear rejection fields if this is a re-upload after rejection
      const updateData: any = {
        bankSlipUrl,
        status: 'processing' as any,
      };
      
      if (isReupload) {
        updateData.rejectionReason = null;
        updateData.rejectedAt = null;
        updateData.rejectedBy = null;
      }
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, updateData);
      
      // Notify examination admins about the bank slip upload
      const school = await storage.getSchool(invoice.schoolId);
      if (school) {
        const { notifyBankSlipUploaded } = await import("./notificationService");
        await notifyBankSlipUploaded(
          invoice.schoolId,
          school.name,
          invoice.invoiceNumber,
          parseFloat(invoice.totalAmount || '0')
        );
      }
      
      res.json({ 
        message: "Bank slip uploaded successfully. Payment is pending verification.",
        invoice: updatedInvoice 
      });
    } catch (error: any) {
      console.error("Bank slip upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/pay", isAuthenticated, async (req, res) => {
    try {
      const { paymentMethod, bankSlipUrl } = req.body;
      if (!paymentMethod) {
        return res.status(400).json({ message: "paymentMethod is required" });
      }
      
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Mark invoice as paid
      const paidInvoice = await storage.markInvoicePaid(parseInt(req.params.id), paymentMethod, bankSlipUrl);
      if (!paidInvoice) {
        return res.status(404).json({ message: "Failed to update invoice" });
      }
      
      // Get school info for email
      const school = await storage.getSchool(invoice.schoolId);
      const activeExamYear = invoice.examYearId ? await storage.getExamYear(invoice.examYearId) : null;
      
      // Generate unique 6-digit index numbers for all approved students of this school and exam year
      const allStudents = await storage.getStudentsBySchool(invoice.schoolId);
      const studentsToIndex = allStudents.filter(s => 
        s.examYearId === invoice.examYearId && 
        s.status === 'approved' && 
        !s.indexNumber
      );
      
      const generatedStudents = [];
      const usedIndexNumbers = new Set<string>();
      
      // Get existing index numbers to avoid duplicates
      const existingStudents = await storage.getAllStudents();
      existingStudents.forEach(s => {
        if (s.indexNumber) usedIndexNumbers.add(s.indexNumber);
      });
      
      for (const student of studentsToIndex) {
        // Generate unique 6-digit index number
        let indexNumber: string;
        do {
          indexNumber = generateIndexNumber();
        } while (usedIndexNumbers.has(indexNumber));
        
        usedIndexNumbers.add(indexNumber);
        
        // Update student with index number
        const updatedStudent = await db.update(students)
          .set({ indexNumber, updatedAt: new Date() })
          .where(eq(students.id, student.id))
          .returning();
        
        if (updatedStudent.length > 0) {
          generatedStudents.push(updatedStudent[0]);
        }
      }
      
      // Send payment confirmation email to school
      if (school) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        try {
          await sendPaymentConfirmationEmail(
            school.email,
            school.name,
            invoice.invoiceNumber,
            invoice.totalAmount,
            invoice.totalStudents,
            baseUrl
          );
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }
      }
      
      res.json({
        invoice: paidInvoice,
        indexNumbersGenerated: generatedStudents.length,
        message: `Payment confirmed. ${generatedStudents.length} index numbers generated.`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Confirm payment by admin (examination_admin or super_admin only)
  // This only marks payment as confirmed, does NOT approve students or generate index numbers
  app.post("/api/invoices/:id/confirm-payment", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Only examination_admin and super_admin can confirm payments
      if (user.role !== 'examination_admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only examination admin or super admin can confirm payments" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Invoice already paid" });
      }
      
      if (invoice.status !== 'processing') {
        return res.status(400).json({ message: "Invoice must have a bank slip uploaded before payment can be confirmed" });
      }
      
      // Update invoice status to paid
      const [paidInvoice] = await db.update(invoices)
        .set({ 
          status: 'paid', 
          paymentDate: new Date(),
          paidAmount: invoice.totalAmount,
          paymentMethod: 'bank_transfer',
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId))
        .returning();
      
      // Send payment confirmation email to school
      const school = await storage.getSchool(invoice.schoolId);
      if (school) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        try {
          await sendPaymentConfirmationEmail(
            school.email,
            school.name,
            invoice.invoiceNumber,
            invoice.totalAmount,
            invoice.totalStudents,
            baseUrl
          );
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }
      }
      
      // Get all pending students for this school/exam year
      const allStudents = await storage.getStudentsBySchool(invoice.schoolId);
      const pendingStudents = allStudents.filter(s => 
        s.examYearId === invoice.examYearId && 
        s.status === 'pending'
      );
      
      // Auto-approve students and generate index numbers
      let approvedCount = 0;
      let indexNumbersGenerated = 0;
      
      if (pendingStudents.length > 0) {
        // Get existing index numbers to avoid duplicates
        const usedIndexNumbers = new Set<string>();
        const existingStudents = await storage.getAllStudents();
        existingStudents.forEach(s => {
          if (s.indexNumber) usedIndexNumbers.add(s.indexNumber);
        });
        
        // Approve each pending student and generate index number
        for (const student of pendingStudents) {
          // Generate unique index number
          let indexNumber: string;
          do {
            indexNumber = generateIndexNumber();
          } while (usedIndexNumbers.has(indexNumber));
          
          usedIndexNumbers.add(indexNumber);
          
          // Update student: approve and assign index number
          const [updatedStudent] = await db.update(students)
            .set({ 
              status: 'approved',
              indexNumber, 
              updatedAt: new Date() 
            })
            .where(eq(students.id, student.id))
            .returning();
          
          if (updatedStudent) {
            approvedCount++;
            if (updatedStudent.indexNumber) {
              indexNumbersGenerated++;
            }
          }
        }
      }
      
      // Notify school admin that their payment has been confirmed
      if (school) {
        const { notifyPaymentProcessed } = await import("./notificationService");
        await notifyPaymentProcessed(
          invoice.schoolId,
          school.name,
          invoice.invoiceNumber,
          parseFloat(invoice.totalAmount || '0'),
          approvedCount
        );
      }
      
      res.json({
        invoice: paidInvoice,
        message: approvedCount > 0 
          ? `Payment confirmed. ${approvedCount} students approved and assigned index numbers.`
          : "Payment confirmed successfully.",
        approvedCount,
        indexNumbersGenerated
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Reject payment by admin (examination_admin or super_admin only)
  app.post("/api/invoices/:id/reject-payment", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Only examination_admin and super_admin can reject payments
      if (user.role !== 'examination_admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only examination admin or super admin can reject payments" });
      }
      
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status !== 'processing') {
        return res.status(400).json({ message: "Only invoices with uploaded bank slips can be rejected" });
      }
      
      // Update invoice status to rejected
      const [rejectedInvoice] = await db.update(invoices)
        .set({ 
          status: 'rejected' as any, 
          rejectionReason: reason.trim(),
          rejectedAt: new Date(),
          rejectedBy: user.id,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId))
        .returning();
      
      // Notify school admin about the rejection
      const school = await storage.getSchool(invoice.schoolId);
      if (school) {
        const { notifyPaymentRejected } = await import("./notificationService");
        await notifyPaymentRejected(
          invoice.schoolId,
          school.name,
          invoice.invoiceNumber,
          parseFloat(invoice.totalAmount || '0'),
          reason.trim()
        );
      }
      
      res.json({
        invoice: rejectedInvoice,
        message: "Payment rejected successfully. School has been notified."
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Bulk approve students for a school after payment is confirmed
  // This approves all pending students and generates index numbers
  app.post("/api/invoices/:id/bulk-approve-students", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Only examination_admin and super_admin can bulk approve students
      if (user.role !== 'examination_admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only examination admin or super admin can approve students" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Payment must be confirmed before approving students
      if (invoice.status !== 'paid') {
        return res.status(400).json({ message: "Payment must be confirmed before approving students" });
      }
      
      // Get all pending students for this school and exam year
      const allStudents = await storage.getStudentsBySchool(invoice.schoolId);
      const pendingStudents = allStudents.filter(s => 
        s.examYearId === invoice.examYearId && 
        s.status === 'pending'
      );
      
      if (pendingStudents.length === 0) {
        return res.json({
          message: "No pending students to approve",
          approvedCount: 0,
          indexNumbersGenerated: 0
        });
      }
      
      // Get existing index numbers to avoid duplicates
      const usedIndexNumbers = new Set<string>();
      const existingStudents = await storage.getAllStudents();
      existingStudents.forEach(s => {
        if (s.indexNumber) usedIndexNumbers.add(s.indexNumber);
      });
      
      const approvedStudents = [];
      
      // Approve each pending student and generate index number
      for (const student of pendingStudents) {
        // Generate unique index number
        let indexNumber: string;
        do {
          indexNumber = generateIndexNumber();
        } while (usedIndexNumbers.has(indexNumber));
        
        usedIndexNumbers.add(indexNumber);
        
        // Update student: approve and assign index number
        const [updatedStudent] = await db.update(students)
          .set({ 
            status: 'approved',
            indexNumber, 
            updatedAt: new Date() 
          })
          .where(eq(students.id, student.id))
          .returning();
        
        if (updatedStudent) {
          approvedStudents.push(updatedStudent);
        }
      }
      
      // Get school info for notification
      const school = await storage.getSchool(invoice.schoolId);
      
      // Notify school admin that their students have been approved and index numbers generated
      if (school && approvedStudents.length > 0) {
        const { notifyPaymentConfirmed } = await import("./notificationService");
        await notifyPaymentConfirmed(
          invoice.schoolId,
          school.name,
          invoice.invoiceNumber,
          parseFloat(invoice.totalAmount || '0'),
          approvedStudents.length
        );
      }
      
      res.json({
        message: `Successfully approved ${approvedStudents.length} students and generated index numbers`,
        approvedCount: approvedStudents.length,
        indexNumbersGenerated: approvedStudents.length,
        students: approvedStudents,
        school: school ? { id: school.id, name: school.name } : null
      });
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

  app.post("/api/subjects/:id", isAuthenticated, async (req, res) => {
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
      
      // If no examYearId provided, get active exam year
      let targetExamYearId = examYearId;
      if (!targetExamYearId) {
        const activeYear = await storage.getActiveExamYear();
        if (activeYear) {
          targetExamYearId = activeYear.id;
        }
      }
      
      if (!targetExamYearId) {
        return res.json([]);
      }
      
      const timetable = grade
        ? await storage.getTimetableByGrade(targetExamYearId, grade)
        : await storage.getTimetableByExamYear(targetExamYearId);
      
      // Add subject relations
      const subjects = await storage.getAllSubjects();
      const examYears = await storage.getAllExamYears();
      const enrichedTimetable = timetable.map((entry: any) => ({
        ...entry,
        subject: subjects.find(s => s.id === entry.subjectId),
        examYear: examYears.find(ey => ey.id === entry.examYearId),
      }));
      
      res.json(enrichedTimetable);
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

  app.post("/api/timetable/:id", isAuthenticated, async (req, res) => {
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

  // Invigilator Assignments API (for exam supervision at centers)
  app.get("/api/invigilator-assignments", async (req, res) => {
    try {
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      
      let query = db.select().from(invigilatorAssignments);
      
      if (centerId) {
        query = query.where(eq(invigilatorAssignments.centerId, centerId)) as any;
      }
      
      const assignments = await query;
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invigilator-assignments", isAuthenticated, async (req, res) => {
    try {
      const { examinerId, examYearId, centerId, subjectId, timetableId, role, notes } = req.body;
      
      if (!examinerId || !examYearId || !centerId) {
        return res.status(400).json({ message: "examinerId, examYearId, and centerId are required" });
      }
      
      const [assignment] = await db.insert(invigilatorAssignments).values({
        examinerId,
        examYearId,
        centerId,
        subjectId: subjectId || null,
        timetableId: timetableId || null,
        role: role || 'invigilator',
        assignedDate: new Date(),
        notes: notes || null,
      }).returning();
      
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/invigilator-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(invigilatorAssignments)
        .where(eq(invigilatorAssignments.id, parseInt(req.params.id)));
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get invigilators for a specific center/exam
  app.get("/api/centers/:id/invigilators", async (req, res) => {
    try {
      const centerId = parseInt(req.params.id);
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      
      let query = db.select().from(invigilatorAssignments)
        .where(eq(invigilatorAssignments.centerId, centerId));
      
      const assignments = await query;
      
      // Enrich with examiner details
      const examiners = await storage.getAllExaminers();
      const subjects = await storage.getAllSubjects();
      
      const enrichedAssignments = assignments.map(a => ({
        ...a,
        examiner: examiners.find(e => e.id === a.examinerId),
        subject: subjects.find(s => s.id === a.subjectId),
      }));
      
      res.json(enrichedAssignments);
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

  // Store error files for download (keyed by session) - defined here so routes below can access it
  const uploadErrorFiles: Map<string, {
    unmatchedSchools: any[];
    unmatchedStudents: any[];
    noMarks: any[];
    invalidMarks: any[];
    timestamp: number;
  }> = new Map();

  // Two-phase upload: Store preview results for confirmation
  interface PreviewRow {
    rowNumber: number;
    rawSchoolName: string;
    rawStudentName: string;
    rawAddress: string;
    normalizedSchoolName: string;
    normalizedStudentName: string;
    schoolId: number | null;
    studentId: number | null;
    marks: Array<{ subjectId: number; score: number }>;
    isMatched: boolean;
    matchStatus: 'matched' | 'school_not_found' | 'student_not_found' | 'will_create' | 'will_create_school' | 'no_marks' | 'invalid_marks';
  }

  // Track schools that will be created
  interface SchoolToCreate {
    normalizedName: string;
    rawName: string;
    address: string;
  }

  interface PreviewData {
    rows: PreviewRow[];
    summary: {
      totalRows: number;
      matchedRows: number;
      matchedSchools: Set<number>;
      matchedStudents: Set<number>;
      unmatchedSchools: number;
      unmatchedStudents: number;
      noMarksRows: number;
      invalidMarksRows: number;
      newSchoolsCount?: number;
      newStudentsCount?: number;
      existingStudentsCount?: number;
    };
    examYearId: number;
    gradeLevel: number;
    unmatchedSchools: any[];
    unmatchedStudents: any[];
    noMarksRows: any[];
    invalidMarksRows: any[];
    schoolsToCreate: SchoolToCreate[];
    defaultRegionId?: number;
    defaultClusterId?: number;
    timestamp: number;
  }

  const uploadPreviewStore: Map<string, PreviewData> = new Map();

  // Clean up old preview data (older than 30 minutes)
  function cleanupOldPreviews() {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    for (const [key, data] of uploadPreviewStore.entries()) {
      if (data.timestamp < thirtyMinutesAgo) {
        uploadPreviewStore.delete(key);
      }
    }
  }

  // Preview upload for multer
  const previewUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req: any, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    },
  });

  // PHASE 1: Preview upload - matches schools/students, returns stats, NO saving
  app.post("/api/results/upload/preview", isAuthenticated, previewUpload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role || '')) {
        return res.status(403).json({ message: "Only admins can upload results" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      const examYearId = parseInt(req.body.examYearId);
      const gradeLevel = parseInt(req.body.grade);

      if (!examYearId) {
        return res.status(400).json({ message: "Exam year is required" });
      }
      if (!gradeLevel || ![3, 6, 9, 12].includes(gradeLevel)) {
        return res.status(400).json({ message: "Valid grade level (3, 6, 9, or 12) is required" });
      }

      // Parse CSV with UTF-8 encoding, strip BOM if present
      let csvContent = req.file.buffer.toString('utf-8');
      // Strip UTF-8 BOM if present (EF BB BF or \uFEFF)
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      const workbook = XLSX.read(csvContent, { type: 'string', codepage: 65001 });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      let rows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
      
      // Additional safety: sanitize all row keys by stripping BOM from any keys
      rows = rows.map(row => {
        const sanitizedRow: any = {};
        for (const key of Object.keys(row)) {
          const sanitizedKey = key.replace(/^\uFEFF/, '');
          sanitizedRow[sanitizedKey] = row[key];
        }
        return sanitizedRow;
      });

      if (rows.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      // Metadata columns for identification
      const metadataColumns = [
        'school name', 'schoolname', 'school_name', 'school', 'المدرسة',
        'address', 'العنوان',
        'student name', 'studentname', 'student_name', 'student', 'اسم الطالب', 'الطالب'
      ];
      
      const allColumns = Object.keys(rows[0]);
      const subjectColumns = allColumns.filter(col => 
        !metadataColumns.includes(col.toLowerCase().replace(/\s+/g, '').replace(/_/g, '')) && col.trim() !== ''
      );

      // Get all schools and create lookup map
      const allSchools = await storage.getAllSchools();
      const schoolLookupMap = new Map<string, { id: number; name: string }>();
      
      for (const school of allSchools) {
        const normalizedName = cleanArabicText(school.name, 'school');
        schoolLookupMap.set(normalizedName, { id: school.id, name: school.name });
      }

      console.log('[Preview] School lookup map size:', schoolLookupMap.size);
      console.log('[Preview] First 5 normalized school names:', Array.from(schoolLookupMap.keys()).slice(0, 5));

      // Get subjects for grade and create mapping
      const dbSubjects = await storage.getSubjectsByGrade(gradeLevel);
      const subjectHeaderMap = new Map<string, number>();
      
      for (const subject of dbSubjects) {
        const normalizedName = cleanArabicText(subject.name, 'subject');
        subjectHeaderMap.set(normalizedName, subject.id);
        if (subject.arabicName) {
          subjectHeaderMap.set(cleanArabicText(subject.arabicName, 'subject'), subject.id);
        }
      }

      // Map CSV columns to subject IDs
      const subjectColumnMapping: Map<string, number> = new Map();
      for (const col of subjectColumns) {
        const normalizedCol = cleanArabicText(col, 'subject');
        const subjectId = subjectHeaderMap.get(normalizedCol);
        if (subjectId) {
          subjectColumnMapping.set(col, subjectId);
        }
      }

      // Tracking
      const previewRows: PreviewRow[] = [];
      const unmatchedSchools: any[] = [];
      const unmatchedStudents: any[] = [];
      const noMarksRows: any[] = [];
      const invalidMarksRows: any[] = [];
      const processedSchoolNames = new Set<string>();
      const matchedSchoolIds = new Set<number>();
      const matchedStudentIds = new Set<number>();
      const studentCache = new Map<string, number | null>();
      
      // Track schools that will be created
      const schoolsToCreateMap = new Map<string, SchoolToCreate>();

      // Process each row (matching only, no saving)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const schoolName = row['School name'] || row['school name'] || row['schoolname'] || row['المدرسة'] || row['school'] || '';
          const address = row['address'] || row['Address'] || row['العنوان'] || '';
          const studentName = row['Student name'] || row['student name'] || row['studentname'] || row['اسم الطالب'] || row['student'] || '';

          if (!schoolName.trim()) {
            continue;
          }

          const normalizedSchoolName = cleanArabicText(schoolName, 'school');
          let matchedSchool = schoolLookupMap.get(normalizedSchoolName);

          // Debug first few rows
          if (i < 3) {
            console.log(`[Preview] Row ${i+2}: rawSchool="${schoolName.trim()}" normalized="${normalizedSchoolName}" matched=${!!matchedSchool}`);
          }

          // If school not found, we'll create it - track for creation
          if (!matchedSchool) {
            if (!processedSchoolNames.has(normalizedSchoolName)) {
              // Track school for creation (auto-create enabled)
              schoolsToCreateMap.set(normalizedSchoolName, {
                normalizedName: normalizedSchoolName,
                rawName: schoolName.trim(),
                address: address.trim(),
              });
              processedSchoolNames.add(normalizedSchoolName);
            }
            
            // Still need to validate student name
            if (!studentName.trim()) {
              noMarksRows.push({
                rowNumber: i + 2,
                rawSchoolName: schoolName.trim(),
                reason: 'Missing student name',
              });
              continue;
            }
            
            // Parse marks for validation
            let hasValidMarks = false;
            const validMarks: Array<{ subjectId: number; score: number }> = [];
            
            for (const [colName, subjectId] of subjectColumnMapping.entries()) {
              const rawValue = row[colName];
              if (rawValue === undefined || rawValue === null || rawValue === '') continue;
              const score = parseFloat(rawValue);
              if (!isNaN(score) && score >= 0 && score <= 100) {
                hasValidMarks = true;
                validMarks.push({ subjectId, score });
              }
            }
            
            if (!hasValidMarks) {
              noMarksRows.push({
                rowNumber: i + 2,
                rawSchoolName: schoolName.trim(),
                rawStudentName: studentName.trim(),
                reason: 'No valid marks found',
              });
              continue;
            }
            
            // Mark as will_create_school (school + student will be created)
            previewRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              rawStudentName: studentName.trim(),
              rawAddress: address.trim(),
              normalizedSchoolName,
              normalizedStudentName: cleanArabicText(studentName, 'student'),
              schoolId: null,
              studentId: null,
              marks: validMarks,
              isMatched: true,
              matchStatus: 'will_create_school',
            });
            continue;
          }

          matchedSchoolIds.add(matchedSchool.id);

          if (!studentName.trim()) {
            noMarksRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              reason: 'Missing student name',
            });
            continue;
          }

          const fullStudentName = studentName.trim();
          const normalizedStudentName = cleanArabicText(fullStudentName, 'student');

          // Parse marks
          let hasValidMarks = false;
          const validMarks: Array<{ subjectId: number; score: number }> = [];
          const invalidMarkDetails: string[] = [];

          for (const [colName, subjectId] of subjectColumnMapping.entries()) {
            const rawValue = row[colName];
            if (rawValue === undefined || rawValue === null || rawValue === '') continue;

            const score = parseFloat(rawValue);
            if (isNaN(score)) {
              invalidMarkDetails.push(`${colName}: "${rawValue}" (not a number)`);
            } else if (score < 0 || score > 100) {
              invalidMarkDetails.push(`${colName}: ${score} (out of range 0-100)`);
            } else {
              hasValidMarks = true;
              validMarks.push({ subjectId, score });
            }
          }

          if (invalidMarkDetails.length > 0) {
            invalidMarksRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              rawStudentName: fullStudentName,
              invalidMarks: invalidMarkDetails.join('; '),
            });
          }

          if (!hasValidMarks) {
            noMarksRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              rawStudentName: fullStudentName,
              reason: 'No valid marks (0-100)',
            });
            previewRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              rawStudentName: fullStudentName,
              rawAddress: address.trim(),
              normalizedSchoolName,
              normalizedStudentName,
              schoolId: matchedSchool.id,
              studentId: null,
              marks: [],
              isMatched: false,
              matchStatus: 'no_marks',
            });
            continue;
          }

          // Try to match student
          const schoolId = matchedSchool.id;
          const studentCacheKey = `${schoolId}_${normalizedStudentName}_${gradeLevel}`;
          let studentId = studentCache.get(studentCacheKey);

          if (studentId === undefined) {
            const existingStudents = await storage.getStudentsBySchool(schoolId);
            
            const existingStudent = existingStudents.find(s => {
              if (s.grade !== gradeLevel) return false;
              
              const storedFullName = `${s.firstName || ''} ${s.middleName || ''} ${s.lastName || ''}`.replace(/\s+/g, ' ').trim();
              const normalizedStoredName = cleanArabicText(storedFullName, 'student');
              
              if (normalizedStoredName === normalizedStudentName) return true;
              
              // Fuzzy matching for name variations
              if (normalizedStoredName.includes(normalizedStudentName) || normalizedStudentName.includes(normalizedStoredName)) {
                const shorterLen = Math.min(normalizedStoredName.length, normalizedStudentName.length);
                const longerLen = Math.max(normalizedStoredName.length, normalizedStudentName.length);
                if (shorterLen / longerLen >= 0.6) return true;
              }
              
              return false;
            });

            studentId = existingStudent?.id || null;
            studentCache.set(studentCacheKey, studentId);
          }

          if (!studentId) {
            // Student not found - mark for creation (user approved this behavior)
            // We'll create the student during confirm phase
            previewRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              rawStudentName: fullStudentName,
              rawAddress: address.trim(),
              normalizedSchoolName,
              normalizedStudentName,
              schoolId: matchedSchool.id,
              studentId: null,
              marks: validMarks,
              isMatched: true, // Treat as matched since we'll create the student
              matchStatus: 'will_create',
            });
            continue;
          }

          matchedStudentIds.add(studentId);
          previewRows.push({
            rowNumber: i + 2,
            rawSchoolName: schoolName.trim(),
            rawStudentName: fullStudentName,
            rawAddress: address.trim(),
            normalizedSchoolName,
            normalizedStudentName,
            schoolId: matchedSchool.id,
            studentId,
            marks: validMarks,
            isMatched: true,
            matchStatus: 'matched',
          });

        } catch (error: any) {
          console.error(`[Preview] Error processing row ${i + 2}:`, error);
        }
      }

      const matchedRows = previewRows.filter(r => r.isMatched).length;
      const newStudentsCount = previewRows.filter(r => r.matchStatus === 'will_create' || r.matchStatus === 'will_create_school').length;
      const existingStudentsCount = previewRows.filter(r => r.matchStatus === 'matched').length;
      const newSchoolsCount = schoolsToCreateMap.size;
      const schoolsToCreate = Array.from(schoolsToCreateMap.values());

      // Store preview data for confirmation
      const sessionKey = `preview_${userId}_${Date.now()}`;
      cleanupOldPreviews();
      
      uploadPreviewStore.set(sessionKey, {
        rows: previewRows,
        summary: {
          totalRows: rows.length,
          matchedRows,
          matchedSchools: matchedSchoolIds,
          matchedStudents: matchedStudentIds,
          unmatchedSchools: unmatchedSchools.length,
          unmatchedStudents: unmatchedStudents.length,
          noMarksRows: noMarksRows.length,
          invalidMarksRows: invalidMarksRows.length,
          newSchoolsCount,
          newStudentsCount,
          existingStudentsCount,
        },
        examYearId,
        gradeLevel,
        unmatchedSchools,
        unmatchedStudents,
        noMarksRows,
        invalidMarksRows,
        schoolsToCreate,
        timestamp: Date.now(),
      });

      // Also store for error downloads
      uploadErrorFiles.set(`upload_${userId}`, {
        unmatchedSchools,
        unmatchedStudents,
        noMarks: noMarksRows,
        invalidMarks: invalidMarksRows,
        timestamp: Date.now(),
      });

      console.log(`[Preview] Complete: ${rows.length} rows, ${matchedRows} matched, ${matchedSchoolIds.size} existing schools, ${newSchoolsCount} new schools to create, ${existingStudentsCount} existing students, ${newStudentsCount} new students to create`);

      res.json({
        success: true,
        sessionKey,
        canConfirm: matchedRows > 0,
        summary: {
          totalRows: rows.length,
          matchedRows,
          matchedSchools: matchedSchoolIds.size,
          matchedStudents: matchedStudentIds.size,
          unmatchedSchools: unmatchedSchools.length,
          unmatchedStudents: unmatchedStudents.length,
          noMarksRows: noMarksRows.length,
          invalidMarksRows: invalidMarksRows.length,
          newSchoolsCount,
          newStudentsCount,
          existingStudentsCount,
        },
        sampleUnmatchedSchools: unmatchedSchools.slice(0, 5),
        sampleUnmatchedStudents: unmatchedStudents.slice(0, 5),
        sampleNewSchools: schoolsToCreate.slice(0, 5),
      });

    } catch (error: any) {
      console.error('[Preview] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // PHASE 2: Confirm upload - apply matched results to database
  app.post("/api/results/upload/confirm", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role || '')) {
        return res.status(403).json({ message: "Only admins can confirm uploads" });
      }

      const { sessionKey, defaultRegionId, defaultClusterId } = req.body;
      if (!sessionKey) {
        return res.status(400).json({ message: "Session key is required" });
      }

      const previewData = uploadPreviewStore.get(sessionKey);
      if (!previewData) {
        return res.status(404).json({ message: "Preview data expired or not found. Please upload again." });
      }

      // Helper function
      function calculateGrade(score: number): string {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        return 'F';
      }

      // Helper function to parse Arabic name into firstName and lastName
      function parseStudentName(fullName: string): { firstName: string; lastName: string } {
        const cleaned = fullName.trim().replace(/\s+/g, ' ');
        const parts = cleaned.split(' ');
        
        if (parts.length === 1) {
          // Single name: use as firstName, placeholder lastName
          return { firstName: parts[0], lastName: 'غير متوفر' };
        } else if (parts.length === 2) {
          // Two parts: firstName lastName
          return { firstName: parts[0], lastName: parts[1] };
        } else {
          // Multiple parts: first part is firstName, rest is lastName
          return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
        }
      }

      let resultsCreated = 0;
      let resultsUpdated = 0;
      let studentsCreated = 0;
      let schoolsCreated = 0;

      // Step 0: Create schools for "will_create_school" rows
      const willCreateSchoolRows = previewData.rows.filter(r => r.matchStatus === 'will_create_school' && r.marks.length > 0);
      const schoolsToCreate = previewData.schoolsToCreate || [];
      
      // Need region/cluster for school creation - use defaults or first available
      let regionId = defaultRegionId;
      let clusterId = defaultClusterId;
      
      if (!regionId || !clusterId) {
        // Get first available region and cluster as fallback
        const regions = await storage.getAllRegions();
        if (regions.length > 0) {
          regionId = regionId || regions[0].id;
          const clusters = await storage.getClustersByRegion(regionId);
          if (clusters.length > 0) {
            clusterId = clusterId || clusters[0].id;
          }
        }
      }

      if (willCreateSchoolRows.length > 0 && (!regionId || !clusterId)) {
        return res.status(400).json({ 
          message: "Cannot create schools: No region/cluster specified and none available in database. Please add regions and clusters first." 
        });
      }

      // Create schools and build mapping of normalized name -> new school ID
      const newSchoolMap = new Map<string, number>();
      
      for (const schoolInfo of schoolsToCreate) {
        try {
          // Generate a unique email for the school (required field)
          const timestamp = Date.now();
          const randomNum = Math.floor(Math.random() * 10000);
          const sanitizedName = schoolInfo.rawName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '').substring(0, 20);
          const uniqueEmail = `school_${sanitizedName}_${timestamp}_${randomNum}@autogenerated.local`;
          
          const newSchool = await storage.createSchool({
            name: schoolInfo.rawName,
            registrarName: 'Auto-created from results upload',
            email: uniqueEmail,
            address: schoolInfo.address || '',
            schoolType: 'LBS', // Default type
            regionId: regionId!,
            clusterId: clusterId!,
            status: 'approved', // Auto-approve so students get index numbers
          });
          
          newSchoolMap.set(schoolInfo.normalizedName, newSchool.id);
          schoolsCreated++;
          
          console.log(`[Confirm] Created school: ${schoolInfo.rawName} (ID: ${newSchool.id})`);
        } catch (error: any) {
          console.error(`[Confirm] Failed to create school ${schoolInfo.rawName}:`, error.message);
        }
      }

      // Update rows with new school IDs
      for (const row of willCreateSchoolRows) {
        const newSchoolId = newSchoolMap.get(row.normalizedSchoolName);
        if (newSchoolId) {
          row.schoolId = newSchoolId;
        }
      }

      // Step 1: Create students for "will_create" and "will_create_school" rows
      const willCreateStudentRows = previewData.rows.filter(
        r => (r.matchStatus === 'will_create' || r.matchStatus === 'will_create_school') && r.schoolId && r.marks.length > 0
      );
      
      for (const row of willCreateStudentRows) {
        try {
          const { firstName, lastName } = parseStudentName(row.rawStudentName);
          
          // Create student with minimal required data
          const newStudent = await storage.createStudent({
            firstName,
            lastName,
            schoolId: row.schoolId!,
            grade: previewData.gradeLevel,
            status: 'approved', // Auto-approve to allow index number generation
            examYearId: previewData.examYearId,
            gender: 'male', // Default, will be updated if needed
          });
          
          // Update row with new student ID for result processing
          row.studentId = newStudent.id;
          studentsCreated++;
          
          console.log(`[Confirm] Created student: ${firstName} ${lastName} (ID: ${newStudent.id}) for school ${row.schoolId}`);
        } catch (error: any) {
          console.error(`[Confirm] Failed to create student for row ${row.rowNumber}:`, error.message);
        }
      }

      // Step 2: Apply results for all matched rows (existing + newly created students)
      const processableRows = previewData.rows.filter(r => r.isMatched && r.studentId && r.marks.length > 0);

      for (const row of processableRows) {
        for (const mark of row.marks) {
          const existing = await storage.getResultByStudentAndSubject(row.studentId!, mark.subjectId, previewData.examYearId);
          
          await storage.upsertStudentResult(row.studentId!, mark.subjectId, previewData.examYearId, {
            score: mark.score.toFixed(2),
            grade: calculateGrade(mark.score),
            status: 'pending',
            remarks: null,
          });

          if (existing) {
            resultsUpdated++;
          } else {
            resultsCreated++;
          }
        }
      }

      // Clean up preview data
      uploadPreviewStore.delete(sessionKey);

      console.log(`[Confirm] Applied: ${schoolsCreated} schools created, ${studentsCreated} students created, ${resultsCreated} results created, ${resultsUpdated} results updated`);

      res.json({
        success: true,
        summary: {
          studentsProcessed: processableRows.length,
          schoolsCreated,
          studentsCreated,
          resultsCreated,
          resultsUpdated,
        },
      });

    } catch (error: any) {
      console.error('[Confirm] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Results template download - MUST be before /api/results/:id to prevent route conflict
  app.get("/api/results/template", isAuthenticated, async (req, res) => {
    try {
      // Parse grade with proper NaN handling
      let gradeLevel = parseInt(String(req.query.grade || '3'));
      if (isNaN(gradeLevel) || ![3, 6, 9, 12].includes(gradeLevel)) {
        gradeLevel = 3; // Default to grade 3
      }
      
      // Get subjects for the grade level
      const subjects = await storage.getSubjectsByGrade(gradeLevel);
      
      // Build template headers
      const headers = ['School name', 'address', 'Student name'];
      subjects.forEach(s => headers.push(s.name));
      
      // Create CSV with BOM for UTF-8
      const BOM = '\uFEFF';
      const csvContent = BOM + headers.join(',') + '\n';
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="results_template_grade_${gradeLevel}.csv"`);
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Error file download endpoints - MUST be before /api/results/:id to prevent route conflict
  app.get("/api/results/errors/:type", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      
      const errorType = req.params.type as 'unmatched' | 'unmatchedstudents' | 'nomarks' | 'invalid';
      const sessionKey = `upload_${userId}`;
      const errorData = uploadErrorFiles.get(sessionKey);
      
      if (!errorData) {
        return res.status(404).json({ message: "No error data found. Please upload a file first." });
      }
      
      let rows: any[] = [];
      let filename = '';
      
      if (errorType === 'unmatched') {
        rows = errorData.unmatchedSchools;
        filename = 'unmatched_schools.csv';
      } else if (errorType === 'unmatchedstudents') {
        rows = errorData.unmatchedStudents;
        filename = 'unmatched_students.csv';
      } else if (errorType === 'nomarks') {
        rows = errorData.noMarks;
        filename = 'no_valid_marks.csv';
      } else if (errorType === 'invalid') {
        rows = errorData.invalidMarks;
        filename = 'invalid_marks.csv';
      } else {
        return res.status(400).json({ message: "Invalid error type" });
      }
      
      if (rows.length === 0) {
        return res.status(404).json({ message: "No errors of this type" });
      }
      
      // Create CSV with BOM for UTF-8
      const BOM = '\uFEFF';
      const headers = Object.keys(rows[0]);
      let csvContent = BOM + headers.join(',') + '\n';
      
      rows.forEach(row => {
        const values = headers.map(h => {
          const val = row[h] ?? '';
          // Escape quotes and wrap in quotes if contains comma or quotes
          const strVal = String(val);
          if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
            return '"' + strVal.replace(/"/g, '""') + '"';
          }
          return strVal;
        });
        csvContent += values.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
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
  
  // Enhanced Arabic Text Cleaner for robust matching
  // Applies normalization rules in specific order for reliable matching:
  // 1. Normalize spaces & unicode spaces
  // 2. Remove tatweel (kashida)
  // 3. Unify alef forms (أ إ آ → ا)
  // 4. Unify taa marbuta & alef maqsura (ة → ه, ى → ي)
  // 5. Strip punctuation/formatting
  // 6. Remove zero-width & control characters
  // 7. Convert Arabic digits (for Region/Cluster fields)
  // 8. Lowercase Latin text
  type CleanFieldType = 'default' | 'region' | 'cluster' | 'regionClusterCode' | 'school' | 'student' | 'address' | 'subject';
  
  function cleanArabicText(text: string, fieldType: CleanFieldType = 'default'): string {
    if (!text) return '';
    let s = text;
    
    // 1) Normalize spaces & unicode spaces
    // Convert non-breaking spaces, Arabic spaces, and other unicode spaces to regular spaces
    s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    s = s.trim();
    s = s.replace(/\s+/g, ' '); // Collapse multiple spaces to single
    
    // 2) Remove tatweel (kashida) - the extension character ـ
    s = s.replace(/\u0640/g, '');
    
    // 3) Unify alef forms: أ إ آ → ا
    s = s.replace(/[\u0622\u0623\u0625]/g, '\u0627');
    
    // 4) Unify taa marbuta & alef maqsura: ة → ه, ى → ي
    s = s.replace(/\u0629/g, '\u0647'); // ة → ه
    s = s.replace(/\u0649/g, '\u064A'); // ى → ي
    
    // 5) Strip punctuation/formatting inside names
    // Remove: . ، ؛ / \ | ( ) [ ] { } : ; ' " … — – · and similar
    s = s.replace(/[.،؛/\\|()[\]{};:'"…—–·«»„""''`~!@#$%^&*+=<>?]/g, '');
    // Also remove Arabic comma, semicolon, question mark variants
    s = s.replace(/[\u060C\u061B\u061F]/g, '');
    // Collapse any resulting multiple spaces
    s = s.replace(/\s+/g, ' ');
    s = s.trim();
    
    // 6) Remove zero-width & control characters
    s = s.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');
    // Remove other invisible formatting characters
    s = s.replace(/[\u2060-\u206F]/g, '');
    
    // 7) Convert Arabic-Indic digits to ASCII for Region/Cluster fields
    // ٠١٢٣٤٥٦٧٨٩ → 0123456789
    if (['region', 'cluster', 'regionClusterCode'].includes(fieldType)) {
      s = s.replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660));
      // Also handle Extended Arabic-Indic digits (used in Persian/Urdu)
      s = s.replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06F0));
    }
    
    // 8) Lowercase Latin text (Arabic is case-less)
    s = s.toLowerCase();
    
    return s;
  }
  
  // Backward-compatible alias for existing code
  function normalizeArabicText(text: string): string {
    return cleanArabicText(text, 'default');
  }
  
  // Parse composite Region.Cluster codes (e.g., "2.1" or "2-1" or "٢.١")
  function parseRegionClusterCode(code: string): { regionCode: string; clusterCode: string } | null {
    const cleaned = cleanArabicText(code, 'regionClusterCode');
    // Match patterns like "2.1", "2-1", "2 1"
    const match = cleaned.match(/^(\d+)[\.\-\s](\d+)$/);
    if (match) {
      return { regionCode: match[1], clusterCode: match[2] };
    }
    return null;
  }

  // Comprehensive bulk results upload with school matching (NO auto-creation)
  // Matches schools by normalized name, validates marks, tracks errors
  const comprehensiveUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for large CSV files
    fileFilter: (req: any, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    },
  });

  app.post("/api/results/comprehensive-upload", isAuthenticated, comprehensiveUpload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'examination_admin'].includes(user.role || '')) {
        return res.status(403).json({ message: "Only admins can perform comprehensive uploads" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      const examYearId = parseInt(req.body.examYearId);
      const gradeLevel = parseInt(req.body.grade);

      if (!examYearId) {
        return res.status(400).json({ message: "Exam year is required" });
      }
      if (!gradeLevel || ![3, 6, 9, 12].includes(gradeLevel)) {
        return res.status(400).json({ message: "Valid grade level (3, 6, 9, or 12) is required" });
      }

      // Parse CSV with UTF-8 encoding for Arabic support
      const csvContent = req.file.buffer.toString('utf-8');
      const workbook = XLSX.read(csvContent, { type: 'string', codepage: 65001 }); // UTF-8
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

      if (rows.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      // Expected CSV format: School name, address, Student name, [subject columns]
      const metadataColumns = [
        'school name', 'schoolname', 'school_name', 'school', 'المدرسة',
        'address', 'العنوان',
        'student name', 'studentname', 'student_name', 'student', 'اسم الطالب', 'الطالب'
      ];
      
      const firstRow = rows[0];
      const allColumns = Object.keys(firstRow);
      
      // Identify subject columns (not metadata)
      const subjectColumns = allColumns.filter(col => 
        !metadataColumns.includes(col.toLowerCase().replace(/\s+/g, '').replace(/_/g, ''))
      );

      if (subjectColumns.length === 0) {
        return res.status(400).json({ message: "No subject columns found in CSV. Expected format: School name, address, Student name, [subject columns]" });
      }

      // Get all existing schools and create normalized lookup map
      const allSchools = await storage.getAllSchools();
      const schoolLookupMap = new Map<string, { id: number; name: string }>();
      
      for (const school of allSchools) {
        const normalizedName = normalizeArabicText(school.name);
        schoolLookupMap.set(normalizedName, { id: school.id, name: school.name });
      }

      // Get subjects for the grade and create header mapping
      const dbSubjects = await storage.getSubjectsByGrade(gradeLevel);
      const subjectHeaderMap = new Map<string, number>(); // normalized header -> subject id
      
      for (const subject of dbSubjects) {
        const normalizedName = normalizeArabicText(subject.name);
        subjectHeaderMap.set(normalizedName, subject.id);
        // Also map by arabic name if available
        if (subject.arabicName) {
          subjectHeaderMap.set(normalizeArabicText(subject.arabicName), subject.id);
        }
      }

      // Map CSV subject columns to subject IDs
      const subjectColumnMapping: Map<string, number> = new Map();
      for (const col of subjectColumns) {
        const normalizedCol = normalizeArabicText(col);
        const subjectId = subjectHeaderMap.get(normalizedCol);
        if (subjectId) {
          subjectColumnMapping.set(col, subjectId);
        }
      }

      // Progress tracking
      const summary = {
        totalRows: rows.length,
        processed: 0,
        schoolsMatched: 0,
        studentsMatched: 0,
        resultsCreated: 0,
        resultsUpdated: 0,
        skippedUnmatchedSchool: 0,
        skippedUnmatchedStudent: 0,
        skippedNoMarks: 0,
        invalidMarks: 0,
      };

      // Error tracking for download
      const unmatchedSchools: any[] = [];
      const unmatchedStudents: any[] = [];
      const noMarksRows: any[] = [];
      const invalidMarksRows: any[] = [];
      const processedSchools = new Set<string>();
      const studentCache = new Map<string, number>();

      // Helper function to calculate grade
      function calculateGrade(score: number): string {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        return 'F';
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        summary.processed = i + 1;

        try {
          // Extract data using flexible column names
          const schoolName = row['School name'] || row['school name'] || row['schoolname'] || row['المدرسة'] || row['school'] || '';
          const address = row['address'] || row['Address'] || row['العنوان'] || '';
          const studentName = row['Student name'] || row['student name'] || row['studentname'] || row['اسم الطالب'] || row['student'] || '';

          // Validate required fields
          if (!schoolName.trim()) {
            continue; // Skip rows without school name
          }

          // Try to match school by normalized name
          const normalizedSchoolName = normalizeArabicText(schoolName);
          const matchedSchool = schoolLookupMap.get(normalizedSchoolName);

          if (!matchedSchool) {
            // School not matched - add to unmatched list and skip
            // Include both raw and normalized values for diagnosis
            summary.skippedUnmatchedSchool++;
            if (!processedSchools.has(normalizedSchoolName)) {
              unmatchedSchools.push({
                rowNumber: i + 2,
                rawSchoolName: schoolName.trim(),
                normalizedSchoolName: normalizedSchoolName,
                address: address.trim(),
                studentName: studentName.trim(),
                reason: 'School not found in database',
              });
              processedSchools.add(normalizedSchoolName);
            }
            continue;
          }

          // School matched
          if (!processedSchools.has(normalizedSchoolName)) {
            summary.schoolsMatched++;
            processedSchools.add(normalizedSchoolName);
          }

          // Validate student name
          if (!studentName.trim()) {
            noMarksRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              normalizedSchoolName: normalizedSchoolName,
              rawStudentName: '(empty)',
              reason: 'Missing student name',
            });
            continue;
          }

          // Keep full student name for matching (normalized comparison)
          const fullStudentName = studentName.trim();

          // Check marks and validate
          let hasValidMarks = false;
          const validMarks: Array<{ subjectId: number; score: number }> = [];
          const invalidMarkDetails: string[] = [];

          for (const [colName, subjectId] of subjectColumnMapping.entries()) {
            const rawValue = row[colName];
            if (rawValue === undefined || rawValue === null || rawValue === '') continue;

            const score = parseFloat(rawValue);
            if (isNaN(score)) {
              invalidMarkDetails.push(`${colName}: "${rawValue}" (not a number)`);
              summary.invalidMarks++;
            } else if (score < 0 || score > 100) {
              invalidMarkDetails.push(`${colName}: ${score} (out of range 0-100)`);
              summary.invalidMarks++;
            } else {
              hasValidMarks = true;
              validMarks.push({ subjectId, score });
            }
          }

          // Track invalid marks
          if (invalidMarkDetails.length > 0) {
            invalidMarksRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              normalizedSchoolName: normalizedSchoolName,
              rawStudentName: studentName.trim(),
              normalizedStudentName: cleanArabicText(fullStudentName, 'student'),
              invalidMarks: invalidMarkDetails.join('; '),
            });
          }

          // Skip if no valid marks
          if (!hasValidMarks) {
            summary.skippedNoMarks++;
            noMarksRows.push({
              rowNumber: i + 2,
              rawSchoolName: schoolName.trim(),
              normalizedSchoolName: normalizedSchoolName,
              rawStudentName: fullStudentName,
              normalizedStudentName: cleanArabicText(fullStudentName, 'student'),
              reason: 'No valid marks (0-100)',
            });
            continue;
          }

          // Find existing student (NO creation - students must exist in system)
          // Uses full-name normalized comparison for robust matching
          const schoolId = matchedSchool.id;
          const normalizedFullName = normalizeArabicText(fullStudentName);
          const studentCacheKey = `${schoolId}_${normalizedFullName}_${gradeLevel}`;
          let studentId = studentCache.get(studentCacheKey);

          if (!studentId) {
            // Try to find existing student by normalized full name
            const existingStudents = await storage.getStudentsBySchool(schoolId);
            
            // Match by normalized full name (firstName + lastName concatenated)
            const existingStudent = existingStudents.find(s => {
              if (s.grade !== gradeLevel) return false;
              
              // Build full name from stored first/last name
              const storedFullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
              const normalizedStoredName = normalizeArabicText(storedFullName);
              
              // Exact full-name match
              if (normalizedStoredName === normalizedFullName) return true;
              
              // Also try matching if the CSV name is contained in stored name or vice versa
              // This handles cases where middle names may be included/excluded
              if (normalizedStoredName.includes(normalizedFullName) || normalizedFullName.includes(normalizedStoredName)) {
                // Only accept if at least 80% of the shorter name matches
                const shorterLen = Math.min(normalizedStoredName.length, normalizedFullName.length);
                const longerLen = Math.max(normalizedStoredName.length, normalizedFullName.length);
                if (shorterLen / longerLen >= 0.6) return true;
              }
              
              return false;
            });

            if (existingStudent) {
              studentId = existingStudent.id;
              studentCache.set(studentCacheKey, studentId);
            } else {
              // Student not found - track as error and skip (NO auto-creation)
              // Include both raw and normalized values for diagnosis
              summary.skippedUnmatchedStudent++;
              unmatchedStudents.push({
                rowNumber: i + 2,
                rawSchoolName: schoolName.trim(),
                normalizedSchoolName: normalizedSchoolName,
                rawStudentName: fullStudentName,
                normalizedStudentName: normalizedFullName,
                grade: gradeLevel,
                reason: 'Student not found in system',
              });
              continue;
            }
          }

          summary.studentsMatched++;

          // Create or update results
          for (const mark of validMarks) {
            const existing = await storage.getResultByStudentAndSubject(studentId, mark.subjectId, examYearId);
            
            await storage.upsertStudentResult(studentId, mark.subjectId, examYearId, {
              score: mark.score.toFixed(2),
              grade: calculateGrade(mark.score),
              status: 'pending',
              remarks: null
            });

            if (existing) {
              summary.resultsUpdated++;
            } else {
              summary.resultsCreated++;
            }
          }
        } catch (error: any) {
          console.error(`Error processing row ${i + 2}:`, error);
        }
      }

      // Store error files for download
      const sessionKey = `upload_${userId}`;
      uploadErrorFiles.set(sessionKey, {
        unmatchedSchools,
        unmatchedStudents,
        noMarks: noMarksRows,
        invalidMarks: invalidMarksRows,
        timestamp: Date.now(),
      });

      // Clean up old error files (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [key, data] of uploadErrorFiles.entries()) {
        if (data.timestamp < oneHourAgo) {
          uploadErrorFiles.delete(key);
        }
      }

      res.status(201).json({
        success: true,
        summary: {
          totalRows: summary.totalRows,
          processed: summary.processed,
          schoolsMatched: summary.schoolsMatched,
          studentsMatched: summary.studentsMatched,
          resultsCreated: summary.resultsCreated,
          resultsUpdated: summary.resultsUpdated,
          skippedUnmatchedSchool: summary.skippedUnmatchedSchool,
          skippedUnmatchedStudent: summary.skippedUnmatchedStudent,
          skippedNoMarks: summary.skippedNoMarks,
          invalidMarks: summary.invalidMarks,
        },
        errors: {
          unmatchedSchoolsCount: unmatchedSchools.length,
          unmatchedStudentsCount: unmatchedStudents.length,
          noMarksCount: noMarksRows.length,
          invalidMarksCount: invalidMarksRows.length,
          hasErrors: unmatchedSchools.length > 0 || unmatchedStudents.length > 0 || noMarksRows.length > 0 || invalidMarksRows.length > 0,
        },
      });
    } catch (error: any) {
      console.error('Comprehensive upload error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced bulk results upload with index number lookup
  app.post("/api/results/bulk-upload", isAuthenticated, async (req, res) => {
    try {
      const { results: resultList, examYearId, subjectId } = req.body;
      
      if (!Array.isArray(resultList)) {
        return res.status(400).json({ message: "results must be an array" });
      }
      
      if (!examYearId || !subjectId) {
        return res.status(400).json({ message: "examYearId and subjectId are required" });
      }
      
      const validResults: any[] = [];
      const errors: any[] = [];
      const createdResults: any[] = [];
      
      // Process each result entry
      for (let index = 0; index < resultList.length; index++) {
        const entry = resultList[index];
        const rowNum = index + 1;
        
        // Look up student by index number
        if (!entry.indexNumber) {
          errors.push({ row: rowNum, error: "Index number is required" });
          continue;
        }
        
        const student = await storage.getStudentByIndexNumber(entry.indexNumber);
        if (!student) {
          errors.push({ row: rowNum, indexNumber: entry.indexNumber, error: "Student not found with this index number" });
          continue;
        }
        
        // Validate score
        const score = parseFloat(entry.score || entry.marks || '0');
        if (isNaN(score) || score < 0 || score > 100) {
          errors.push({ row: rowNum, indexNumber: entry.indexNumber, error: "Invalid score (must be 0-100)" });
          continue;
        }
        
        // Calculate grade automatically
        let grade = 'F';
        if (score >= 90) grade = 'A+';
        else if (score >= 80) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 50) grade = 'D';
        else if (score >= 40) grade = 'E';
        
        validResults.push({
          studentId: student.id,
          examYearId,
          subjectId,
          score: score.toFixed(2),
          grade: entry.grade || grade,
          remarks: entry.remarks || null,
          status: 'pending', // Requires validation before publishing
        });
      }
      
      // Create all valid results
      if (validResults.length > 0) {
        const created = await storage.createStudentResultsBulk(validResults);
        createdResults.push(...created);
      }
      
      res.status(201).json({
        uploaded: createdResults.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined,
        results: createdResults
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Bulk validate results for publishing
  app.post("/api/results/bulk-validate", isAuthenticated, async (req, res) => {
    try {
      const { resultIds, examYearId } = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      let resultsToValidate: number[] = [];
      
      if (resultIds && Array.isArray(resultIds)) {
        resultsToValidate = resultIds;
      } else if (examYearId) {
        // Get all pending results for this exam year
        const pendingResults = await storage.getPendingResults();
        resultsToValidate = pendingResults
          .filter(r => r.examYearId === examYearId)
          .map(r => r.id);
      } else {
        return res.status(400).json({ message: "Either resultIds or examYearId is required" });
      }
      
      const validated: any[] = [];
      const errors: any[] = [];
      
      for (const resultId of resultsToValidate) {
        try {
          const result = await storage.validateResult(resultId, userId);
          if (result) {
            validated.push(result);
          }
        } catch (err: any) {
          errors.push({ resultId, error: err.message });
        }
      }
      
      res.json({
        validated: validated.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined
      });
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

  // Get students for result entry - role-based filtering
  app.get("/api/results/students-for-entry", isAuthenticated, async (req, res) => {
    try {
      const { schoolId, clusterId, regionId, grade, examYearId } = req.query;
      const userId = req.session.userId;
      const userRole = req.session.role;
      
      const filters: { schoolId?: number; clusterId?: number; regionId?: number; grade?: number; examYearId?: number } = {};
      
      if (examYearId) filters.examYearId = parseInt(examYearId as string);
      if (grade) filters.grade = parseInt(grade as string);
      
      // Role-based filtering
      if (userRole === 'examiner') {
        // Get examiner's assignments
        const examiner = await storage.getExaminerByUserId(userId!);
        if (!examiner) {
          return res.json({ students: [], message: "No examiner profile found" });
        }
        
        const assignments = await storage.getExaminerAssignments(examiner.id);
        if (assignments.length === 0) {
          return res.json({ students: [], message: "No assignments found for this examiner" });
        }
        
        // Get students from assigned centers
        const centerIds = [...new Set(assignments.map(a => a.centerId).filter(Boolean))];
        let allStudents: any[] = [];
        
        for (const centerId of centerIds) {
          if (centerId) {
            const centerStudents = await storage.getStudentsByCenter(centerId);
            allStudents = [...allStudents, ...centerStudents];
          }
        }
        
        // Filter by approved status and exam year if specified
        let filteredStudents = allStudents.filter(s => s.status === 'approved');
        if (filters.examYearId) {
          filteredStudents = filteredStudents.filter(s => s.examYearId === filters.examYearId);
        }
        if (filters.grade) {
          filteredStudents = filteredStudents.filter(s => s.grade === filters.grade);
        }
        
        // Get school info for each student
        const studentsWithSchool = await Promise.all(filteredStudents.map(async (student) => {
          const school = await storage.getSchool(student.schoolId);
          const cluster = school?.clusterId ? await storage.getCluster(school.clusterId) : null;
          return {
            ...student,
            school: school ? { id: school.id, name: school.name } : null,
            cluster: cluster ? { id: cluster.id, name: cluster.name } : null
          };
        }));
        
        return res.json({ students: studentsWithSchool, role: 'examiner' });
      }
      
      // Examination admin or super admin - show all with filters
      if (schoolId) filters.schoolId = parseInt(schoolId as string);
      if (clusterId) filters.clusterId = parseInt(clusterId as string);
      if (regionId) filters.regionId = parseInt(regionId as string);
      
      const students = await storage.getStudentsForResultEntry(filters);
      
      // Get school info for each student
      const studentsWithSchool = await Promise.all(students.map(async (student) => {
        const school = await storage.getSchool(student.schoolId);
        const cluster = school?.clusterId ? await storage.getCluster(school.clusterId) : null;
        return {
          ...student,
          school: school ? { id: school.id, name: school.name } : null,
          cluster: cluster ? { id: cluster.id, name: cluster.name } : null
        };
      }));
      
      res.json({ students: studentsWithSchool, role: userRole });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Multi-subject CSV upload - handles CSV format with school code, name, location, region, student number, student name, subjects
  app.post("/api/results/multi-subject-upload", isAuthenticated, async (req, res) => {
    try {
      const { rows, examYearId, grade } = req.body;
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "rows must be a non-empty array" });
      }
      
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }
      
      if (!grade) {
        return res.status(400).json({ message: "grade is required" });
      }
      
      const gradeNumber = parseInt(grade);
      const results: { created: number; updated: number; errors: any[] } = { created: 0, updated: 0, errors: [] };
      
      // Subject name mappings for normalized variations
      const subjectMappings: Record<string, { name: string; arabicName: string }> = {
        'القــــــرآن': { name: 'Quran', arabicName: 'القرآن' },
        'القرآن': { name: 'Quran', arabicName: 'القرآن' },
        'القراءة (المحفوظات)': { name: 'Reading (Memorization)', arabicName: 'القراءة (المحفوظات)' },
        'القراءة': { name: 'Reading (Memorization)', arabicName: 'القراءة (المحفوظات)' },
        'السيــــــرة': { name: 'Seerah', arabicName: 'السيرة' },
        'السيرة': { name: 'Seerah', arabicName: 'السيرة' },
        'الكتابة (الخط والإملاء)': { name: 'Writing (Calligraphy & Spelling)', arabicName: 'الكتابة (الخط والإملاء)' },
        'الكتابة': { name: 'Writing (Calligraphy & Spelling)', arabicName: 'الكتابة (الخط والإملاء)' },
        'الحديـــــث': { name: 'Hadith', arabicName: 'الحديث' },
        'الحديث': { name: 'Hadith', arabicName: 'الحديث' },
        'الفقــــــه': { name: 'Fiqh', arabicName: 'الفقه' },
        'الفقه': { name: 'Fiqh', arabicName: 'الفقه' },
        'التوحيــــــد': { name: 'Tawheed', arabicName: 'التوحيد' },
        'التوحيد': { name: 'Tawheed', arabicName: 'التوحيد' },
        'القواعــــــد': { name: 'Grammar', arabicName: 'القواعد' },
        'القواعد': { name: 'Grammar', arabicName: 'القواعد' },
        'English': { name: 'English', arabicName: 'English' },
        'Mathematics': { name: 'Mathematics', arabicName: 'Mathematics' },
        'S E S': { name: 'S E S', arabicName: 'S E S' },
        'SES': { name: 'S E S', arabicName: 'S E S' },
        'Science': { name: 'Science', arabicName: 'Science' },
        'التعبيـــــر': { name: 'Expression', arabicName: 'التعبير' },
        'التعبير': { name: 'Expression', arabicName: 'التعبير' }
      };
      
      // Process each row
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const rowNum = rowIndex + 1;
        
        try {
          // Extract key fields (Arabic column names)
          const schoolName = (row['المدرسة'] || '').trim();
          const regionName = (row['إقليم'] || '').trim();
          const studentIndexNumber = (row['رقم الطالب'] || '').trim();
          const studentName = (row['اسم الطالب'] || '').trim();
          
          if (!schoolName || !regionName || !studentName) {
            results.errors.push({ row: rowNum, error: "Missing school name, region, or student name" });
            continue;
          }
          
          // Find or create region
          let region = (await storage.getAllRegions()).find(r => r.name.toLowerCase() === regionName.toLowerCase());
          if (!region) {
            region = await storage.createRegion({ name: regionName });
          }
          
          // Find or create school (match by name and region)
          let school = (await storage.getAllSchools()).find(s => 
            s.name.toLowerCase() === schoolName.toLowerCase() && 
            s.regionId === region.id
          );
          
          if (!school) {
            // Auto-create school
            school = await storage.createSchool({
              name: schoolName,
              regionId: region.id,
              clusterId: null,
              registrationStatus: 'verified',
              adminUserId: null
            });
          }
          
          // Find or create student (match by index number or name)
          let student: any = null;
          if (studentIndexNumber) {
            student = await storage.getStudentByIndexNumber(studentIndexNumber);
          }
          
          if (!student) {
            // Try to find by name and school
            let students = await storage.getStudentsBySchool(school.id);
            student = students.find(s => 
              `${s.firstName} ${s.lastName}`.toLowerCase() === studentName.toLowerCase()
            );
          }
          
          if (!student) {
            // Auto-create student
            const [firstName, ...lastNameParts] = studentName.split(' ');
            const lastName = lastNameParts.join(' ') || 'Student';
            const indexNumber = studentIndexNumber || await generateIndexNumber(gradeNumber, school.id);
            
            student = await storage.createStudent({
              firstName,
              lastName,
              gender: 'unspecified',
              dateOfBirth: null,
              schoolId: school.id,
              grade: gradeNumber,
              examYearId,
              indexNumber,
              registrationStatus: 'registered'
            });
          }
          
          // Process each subject column in the row
          for (const [columnName, scoreValue] of Object.entries(row)) {
            // Skip non-subject columns (Arabic names)
            if (['رقم المدرسة', 'المدرسة', 'المكــــــان', 'إقليم', 'رقم الطالب', 'اسم الطالب'].includes(columnName)) {
              continue;
            }
            
            // Clean up column name
            const cleanColumnName = columnName.trim().replace(/\s+/g, ' ');
            
            // Skip empty column names
            if (!cleanColumnName) continue;
            
            // Get or create subject with Arabic names (using dynamically created subjects)
            const subjectInfo = subjectMappings[cleanColumnName] || { 
              name: cleanColumnName, 
              arabicName: cleanColumnName 
            };
            
            const subject = await storage.getOrCreateSubject(subjectInfo.name, subjectInfo.arabicName, gradeNumber);
            
            // Parse score
            const score = parseFloat(String(scoreValue || '').trim());
            if (isNaN(score) || String(scoreValue).trim() === '') {
              continue; // Skip empty scores
            }
            
            // Calculate grade
            let resultGrade = 'F';
            if (score >= 14) resultGrade = 'A';
            else if (score >= 12) resultGrade = 'B';
            else if (score >= 10) resultGrade = 'C';
            else if (score >= 8) resultGrade = 'D';
            else if (score >= 5) resultGrade = 'E';
            
            // Upsert result
            const existing = await storage.getResultByStudentAndSubject(student.id, subject.id, examYearId);
            await storage.upsertStudentResult(student.id, subject.id, examYearId, {
              totalScore: String(score),
              examScore: String(score),
              grade: resultGrade,
              status: 'pending'
            });
            
            if (existing) {
              results.updated++;
            } else {
              results.created++;
            }
          }
        } catch (err: any) {
          results.errors.push({ row: rowNum, error: err.message });
        }
      }
      
      res.json({
        message: `Results processed: ${results.created} created, ${results.updated} updated`,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        errorDetails: results.errors.length > 0 ? results.errors.slice(0, 50) : undefined
      });
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

  // Certificate Generation Endpoints
  app.post("/api/certificates/generate", isAuthenticated, async (req, res) => {
    try {
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "studentIds array is required" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.status(400).json({ message: "No active exam year found" });
      }

      const { generateCertificatePDF, generateCertificateNumber, generateQRToken } = await import('./certificateService');

      const generatedCerts = [];
      for (const studentId of studentIds) {
        const student = await storage.getStudent(studentId);
        if (!student) continue;
        
        if (![6, 9, 12].includes(student.grade)) {
          continue;
        }
        
        const school = await storage.getSchool(student.schoolId);
        if (!school) continue;
        
        const results = await storage.getResultsByStudent(studentId);
        const passedResults = results.filter(r => r.status === 'published');
        if (passedResults.length === 0) continue;
        
        const totalScore = passedResults.reduce((sum, r) => sum + parseFloat(r.totalScore || '0'), 0);
        const average = totalScore / passedResults.length;
        let finalGrade = 'PASS';
        if (average >= 80) finalGrade = 'A';
        else if (average >= 70) finalGrade = 'B';
        else if (average >= 60) finalGrade = 'C';
        else if (average >= 50) finalGrade = 'D';
        else finalGrade = 'FAIL';
        
        if (finalGrade === 'FAIL') continue;
        
        const qrToken = generateQRToken();
        const certNumber = generateCertificateNumber(activeExamYear.year, student.id);
        const verifyUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://amaanah.repl.co'}/verify/${qrToken}`;
        
        try {
          const pdfPath = await generateCertificatePDF({
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              middleName: student.middleName,
              gender: student.gender as 'male' | 'female',
              dateOfBirth: student.dateOfBirth,
              placeOfBirth: student.placeOfBirth,
              grade: student.grade,
              indexNumber: student.indexNumber,
            },
            school: { id: school.id, name: school.name },
            examYear: {
              id: activeExamYear.id,
              year: activeExamYear.year,
              examStartDate: activeExamYear.examStartDate,
              examEndDate: activeExamYear.examEndDate,
            },
            finalGrade,
            totalScore,
            qrToken,
            certificateNumber: certNumber,
            verifyUrl,
          });
          
          const cert = await storage.createCertificate({
            studentId: student.id,
            examYearId: activeExamYear.id,
            certificateNumber: certNumber,
            grade: student.grade,
            templateType: student.gender,
            finalResult: finalGrade,
            finalGradeWord: finalGrade,
            totalScore: String(totalScore),
            qrToken,
            issuedDate: new Date(),
            pdfUrl: pdfPath,
            status: 'generated',
          });
          generatedCerts.push(cert);
        } catch (e: any) {
          console.error(`Failed to generate certificate for student ${studentId}:`, e.message);
        }
      }
      
      res.json({ generated: generatedCerts.length, certificates: generatedCerts });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/certificates/generate-school", isAuthenticated, async (req, res) => {
    try {
      const { schoolId } = req.body;
      if (!schoolId) {
        return res.status(400).json({ message: "schoolId is required" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.status(400).json({ message: "No active exam year found" });
      }

      const { generateCertificatePDF, generateCertificateNumber, generateQRToken } = await import('./certificateService');

      const students = await storage.getStudentsBySchool(parseInt(schoolId));
      const school = await storage.getSchool(parseInt(schoolId));
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      const generatedCerts = [];
      
      for (const student of students) {
        if (student.status !== 'approved') continue;
        if (![6, 9, 12].includes(student.grade)) continue;
        
        const results = await storage.getResultsByStudent(student.id);
        const passedResults = results.filter(r => r.status === 'published');
        if (passedResults.length === 0) continue;
        
        const totalScore = passedResults.reduce((sum, r) => sum + parseFloat(r.totalScore || '0'), 0);
        const average = totalScore / passedResults.length;
        let finalGrade = 'PASS';
        if (average >= 80) finalGrade = 'A';
        else if (average >= 70) finalGrade = 'B';
        else if (average >= 60) finalGrade = 'C';
        else if (average >= 50) finalGrade = 'D';
        else finalGrade = 'FAIL';
        
        if (finalGrade === 'FAIL') continue;
        
        const qrToken = generateQRToken();
        const certNumber = generateCertificateNumber(activeExamYear.year, student.id);
        const verifyUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://amaanah.repl.co'}/verify/${qrToken}`;
        
        try {
          const pdfPath = await generateCertificatePDF({
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              middleName: student.middleName,
              gender: student.gender as 'male' | 'female',
              dateOfBirth: student.dateOfBirth,
              placeOfBirth: student.placeOfBirth,
              grade: student.grade,
              indexNumber: student.indexNumber,
            },
            school: { id: school.id, name: school.name },
            examYear: {
              id: activeExamYear.id,
              year: activeExamYear.year,
              examStartDate: activeExamYear.examStartDate,
              examEndDate: activeExamYear.examEndDate,
            },
            finalGrade,
            totalScore,
            qrToken,
            certificateNumber: certNumber,
            verifyUrl,
          });
          
          const cert = await storage.createCertificate({
            studentId: student.id,
            examYearId: activeExamYear.id,
            certificateNumber: certNumber,
            grade: student.grade,
            templateType: student.gender,
            finalResult: finalGrade,
            finalGradeWord: finalGrade,
            totalScore: String(totalScore),
            qrToken,
            issuedDate: new Date(),
            pdfUrl: pdfPath,
            status: 'generated',
          });
          generatedCerts.push(cert);
        } catch (e: any) {
          console.error(`Failed to generate certificate for student ${student.id}:`, e.message);
        }
      }
      
      res.json({ generated: generatedCerts.length, total: students.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/certificates/generate-all", isAuthenticated, async (req, res) => {
    try {
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.status(400).json({ message: "No active exam year found" });
      }

      const students = await storage.getAllStudents();
      const generatedCerts = [];
      
      for (const student of students) {
        if (student.status !== 'approved') continue;
        if (![6, 9, 12].includes(student.grade)) continue;
        
        const certNumber = `${activeExamYear.year.toString().slice(-2)}/${String(student.id).padStart(8, '0')}`;
        try {
          const cert = await storage.createCertificate({
            studentId: student.id,
            examYearId: activeExamYear.id,
            certificateNumber: certNumber,
            grade: student.grade,
            templateType: student.gender,
            issuedDate: new Date(),
            status: 'pending',
          });
          generatedCerts.push(cert);
        } catch (e) {
          // Skip duplicates
        }
      }
      
      res.json({ generated: generatedCerts.length, total: students.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Transcripts API
  app.get("/api/transcripts", async (req, res) => {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      
      let transcripts;
      if (studentId) {
        transcripts = await storage.getTranscriptsByStudent(studentId);
      } else if (examYearId) {
        transcripts = await storage.getTranscriptsByExamYear(examYearId);
      } else {
        const activeExamYear = await storage.getActiveExamYear();
        if (activeExamYear) {
          transcripts = await storage.getTranscriptsByExamYear(activeExamYear.id);
        } else {
          transcripts = [];
        }
      }
      res.json(transcripts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Transcript Generation Endpoints
  app.post("/api/transcripts/generate", isAuthenticated, async (req, res) => {
    try {
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "studentIds array is required" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.status(400).json({ message: "No active exam year found" });
      }

      const { generateTranscriptPDF, generateQRToken } = await import('./certificateService');

      const generatedTranscripts = [];
      for (const studentId of studentIds) {
        const student = await storage.getStudent(studentId);
        if (!student) continue;
        
        const school = await storage.getSchool(student.schoolId);
        if (!school) continue;
        
        const results = await storage.getResultsByStudent(studentId);
        const allSubjects = await storage.getAllSubjects();
        
        // Filter subjects by student's grade level for proper transcript display
        const gradeSubjects = allSubjects.filter(s => s.grade === student.grade);
        
        const subjects = results.map(r => {
          const subject = gradeSubjects.find(s => s.id === r.subjectId) || allSubjects.find(s => s.id === r.subjectId);
          return {
            name: subject?.name || 'Unknown',
            arabicName: subject?.arabicName || null,
            score: parseFloat(r.totalScore || '0'),
            grade: r.grade || 'N/A',
            maxScore: subject?.maxScore || 100,
            passingScore: subject?.passingScore || 50,
          };
        });
        
        const totalScore = subjects.reduce((sum, s) => sum + s.score, 0);
        const maxTotal = subjects.reduce((sum, s) => sum + s.maxScore, 0);
        const average = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
        
        let finalGrade = 'PASS';
        if (average >= 80) finalGrade = 'A';
        else if (average >= 70) finalGrade = 'B';
        else if (average >= 60) finalGrade = 'C';
        else if (average >= 50) finalGrade = 'D';
        else finalGrade = 'FAIL';
        
        const qrToken = generateQRToken();
        const transcriptNumber = `TR-${activeExamYear.year}-${String(student.id).padStart(6, '0')}`;
        const verifyUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://amaanah.repl.co'}/verify/transcript/${qrToken}`;
        
        try {
          const pdfPath = await generateTranscriptPDF({
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              middleName: student.middleName,
              gender: student.gender as 'male' | 'female',
              dateOfBirth: student.dateOfBirth,
              placeOfBirth: student.placeOfBirth,
              grade: student.grade,
              indexNumber: student.indexNumber,
            },
            school: { id: school.id, name: school.name },
            examYear: {
              id: activeExamYear.id,
              year: activeExamYear.year,
              examStartDate: activeExamYear.examStartDate,
              examEndDate: activeExamYear.examEndDate,
            },
            subjects,
            totalScore,
            average,
            finalGrade,
            qrToken,
            transcriptNumber,
            verifyUrl,
          });
          
          const transcript = await storage.createTranscript({
            studentId: student.id,
            examYearId: activeExamYear.id,
            transcriptNumber,
            grade: student.grade,
            qrToken,
            pdfUrl: pdfPath,
            issuedDate: new Date(),
          });
          generatedTranscripts.push(transcript);
        } catch (e: any) {
          console.error(`Failed to generate transcript for student ${studentId}:`, e.message);
        }
      }
      
      res.json({ generated: generatedTranscripts.length, transcripts: generatedTranscripts });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/transcripts/generate-school", isAuthenticated, async (req, res) => {
    try {
      const { schoolId } = req.body;
      if (!schoolId) {
        return res.status(400).json({ message: "schoolId is required" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.status(400).json({ message: "No active exam year found" });
      }

      const { generateTranscriptPDF, generateQRToken } = await import('./certificateService');

      const students = await storage.getStudentsBySchool(parseInt(schoolId));
      const school = await storage.getSchool(parseInt(schoolId));
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      const allSubjects = await storage.getAllSubjects();
      const generatedTranscripts = [];
      
      for (const student of students) {
        if (student.status !== 'approved') continue;
        
        const results = await storage.getResultsByStudent(student.id);
        if (results.length === 0) continue;
        
        // Filter subjects by student's grade level for proper transcript display
        const gradeSubjects = allSubjects.filter(s => s.grade === student.grade);
        
        const subjects = results.map(r => {
          const subject = gradeSubjects.find(s => s.id === r.subjectId) || allSubjects.find(s => s.id === r.subjectId);
          return {
            name: subject?.name || 'Unknown',
            arabicName: subject?.arabicName || null,
            score: parseFloat(r.totalScore || '0'),
            grade: r.grade || 'N/A',
            maxScore: subject?.maxScore || 100,
            passingScore: subject?.passingScore || 50,
          };
        });
        
        const totalScore = subjects.reduce((sum, s) => sum + s.score, 0);
        const maxTotal = subjects.reduce((sum, s) => sum + s.maxScore, 0);
        const average = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
        
        let finalGrade = 'PASS';
        if (average >= 80) finalGrade = 'A';
        else if (average >= 70) finalGrade = 'B';
        else if (average >= 60) finalGrade = 'C';
        else if (average >= 50) finalGrade = 'D';
        else finalGrade = 'FAIL';
        
        const qrToken = generateQRToken();
        const transcriptNumber = `TR-${activeExamYear.year}-${String(student.id).padStart(6, '0')}`;
        const verifyUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://amaanah.repl.co'}/verify/transcript/${qrToken}`;
        
        try {
          const pdfPath = await generateTranscriptPDF({
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              middleName: student.middleName,
              gender: student.gender as 'male' | 'female',
              dateOfBirth: student.dateOfBirth,
              placeOfBirth: student.placeOfBirth,
              grade: student.grade,
              indexNumber: student.indexNumber,
            },
            school: { id: school.id, name: school.name },
            examYear: {
              id: activeExamYear.id,
              year: activeExamYear.year,
              examStartDate: activeExamYear.examStartDate,
              examEndDate: activeExamYear.examEndDate,
            },
            subjects,
            totalScore,
            average,
            finalGrade,
            qrToken,
            transcriptNumber,
            verifyUrl,
          });
          
          const transcript = await storage.createTranscript({
            studentId: student.id,
            examYearId: activeExamYear.id,
            transcriptNumber,
            grade: student.grade,
            qrToken,
            pdfUrl: pdfPath,
            issuedDate: new Date(),
          });
          generatedTranscripts.push(transcript);
        } catch (e: any) {
          console.error(`Failed to generate transcript for student ${student.id}:`, e.message);
        }
      }
      
      res.json({ generated: generatedTranscripts.length, total: students.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Verification Endpoints
  app.get("/api/verify/certificate/:token", async (req, res) => {
    try {
      const certificate = await storage.getCertificateByQrToken(req.params.token);
      if (!certificate) {
        return res.status(404).json({ valid: false, message: "Certificate not found or invalid" });
      }
      
      const student = await storage.getStudent(certificate.studentId);
      const examYear = await storage.getExamYear(certificate.examYearId);
      
      res.json({
        valid: true,
        certificate: {
          certificateNumber: certificate.certificateNumber,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          grade: certificate.grade,
          examYear: examYear?.year,
          finalResult: certificate.finalResult,
          issuedDate: certificate.issuedDate,
          status: certificate.status,
        }
      });
    } catch (error: any) {
      res.status(500).json({ valid: false, message: error.message });
    }
  });

  app.get("/api/verify/transcript/:token", async (req, res) => {
    try {
      const transcript = await storage.getTranscriptByQrToken(req.params.token);
      if (!transcript) {
        return res.status(404).json({ valid: false, message: "Transcript not found or invalid" });
      }
      
      const student = await storage.getStudent(transcript.studentId);
      const examYear = await storage.getExamYear(transcript.examYearId);
      
      res.json({
        valid: true,
        transcript: {
          transcriptNumber: transcript.transcriptNumber,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          grade: transcript.grade,
          examYear: examYear?.year,
          issuedDate: transcript.issuedDate,
        }
      });
    } catch (error: any) {
      res.status(500).json({ valid: false, message: error.message });
    }
  });

  // Download Endpoints
  app.get("/api/certificates/:id/download", async (req, res) => {
    try {
      const certificate = await storage.getCertificate(parseInt(req.params.id));
      if (!certificate || !certificate.pdfUrl) {
        return res.status(404).json({ message: "Certificate PDF not found" });
      }
      
      const fs = await import('fs');
      const path = await import('path');
      
      if (!fs.existsSync(certificate.pdfUrl)) {
        return res.status(404).json({ message: "PDF file not found" });
      }
      
      await storage.incrementCertificatePrintCount(certificate.id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateNumber.replace('/', '-')}.pdf"`);
      fs.createReadStream(certificate.pdfUrl).pipe(res);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/transcripts/:id/download", async (req, res) => {
    try {
      const transcript = await storage.getTranscript(parseInt(req.params.id));
      if (!transcript || !transcript.pdfUrl) {
        return res.status(404).json({ message: "Transcript PDF not found" });
      }
      
      const fs = await import('fs');
      
      if (!fs.existsSync(transcript.pdfUrl)) {
        return res.status(404).json({ message: "PDF file not found" });
      }
      
      await storage.incrementTranscriptPrintCount(transcript.id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${transcript.transcriptNumber.replace('/', '-')}.pdf"`);
      fs.createReadStream(transcript.pdfUrl).pipe(res);
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

  // Seed dummy data (dev only)
  app.post("/api/seed/dummy-data", isAuthenticated, async (req, res) => {
    try {
      // Create exam year
      const examYear = await storage.createExamYear({
        year: 2025,
        name: "Academic Year 2024-2025",
        hijriYear: "1446",
        isActive: true,
        registrationStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        registrationEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        examStartDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        examEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      });

      // Create regions
      const region1 = await storage.createRegion({ name: "Northern Region", code: "NR" });
      const region2 = await storage.createRegion({ name: "Southern Region", code: "SR" });

      // Create clusters
      const cluster1 = await storage.createCluster({ name: "Cluster 1", code: "C1", regionId: region1.id });
      const cluster2 = await storage.createCluster({ name: "Cluster 2", code: "C2", regionId: region2.id });

      // Create exam centers
      const center1 = await storage.createExamCenter({
        name: "Main Center North",
        code: "MCN001",
        address: "123 Main Street, North City",
        regionId: region1.id,
        clusterId: cluster1.id,
        capacity: 500,
        contactPerson: "Ahmed Al-Mansuri",
        contactPhone: "+966501234567",
        contactEmail: "center1@amaanah.local",
        isActive: true,
      });

      const center2 = await storage.createExamCenter({
        name: "Main Center South",
        code: "MCS001",
        address: "456 South Avenue, South City",
        regionId: region2.id,
        clusterId: cluster2.id,
        capacity: 400,
        contactPerson: "Fatima Al-Rashid",
        contactPhone: "+966502345678",
        contactEmail: "center2@amaanah.local",
        isActive: true,
      });

      // Create schools
      const school1 = await storage.createSchool({
        name: "Al-Noor Academy",
        registrarName: "Mohammad Hassan",
        email: "school1@amaanah.local",
        phone: "+966509876543",
        address: "789 Education Lane, North City",
        schoolType: "secondary",
        regionId: region1.id,
        clusterId: cluster1.id,
        preferredCenterId: center1.id,
        assignedCenterId: center1.id,
        status: "approved",
        isEmailVerified: true,
      });

      const school2 = await storage.createSchool({
        name: "Sunlight Institute",
        registrarName: "Layla Ahmed",
        email: "school2@amaanah.local",
        phone: "+966508765432",
        address: "321 Learning Street, South City",
        schoolType: "primary",
        regionId: region2.id,
        clusterId: cluster2.id,
        preferredCenterId: center2.id,
        assignedCenterId: center2.id,
        status: "approved",
        isEmailVerified: true,
      });

      // Create subjects
      const subject1 = await storage.createSubject({
        name: "Arabic Language",
        code: "ARL",
        description: "Arabic language examination",
        examYearId: examYear.id,
      });

      const subject2 = await storage.createSubject({
        name: "Islamic Studies",
        code: "IES",
        description: "Islamic studies examination",
        examYearId: examYear.id,
      });

      res.json({
        message: "Dummy data created successfully",
        examYear,
        regions: [region1, region2],
        clusters: [cluster1, cluster2],
        centers: [center1, center2],
        schools: [school1, school2],
        subjects: [subject1, subject2],
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System Settings API
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      // Convert array of {key, value} to object
      const settingsObj: Record<string, any> = {};
      for (const setting of allSettings) {
        try {
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      }
      res.json(settingsObj);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || !['super_admin', 'examination_admin'].includes(currentUser.role || '')) {
        return res.status(403).json({ message: "Only admins can update settings" });
      }
      
      // Save each key-value pair
      const { key, value, description, category } = req.body;
      if (key && value !== undefined) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await storage.upsertSetting(key, valueStr, description, category);
      }
      
      // Return all settings
      const allSettings = await storage.getAllSettings();
      const settingsObj: Record<string, any> = {};
      for (const setting of allSettings) {
        try {
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      }
      res.json(settingsObj);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PUBLIC API ENDPOINTS (No authentication required) =====
  
  // Public school registration
  app.post("/api/public/school-registration", async (req, res) => {
    try {
      const { 
        schoolName, 
        schoolType, 
        region, 
        address, 
        email, 
        phone, 
        principalName, 
        principalEmail, 
        principalPhone,
        studentCount,
        affiliatedOrganization,
        additionalInfo 
      } = req.body;

      // Basic validation
      if (!schoolName || !schoolType || !region || !email || !phone || !principalName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email already exists
      const existingSchools = await storage.getSchools();
      const emailExists = existingSchools.some(s => s.email?.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return res.status(400).json({ message: "A school with this email already exists" });
      }

      // Find existing region only (do not create new regions for security)
      const regions = await storage.getRegions();
      const regionRecord = regions.find(r => r.name === region);
      if (!regionRecord) {
        return res.status(400).json({ message: "Invalid region selected. Please select a valid region." });
      }

      // Generate verification token
      const verificationToken = `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create school with pending status
      const school = await storage.createSchool({
        name: schoolName,
        registrarName: principalName,
        email,
        phone,
        address,
        schoolType: schoolType.toLowerCase().replace(/\s+/g, '_'),
        regionId: regionRecord.id,
        status: "pending",
        isEmailVerified: false,
        verificationToken,
        notes: JSON.stringify({
          principalEmail,
          principalPhone,
          studentCount,
          affiliatedOrganization,
          additionalInfo,
          registeredAt: new Date().toISOString(),
        }),
      });

      // In production, send verification email here
      console.log(`School registration: ${schoolName} - Verification token: ${verificationToken}`);

      res.json({ 
        message: "Registration submitted successfully. Please check your email for verification.",
        schoolId: school.id,
      });
    } catch (error: any) {
      console.error("School registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // Email verification endpoint
  app.get("/api/public/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const schools = await storage.getSchools();
      const school = schools.find(s => s.verificationToken === token);

      if (!school) {
        return res.status(404).json({ message: "Invalid or expired verification token" });
      }

      // Update school to verified
      await storage.updateSchool(school.id, {
        isEmailVerified: true,
        verificationToken: null,
      });

      res.json({ message: "Email verified successfully. Your registration is now pending approval." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public result checker
  app.get("/api/public/results/:indexNumber", async (req, res) => {
    try {
      const { indexNumber } = req.params;

      // Find student by index number using dedicated method if available
      const students = await storage.getStudents();
      const student = students.find(s => s.indexNumber?.toUpperCase() === indexNumber.toUpperCase());

      if (!student) {
        return res.status(404).json({ message: "No results found for this index number" });
      }

      // Get student's school
      const school = student.schoolId ? await storage.getSchool(student.schoolId) : null;

      // Get student's results using the correct storage method
      const allResults = await storage.getResultsByStudent(student.id) || [];
      
      // Filter only published results for public access
      const publishedResults = allResults.filter(r => r.status === 'published');
      
      if (publishedResults.length === 0) {
        return res.status(404).json({ message: "No published results found for this index number" });
      }

      // Get subjects for result details (include Arabic names)
      const subjects = await storage.getSubjects();
      const subjectMap = new Map(subjects.map(s => [s.id, s]));

      // Get exam year
      const examYears = await storage.getExamYears();
      const examYear = examYears.find(ey => ey.id === student.examYearId);

      // Grade level names for bilingual display
      const gradeLevelNames: Record<number, { en: string; ar: string }> = {
        1: { en: 'Grade 1 - Lower Basic', ar: 'الصف الأول - المرحلة الابتدائية الدنيا' },
        2: { en: 'Grade 2 - Lower Basic', ar: 'الصف الثاني - المرحلة الابتدائية الدنيا' },
        3: { en: 'Grade 3 - Lower Basic', ar: 'الصف الثالث - المرحلة الابتدائية الدنيا' },
        4: { en: 'Grade 4 - Upper Basic', ar: 'الصف الرابع - المرحلة الابتدائية العليا' },
        5: { en: 'Grade 5 - Upper Basic', ar: 'الصف الخامس - المرحلة الابتدائية العليا' },
        6: { en: 'Grade 6 - Upper Basic', ar: 'الصف السادس - المرحلة الابتدائية العليا' },
        7: { en: 'Grade 7 - Basic Cycle', ar: 'الصف السابع - المرحلة الإعدادية' },
        8: { en: 'Grade 8 - Basic Cycle', ar: 'الصف الثامن - المرحلة الإعدادية' },
        9: { en: 'Grade 9 - Basic Cycle', ar: 'الصف التاسع - المرحلة الإعدادية' },
        10: { en: 'Grade 10 - Senior Secondary', ar: 'الصف العاشر - المرحلة الثانوية' },
        11: { en: 'Grade 11 - Senior Secondary', ar: 'الصف الحادي عشر - المرحلة الثانوية' },
        12: { en: 'Grade 12 - Senior Secondary', ar: 'الصف الثاني عشر - المرحلة الثانوية' },
      };

      // Format results with bilingual subject names
      const formattedResults = publishedResults.map(result => {
        const subject = subjectMap.get(result.subjectId);
        const passingScore = subject?.passingScore || 50;
        const score = result.rawScore || 0;
        return {
          subjectEn: subject?.name || "Unknown Subject",
          subjectAr: subject?.arabicName || subject?.name || "مادة غير معروفة",
          score: score,
          maxScore: 100,
          grade: result.grade || 'N/A',
          status: score >= passingScore ? 'PASSED' : 'FAILED',
          statusAr: score >= passingScore ? 'ناجح' : 'راسب',
        };
      });

      // Calculate aggregate (sum of scores)
      const totalScore = formattedResults.reduce((sum, r) => sum + r.score, 0);
      const maxPossibleScore = formattedResults.length * 100;
      const averageScore = formattedResults.length > 0 ? Math.round(totalScore / formattedResults.length) : 0;

      // Determine overall status
      const passedCount = formattedResults.filter(r => r.status === 'PASSED').length;
      const overallStatus = passedCount >= Math.ceil(formattedResults.length * 0.5) ? 'PASSED' : 'FAILED';

      const gradeLevel = gradeLevelNames[student.grade] || { en: `Grade ${student.grade}`, ar: `الصف ${student.grade}` };

      res.json({
        student: {
          indexNumber: student.indexNumber,
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
          fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
          schoolEn: school?.name || 'Unknown School',
          schoolAr: school?.arabicName || school?.name || 'مدرسة غير معروفة',
          grade: student.grade,
          levelEn: gradeLevel.en,
          levelAr: gradeLevel.ar,
          examYear: examYear?.name || 'N/A',
          gender: student.gender,
        },
        results: formattedResults,
        summary: {
          totalScore,
          maxPossibleScore,
          averageScore,
          subjectCount: formattedResults.length,
          passedCount,
          failedCount: formattedResults.length - passedCount,
        },
        overallStatus,
        overallStatusAr: overallStatus === 'PASSED' ? 'ناجح' : 'راسب',
      });
    } catch (error: any) {
      console.error("Result lookup error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public result slip PDF download
  app.get("/api/public/results/:indexNumber/pdf", async (req, res) => {
    try {
      const { indexNumber } = req.params;

      // Find student by index number
      const students = await storage.getStudents();
      const student = students.find(s => s.indexNumber?.toUpperCase() === indexNumber.toUpperCase());

      if (!student) {
        return res.status(404).json({ message: "No results found for this index number" });
      }

      // Get student's school
      const school = student.schoolId ? await storage.getSchool(student.schoolId) : null;

      // Get student's results
      const allResults = await storage.getResultsByStudent(student.id) || [];
      const publishedResults = allResults.filter(r => r.status === 'published');
      
      if (publishedResults.length === 0) {
        return res.status(404).json({ message: "No published results found for this index number" });
      }

      // Get subjects
      const subjects = await storage.getSubjects();
      const subjectMap = new Map(subjects.map(s => [s.id, s]));

      // Get exam year
      const examYears = await storage.getExamYears();
      const examYear = examYears.find(ey => ey.id === student.examYearId);

      // Grade level names
      const gradeLevelNames: Record<number, { en: string; ar: string }> = {
        1: { en: 'Grade 1 - Lower Basic', ar: 'الصف الأول - المرحلة الابتدائية الدنيا' },
        2: { en: 'Grade 2 - Lower Basic', ar: 'الصف الثاني - المرحلة الابتدائية الدنيا' },
        3: { en: 'Grade 3 - Lower Basic', ar: 'الصف الثالث - المرحلة الابتدائية الدنيا' },
        4: { en: 'Grade 4 - Upper Basic', ar: 'الصف الرابع - المرحلة الابتدائية العليا' },
        5: { en: 'Grade 5 - Upper Basic', ar: 'الصف الخامس - المرحلة الابتدائية العليا' },
        6: { en: 'Grade 6 - Upper Basic', ar: 'الصف السادس - المرحلة الابتدائية العليا' },
        7: { en: 'Grade 7 - Basic Cycle', ar: 'الصف السابع - المرحلة الإعدادية' },
        8: { en: 'Grade 8 - Basic Cycle', ar: 'الصف الثامن - المرحلة الإعدادية' },
        9: { en: 'Grade 9 - Basic Cycle', ar: 'الصف التاسع - المرحلة الإعدادية' },
        10: { en: 'Grade 10 - Senior Secondary', ar: 'الصف العاشر - المرحلة الثانوية' },
        11: { en: 'Grade 11 - Senior Secondary', ar: 'الصف الحادي عشر - المرحلة الثانوية' },
        12: { en: 'Grade 12 - Senior Secondary', ar: 'الصف الثاني عشر - المرحلة الثانوية' },
      };

      // Format results
      const formattedResults = publishedResults.map(result => {
        const subject = subjectMap.get(result.subjectId);
        const passingScore = subject?.passingScore || 50;
        const score = result.rawScore || 0;
        return {
          subjectEn: subject?.name || "Unknown Subject",
          subjectAr: subject?.arabicName || subject?.name || "مادة غير معروفة",
          score: score,
          maxScore: 100,
          grade: result.grade || 'N/A',
          status: score >= passingScore ? 'PASSED' : 'FAILED',
          statusAr: score >= passingScore ? 'ناجح' : 'راسب',
        };
      });

      // Calculate summary
      const totalScore = formattedResults.reduce((sum, r) => sum + r.score, 0);
      const maxPossibleScore = formattedResults.length * 100;
      const averageScore = formattedResults.length > 0 ? Math.round(totalScore / formattedResults.length) : 0;
      const passedCount = formattedResults.filter(r => r.status === 'PASSED').length;
      const overallStatus = passedCount >= Math.ceil(formattedResults.length * 0.5) ? 'PASSED' : 'FAILED';

      const gradeLevel = gradeLevelNames[student.grade] || { en: `Grade ${student.grade}`, ar: `الصف ${student.grade}` };

      // Import and generate PDF
      const { generateResultSlipPDF } = await import('./certificateService');
      
      const pdfPath = await generateResultSlipPDF({
        student: {
          indexNumber: student.indexNumber,
          fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
          schoolEn: school?.name || 'Unknown School',
          schoolAr: school?.arabicName || school?.name || 'مدرسة غير معروفة',
          grade: student.grade,
          levelEn: gradeLevel.en,
          levelAr: gradeLevel.ar,
          examYear: examYear?.name || 'N/A',
        },
        results: formattedResults,
        summary: {
          totalScore,
          maxPossibleScore,
          averageScore,
          subjectCount: formattedResults.length,
          passedCount,
          failedCount: formattedResults.length - passedCount,
        },
        overallStatus,
        overallStatusAr: overallStatus === 'PASSED' ? 'ناجح' : 'راسب',
      });

      // Send the PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="result_slip_${indexNumber}.pdf"`);
      
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(pdfPath);
      res.send(pdfBuffer);

      // Clean up the file after sending
      fs.unlinkSync(pdfPath);
    } catch (error: any) {
      console.error("Result slip PDF generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public newsletter subscription
  app.post("/api/public/newsletter/subscribe", async (req, res) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if already subscribed
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        if (existing.isActive) {
          return res.status(400).json({ message: "You are already subscribed to our newsletter" });
        } else {
          // Reactivate subscription
          await storage.updateNewsletterSubscriber(existing.id, { isActive: true, name });
          return res.json({ message: "Welcome back! Your subscription has been reactivated." });
        }
      }

      await storage.createNewsletterSubscriber({ email, name, source: "website" });
      res.json({ message: "Thank you for subscribing to our newsletter!" });
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public unsubscribe
  app.post("/api/public/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      await storage.unsubscribeNewsletter(email);
      res.json({ message: "You have been unsubscribed from our newsletter" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public news articles
  app.get("/api/public/news", async (_req, res) => {
    try {
      const articles = await storage.getPublishedNewsArticles();
      const categories = await storage.getAllNewsCategories();
      res.json({ articles, categories });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/public/news/:slug", async (req, res) => {
    try {
      const article = await storage.getNewsArticleBySlug(req.params.slug);
      if (!article || !article.isPublished) {
        return res.status(404).json({ message: "Article not found" });
      }
      // Increment view count
      await storage.incrementNewsArticleViewCount(article.id);
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public resources
  app.get("/api/public/resources", async (_req, res) => {
    try {
      const resources = await storage.getPublishedResources();
      const categories = await storage.getAllResourceCategories();
      res.json({ resources, categories });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/public/resources/:id/download", async (req, res) => {
    try {
      const resource = await storage.getResource(parseInt(req.params.id));
      if (!resource || !resource.isPublished) {
        return res.status(404).json({ message: "Resource not found" });
      }
      // Increment download count
      await storage.incrementResourceDownloadCount(resource.id);
      res.json({ fileUrl: resource.fileUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public announcements
  app.get("/api/public/announcements", async (_req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public impact stats
  app.get("/api/public/impact-stats", async (_req, res) => {
    try {
      const stats = await storage.getActiveImpactStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public statistics query endpoint
  app.get("/api/public/statistics", async (req, res) => {
    try {
      const category = req.query.category as string || 'students';
      const groupBy = req.query.groupBy as string || 'region';
      const regionId = req.query.regionId as string;

      interface StatResult {
        label: string;
        count: number;
      }

      let results: StatResult[] = [];
      let total = 0;
      let availableInEmis = true;

      // Check if this is data that needs to come from EMIS
      const emisRequiredData = ['ethnicity', 'shift', 'qualification'];
      if (emisRequiredData.includes(groupBy)) {
        availableInEmis = false;
        return res.json({
          results: [],
          total: 0,
          groupBy: groupBy,
          category: category,
          availableInEmis: false
        });
      }

      if (category === 'students') {
        const students = await storage.getAllStudents();
        const approvedStudents = students.filter(s => s.status === 'approved');
        total = approvedStudents.length;

        if (groupBy === 'region') {
          const regions = await storage.getAllRegions();
          const schools = await storage.getAllSchools();
          
          const regionCounts: Record<number, number> = {};
          approvedStudents.forEach(student => {
            const school = schools.find(s => s.id === student.schoolId);
            if (school?.regionId) {
              regionCounts[school.regionId] = (regionCounts[school.regionId] || 0) + 1;
            }
          });

          results = regions.map(region => ({
            label: region.name,
            count: regionCounts[region.id] || 0
          })).filter(r => r.count > 0);
        } else if (groupBy === 'cluster') {
          const clusters = await storage.getAllClusters();
          const schools = await storage.getAllSchools();
          
          let filteredClusters = clusters;
          if (regionId && regionId !== 'all') {
            filteredClusters = clusters.filter(c => c.regionId === parseInt(regionId));
          }
          
          const clusterCounts: Record<number, number> = {};
          approvedStudents.forEach(student => {
            const school = schools.find(s => s.id === student.schoolId);
            if (school?.clusterId) {
              clusterCounts[school.clusterId] = (clusterCounts[school.clusterId] || 0) + 1;
            }
          });

          results = filteredClusters.map(cluster => ({
            label: cluster.name,
            count: clusterCounts[cluster.id] || 0
          })).filter(r => r.count > 0);
        } else if (groupBy === 'school') {
          const schools = await storage.getAllSchools();
          
          let filteredSchools = schools;
          if (regionId && regionId !== 'all') {
            filteredSchools = schools.filter(s => s.regionId === parseInt(regionId));
          }
          
          const schoolCounts: Record<number, number> = {};
          approvedStudents.forEach(student => {
            schoolCounts[student.schoolId] = (schoolCounts[student.schoolId] || 0) + 1;
          });

          results = filteredSchools
            .filter(school => schoolCounts[school.id])
            .map(school => ({
              label: school.name,
              count: schoolCounts[school.id] || 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        } else if (groupBy === 'gender') {
          const genderCounts: Record<string, number> = { male: 0, female: 0 };
          approvedStudents.forEach(student => {
            if (student.gender) {
              genderCounts[student.gender] = (genderCounts[student.gender] || 0) + 1;
            }
          });

          results = [
            { label: 'Male', count: genderCounts.male },
            { label: 'Female', count: genderCounts.female }
          ];
        }
      } else if (category === 'teachers') {
        // Teachers data - will be fetched from EMIS later
        availableInEmis = false;
        return res.json({
          results: [],
          total: 0,
          groupBy: groupBy,
          category: category,
          availableInEmis: false
        });
      } else if (category === 'schools') {
        const schools = await storage.getAllSchools();
        const approvedSchools = schools.filter(s => s.status === 'approved');
        total = approvedSchools.length;

        if (groupBy === 'region') {
          const regions = await storage.getAllRegions();
          
          const regionCounts: Record<number, number> = {};
          approvedSchools.forEach(school => {
            if (school.regionId) {
              regionCounts[school.regionId] = (regionCounts[school.regionId] || 0) + 1;
            }
          });

          results = regions.map(region => ({
            label: region.name,
            count: regionCounts[region.id] || 0
          })).filter(r => r.count > 0);
        } else if (groupBy === 'cluster') {
          const clusters = await storage.getAllClusters();
          
          let filteredClusters = clusters;
          if (regionId && regionId !== 'all') {
            filteredClusters = clusters.filter(c => c.regionId === parseInt(regionId));
          }
          
          const clusterCounts: Record<number, number> = {};
          approvedSchools.forEach(school => {
            if (school.clusterId) {
              clusterCounts[school.clusterId] = (clusterCounts[school.clusterId] || 0) + 1;
            }
          });

          results = filteredClusters.map(cluster => ({
            label: cluster.name,
            count: clusterCounts[cluster.id] || 0
          })).filter(r => r.count > 0);
        }
      }

      res.json({
        results,
        total,
        groupBy: `by ${groupBy}`,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        availableInEmis
      });
    } catch (error: any) {
      console.error("Statistics query error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== WEBSITE CONTENT MANAGEMENT (Admin endpoints) =====
  // Helper function to check CMS admin role
  async function checkCmsAdminRole(req: Request): Promise<{ authorized: boolean; user?: any }> {
    if (!req.session.userId) return { authorized: false };
    const user = await storage.getUser(req.session.userId);
    if (!user || !["super_admin", "examination_admin"].includes(user.role || "")) {
      return { authorized: false };
    }
    return { authorized: true, user };
  }

  // News Categories
  app.get("/api/cms/news-categories", isAuthenticated, async (_req, res) => {
    try {
      const categories = await storage.getAllNewsCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cms/news-categories", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const category = await storage.createNewsCategory(req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cms/news-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const category = await storage.updateNewsCategory(parseInt(req.params.id), req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/news-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteNewsCategory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // News Articles
  app.get("/api/cms/news-articles", isAuthenticated, async (_req, res) => {
    try {
      const articles = await storage.getAllNewsArticles();
      res.json(articles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cms/news-articles/:id", isAuthenticated, async (req, res) => {
    try {
      const article = await storage.getNewsArticle(parseInt(req.params.id));
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cms/news-articles", isAuthenticated, async (req, res) => {
    try {
      const { authorized, user } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const article = await storage.createNewsArticle({
        ...req.body,
        authorId: user?.id,
        publishedAt: req.body.isPublished ? new Date() : null,
      });
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cms/news-articles/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const existing = await storage.getNewsArticle(parseInt(req.params.id));
      const article = await storage.updateNewsArticle(parseInt(req.params.id), {
        ...req.body,
        publishedAt: req.body.isPublished && !existing?.publishedAt ? new Date() : existing?.publishedAt,
      });
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/news-articles/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteNewsArticle(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Resource Categories
  app.get("/api/cms/resource-categories", isAuthenticated, async (_req, res) => {
    try {
      const categories = await storage.getAllResourceCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cms/resource-categories", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const category = await storage.createResourceCategory(req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cms/resource-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const category = await storage.updateResourceCategory(parseInt(req.params.id), req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/resource-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteResourceCategory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Resources
  app.get("/api/cms/resources", isAuthenticated, async (_req, res) => {
    try {
      const resources = await storage.getAllResources();
      res.json(resources);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cms/resources/:id", isAuthenticated, async (req, res) => {
    try {
      const resource = await storage.getResource(parseInt(req.params.id));
      res.json(resource);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cms/resources", isAuthenticated, async (req, res) => {
    try {
      const { authorized, user } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const resource = await storage.createResource({
        ...req.body,
        uploadedBy: user?.id,
      });
      res.json(resource);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cms/resources/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const resource = await storage.updateResource(parseInt(req.params.id), req.body);
      res.json(resource);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/resources/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteResource(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Announcements
  app.get("/api/cms/announcements", isAuthenticated, async (_req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cms/announcements/:id", isAuthenticated, async (req, res) => {
    try {
      const announcement = await storage.getAnnouncement(parseInt(req.params.id));
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cms/announcements", isAuthenticated, async (req, res) => {
    try {
      const { authorized, user } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const announcement = await storage.createAnnouncement({
        ...req.body,
        createdBy: user?.id,
      });
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cms/announcements/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const announcement = await storage.updateAnnouncement(parseInt(req.params.id), req.body);
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/announcements/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteAnnouncement(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Newsletter Subscribers (Admin)
  app.get("/api/cms/newsletter-subscribers", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const subscribers = await storage.getAllNewsletterSubscribers();
      res.json(subscribers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/newsletter-subscribers/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteNewsletterSubscriber(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Impact Stats
  app.get("/api/cms/impact-stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getAllImpactStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cms/impact-stats", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const stat = await storage.createImpactStat(req.body);
      res.json(stat);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cms/impact-stats/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      const stat = await storage.updateImpactStat(parseInt(req.params.id), req.body);
      res.json(stat);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cms/impact-stats/:id", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteImpactStat(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Object Storage - File Upload Routes
  const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");

  // Get upload URL for file upload
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { authorized } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });

      const { filename } = req.body;
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL(filename);
      res.json({ uploadURL, objectPath });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Finalize resource upload - set ACL and update database
  app.post("/api/cms/resources/finalize", isAuthenticated, async (req, res) => {
    try {
      const { authorized, user } = await checkCmsAdminRole(req);
      if (!authorized) return res.status(403).json({ message: "Not authorized" });

      const { uploadURL, title, description, fileType, fileSize, categoryId, isPublished, originalFilename } = req.body;

      if (!uploadURL) {
        return res.status(400).json({ message: "uploadURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: user?.id || "system",
          visibility: "public",
        }
      );

      const resource = await storage.createResource({
        title: title || originalFilename || "Untitled Resource",
        description,
        fileUrl: objectPath,
        fileType: fileType || getFileTypeFromName(originalFilename),
        fileSize: fileSize || 0,
        categoryId: categoryId ? parseInt(categoryId) : null,
        isPublished: isPublished ?? false,
        uploadedBy: user?.id,
      });

      res.json(resource);
    } catch (error: any) {
      console.error("Error finalizing resource:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Serve uploaded objects (public access for published resources)
  app.get("/objects/*", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      const filename = req.query.filename as string | undefined;
      await objectStorageService.downloadObject(objectFile, res, 3600, filename);
    } catch (error: any) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Public Resources API
  app.get("/api/public/resources", async (_req, res) => {
    try {
      const resources = await storage.getPublishedResources();
      const categories = await storage.getAllResourceCategories();
      res.json({ resources, categories });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public resource download - increments download count
  app.get("/api/public/resources/:id/download", async (req, res) => {
    try {
      const resource = await storage.getResource(parseInt(req.params.id));
      if (!resource || !resource.isPublished) {
        return res.status(404).json({ message: "Resource not found" });
      }

      // Increment download count
      await storage.incrementResourceDownloadCount(parseInt(req.params.id));

      // If fileUrl is an object path, redirect to the object
      if (resource.fileUrl?.startsWith("/objects/")) {
        const filename = resource.title ? `${resource.title}.${resource.fileType?.toLowerCase() || 'pdf'}` : undefined;
        return res.redirect(`${resource.fileUrl}${filename ? `?filename=${encodeURIComponent(filename)}` : ''}`);
      }

      // Otherwise redirect to external URL
      if (resource.fileUrl) {
        return res.redirect(resource.fileUrl);
      }

      res.status(404).json({ message: "File not available" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ LOGISTICS MANAGEMENT API ============

  // Paper Movements API
  app.get("/api/paper-movements", isAuthenticated, async (req, res) => {
    try {
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;

      let movements;
      if (centerId && examYearId) {
        movements = await storage.getPaperMovementsByCenter(centerId, examYearId);
      } else if (examYearId) {
        movements = await storage.getPaperMovementsByExamYear(examYearId);
      } else {
        const activeExamYear = await storage.getActiveExamYear();
        if (activeExamYear) {
          movements = await storage.getPaperMovementsByExamYear(activeExamYear.id);
        } else {
          movements = [];
        }
      }
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/paper-movements/:id", isAuthenticated, async (req, res) => {
    try {
      const movement = await storage.getPaperMovement(parseInt(req.params.id));
      if (!movement) {
        return res.status(404).json({ message: "Paper movement not found" });
      }
      res.json(movement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/paper-movements", isAuthenticated, async (req, res) => {
    try {
      const movement = await storage.createPaperMovement(req.body);
      
      // Log the activity
      await storage.createCenterActivityLog({
        centerId: movement.centerId,
        examYearId: movement.examYearId,
        activityType: 'paper_prepared',
        description: `Paper movement record created for ${movement.paperType}`,
        metadata: { movementId: movement.id, paperType: movement.paperType, quantity: movement.quantity },
        performedBy: req.session.userId,
      });
      
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/paper-movements/:id", isAuthenticated, async (req, res) => {
    try {
      const movement = await storage.updatePaperMovement(parseInt(req.params.id), req.body);
      if (!movement) {
        return res.status(404).json({ message: "Paper movement not found" });
      }
      
      // Log status updates
      if (req.body.status) {
        await storage.createCenterActivityLog({
          centerId: movement.centerId,
          examYearId: movement.examYearId,
          activityType: `paper_${req.body.status}`,
          description: `Paper status updated to ${req.body.status}`,
          metadata: { movementId: movement.id, newStatus: req.body.status },
          performedBy: req.session.userId,
        });
      }
      
      res.json(movement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/paper-movements/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePaperMovement(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Script Movements API
  app.get("/api/script-movements", isAuthenticated, async (req, res) => {
    try {
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;

      let movements;
      if (centerId && examYearId) {
        movements = await storage.getScriptMovementsByCenter(centerId, examYearId);
      } else if (examYearId) {
        movements = await storage.getScriptMovementsByExamYear(examYearId);
      } else {
        const activeExamYear = await storage.getActiveExamYear();
        if (activeExamYear) {
          movements = await storage.getScriptMovementsByExamYear(activeExamYear.id);
        } else {
          movements = [];
        }
      }
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/script-movements/:id", isAuthenticated, async (req, res) => {
    try {
      const movement = await storage.getScriptMovement(parseInt(req.params.id));
      if (!movement) {
        return res.status(404).json({ message: "Script movement not found" });
      }
      res.json(movement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/script-movements", isAuthenticated, async (req, res) => {
    try {
      const movement = await storage.createScriptMovement(req.body);
      
      // Log the activity
      await storage.createCenterActivityLog({
        centerId: movement.centerId,
        examYearId: movement.examYearId,
        activityType: 'scripts_collected',
        description: `Script collection record created for grade ${movement.grade}`,
        metadata: { movementId: movement.id, grade: movement.grade, totalScripts: movement.totalScripts },
        performedBy: req.session.userId,
      });
      
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/script-movements/:id", isAuthenticated, async (req, res) => {
    try {
      const movement = await storage.updateScriptMovement(parseInt(req.params.id), req.body);
      if (!movement) {
        return res.status(404).json({ message: "Script movement not found" });
      }
      
      // Log status updates
      if (req.body.status) {
        await storage.createCenterActivityLog({
          centerId: movement.centerId,
          examYearId: movement.examYearId,
          activityType: `scripts_${req.body.status}`,
          description: `Script status updated to ${req.body.status}`,
          metadata: { movementId: movement.id, newStatus: req.body.status },
          performedBy: req.session.userId,
        });
      }
      
      res.json(movement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/script-movements/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteScriptMovement(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Center Assignments API
  app.get("/api/center-assignments", isAuthenticated, async (req, res) => {
    try {
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;

      let assignments;
      if (schoolId && examYearId) {
        const assignment = await storage.getCenterAssignmentBySchool(schoolId, examYearId);
        assignments = assignment ? [assignment] : [];
      } else if (centerId && examYearId) {
        assignments = await storage.getCenterAssignmentsByCenter(centerId, examYearId);
      } else if (examYearId) {
        assignments = await storage.getCenterAssignmentsByExamYear(examYearId);
      } else {
        const activeExamYear = await storage.getActiveExamYear();
        if (activeExamYear) {
          assignments = await storage.getCenterAssignmentsByExamYear(activeExamYear.id);
        } else {
          assignments = [];
        }
      }
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/center-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.getCenterAssignment(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Center assignment not found" });
      }
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/center-assignments", isAuthenticated, async (req, res) => {
    try {
      // Check if assignment already exists
      const existing = await storage.getCenterAssignmentBySchool(req.body.schoolId, req.body.examYearId);
      if (existing) {
        return res.status(400).json({ message: "School already assigned to a center for this exam year" });
      }

      const assignment = await storage.createCenterAssignment({
        ...req.body,
        assignedBy: req.session.userId,
        assignedAt: new Date(),
      });

      // Also update school's assignedCenterId
      await storage.updateSchool(req.body.schoolId, { assignedCenterId: req.body.centerId });

      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/center-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.updateCenterAssignment(parseInt(req.params.id), req.body);
      if (!assignment) {
        return res.status(404).json({ message: "Center assignment not found" });
      }

      // Update school's assignedCenterId if center changed
      if (req.body.centerId) {
        await storage.updateSchool(assignment.schoolId, { assignedCenterId: req.body.centerId });
      }

      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/center-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.getCenterAssignment(parseInt(req.params.id));
      if (assignment) {
        // Clear school's assignedCenterId
        await storage.updateSchool(assignment.schoolId, { assignedCenterId: null as any });
      }
      await storage.deleteCenterAssignment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-assign schools to centers based on cluster/region/capacity
  app.post("/api/center-assignments/auto-assign", isAuthenticated, async (req, res) => {
    try {
      const { examYearId } = req.body;
      if (!examYearId) {
        return res.status(400).json({ message: "examYearId is required" });
      }

      const allSchools = await storage.getAllSchools();
      const allCenters = await storage.getAllExamCenters();
      const existingAssignments = await storage.getCenterAssignmentsByExamYear(examYearId);
      const assignedSchoolIds = new Set(existingAssignments.map(a => a.schoolId));

      const unassignedSchools = allSchools.filter(s => 
        s.status === 'approved' && !assignedSchoolIds.has(s.id)
      );

      // Track center capacities
      const centerStudentCounts: Record<number, number> = {};
      for (const center of allCenters) {
        // Count students already assigned to this center
        const studentsAtCenter = await storage.getStudentsByCenter(center.id);
        centerStudentCounts[center.id] = studentsAtCenter.filter(s => s.examYearId === examYearId).length;
      }

      const results = {
        assigned: 0,
        skipped: 0,
        warnings: [] as string[],
      };

      for (const school of unassignedSchools) {
        // Find best center: same cluster > same region > any with capacity
        let bestCenter = null;

        // Priority 1: Same cluster
        const clusterCenters = allCenters.filter(c => 
          c.clusterId === school.clusterId && c.isActive
        );
        for (const center of clusterCenters) {
          const currentCount = centerStudentCounts[center.id] || 0;
          if (currentCount < (center.capacity || 500)) {
            bestCenter = center;
            break;
          }
        }

        // Priority 2: Same region
        if (!bestCenter) {
          const regionCenters = allCenters.filter(c => 
            c.regionId === school.regionId && c.isActive
          );
          for (const center of regionCenters) {
            const currentCount = centerStudentCounts[center.id] || 0;
            if (currentCount < (center.capacity || 500)) {
              bestCenter = center;
              break;
            }
          }
        }

        // Priority 3: Any center with capacity
        if (!bestCenter) {
          for (const center of allCenters.filter(c => c.isActive)) {
            const currentCount = centerStudentCounts[center.id] || 0;
            if (currentCount < (center.capacity || 500)) {
              bestCenter = center;
              break;
            }
          }
        }

        if (bestCenter) {
          await storage.createCenterAssignment({
            examYearId,
            schoolId: school.id,
            centerId: bestCenter.id,
            assignmentMethod: 'auto',
            assignedBy: req.session.userId,
            notes: `Auto-assigned based on cluster/region priority`,
          });
          await storage.updateSchool(school.id, { assignedCenterId: bestCenter.id });
          
          // Update count tracking
          const schoolStudents = await storage.getStudentsBySchool(school.id);
          centerStudentCounts[bestCenter.id] = (centerStudentCounts[bestCenter.id] || 0) + 
            schoolStudents.filter(s => s.examYearId === examYearId).length;
          
          results.assigned++;
        } else {
          results.skipped++;
          results.warnings.push(`No available center for ${school.name}`);
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get assigned center for a specific school
  app.get("/api/center-assignments/school/:schoolId", isAuthenticated, async (req, res) => {
    try {
      const schoolId = parseInt(req.params.schoolId);
      
      // Validate schoolId
      if (isNaN(schoolId) || schoolId <= 0) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      // For school admins, verify they can only access their own school's assignment
      if (req.session.role === 'school_admin' && req.session.schoolId !== schoolId) {
        return res.status(403).json({ message: "You can only view your own school's assignment" });
      }

      const assignments = await storage.getCenterAssignmentsBySchool(schoolId);
      
      if (assignments.length === 0) {
        return res.json(null);
      }

      // Get the most recent active assignment
      const assignment = assignments[0];
      
      // Fetch the center details
      const center = await storage.getExamCenter(assignment.centerId);
      
      res.json({
        ...assignment,
        center,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Center Activity Logs API
  app.get("/api/center-activity-logs", isAuthenticated, async (req, res) => {
    try {
      const centerId = req.query.centerId ? parseInt(req.query.centerId as string) : undefined;
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      const activityType = req.query.activityType as string | undefined;

      if (!centerId) {
        return res.status(400).json({ message: "centerId is required" });
      }

      let logs;
      if (activityType) {
        logs = await storage.getCenterActivityLogsByType(centerId, activityType);
      } else {
        logs = await storage.getCenterActivityLogs(centerId, examYearId);
      }
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/center-activity-logs", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.createCenterActivityLog({
        ...req.body,
        performedBy: req.session.userId,
      });
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced Attendance API - Bulk marking
  app.post("/api/attendance/bulk", isAuthenticated, async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: "records array is required" });
      }

      const createdRecords = [];
      for (const record of records) {
        const created = await storage.createAttendanceRecord({
          ...record,
          recordedBy: req.session.userId,
        });
        createdRecords.push(created);
      }

      // Log the bulk activity
      if (records[0]?.centerId) {
        await storage.createCenterActivityLog({
          centerId: records[0].centerId,
          examYearId: records[0].examYearId,
          activityType: 'bulk_attendance',
          description: `Bulk attendance marked for ${records.length} students`,
          metadata: { count: records.length, subjectId: records[0].subjectId },
          performedBy: req.session.userId,
        });
      }

      res.status(201).json({ created: createdRecords.length, records: createdRecords });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lookup student by index number for attendance
  app.get("/api/attendance/lookup", isAuthenticated, async (req, res) => {
    try {
      const indexNumber = req.query.indexNumber as string;
      if (!indexNumber) {
        return res.status(400).json({ message: "indexNumber is required" });
      }

      const student = await storage.getStudentByIndexNumber(indexNumber);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const school = await storage.getSchool(student.schoolId);
      
      res.json({
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
          indexNumber: student.indexNumber,
          grade: student.grade,
          gender: student.gender,
          schoolId: student.schoolId,
          schoolName: school?.name,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get center dashboard data
  app.get("/api/centers/:id/dashboard", isAuthenticated, async (req, res) => {
    try {
      const centerId = parseInt(req.params.id);
      const examYearId = req.query.examYearId ? parseInt(req.query.examYearId as string) : undefined;
      
      const center = await storage.getExamCenter(centerId);
      if (!center) {
        return res.status(404).json({ message: "Center not found" });
      }

      const activeExamYear = examYearId ? await storage.getExamYear(examYearId) : await storage.getActiveExamYear();
      const yearId = activeExamYear?.id;

      // Get all related data
      const assignments = yearId ? await storage.getCenterAssignmentsByCenter(centerId, yearId) : [];
      const students = await storage.getStudentsByCenter(centerId);
      const timetable = yearId ? await storage.getTimetableByExamYear(yearId) : [];
      const paperMovements = yearId ? await storage.getPaperMovementsByCenter(centerId, yearId) : [];
      const scriptMovements = yearId ? await storage.getScriptMovementsByCenter(centerId, yearId) : [];
      const malpracticeReports = await storage.getMalpracticeReportsByCenter(centerId);
      const activityLogs = await storage.getCenterActivityLogs(centerId, yearId);
      const invigilators = await storage.getAssignmentsByCenter(centerId);

      // Get schools assigned to this center
      const schoolIds = assignments.map(a => a.schoolId);
      const schools = await Promise.all(schoolIds.map(id => storage.getSchool(id)));

      // Calculate statistics
      const totalStudents = yearId ? students.filter(s => s.examYearId === yearId).length : students.length;
      const studentsByGrade = students.reduce((acc: Record<number, number>, s) => {
        if (!yearId || s.examYearId === yearId) {
          acc[s.grade] = (acc[s.grade] || 0) + 1;
        }
        return acc;
      }, {});

      res.json({
        center,
        examYear: activeExamYear,
        statistics: {
          totalSchools: assignments.length,
          totalStudents,
          studentsByGrade,
          totalInvigilators: invigilators.length,
          pendingPapers: paperMovements.filter(p => p.status !== 'returned').length,
          pendingScripts: scriptMovements.filter(s => s.status !== 'stored').length,
          malpracticeCount: malpracticeReports.length,
        },
        schools: schools.filter(Boolean),
        timetable,
        paperMovements,
        scriptMovements,
        malpracticeReports,
        recentActivity: activityLogs.slice(0, 20),
        invigilators,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get school's assigned center info (for school admin/student view)
  app.get("/api/schools/:id/center-info", async (req, res) => {
    try {
      const schoolId = parseInt(req.params.id);
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.json({ center: null, timetable: [], message: "No active exam year" });
      }

      const assignment = await storage.getCenterAssignmentBySchool(schoolId, activeExamYear.id);
      if (!assignment) {
        return res.json({ center: null, timetable: [], message: "No center assigned" });
      }

      const center = await storage.getExamCenter(assignment.centerId);
      const timetable = await storage.getTimetableByExamYear(activeExamYear.id);
      const subjects = await storage.getAllSubjects();

      // Enrich timetable with subject names
      const enrichedTimetable = timetable.map(t => {
        const subject = subjects.find(s => s.id === t.subjectId);
        return {
          ...t,
          subjectName: subject?.name,
          subjectArabicName: subject?.arabicName,
        };
      });

      res.json({
        examYear: activeExamYear,
        center,
        assignment,
        timetable: enrichedTimetable,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

function getFileTypeFromName(filename?: string): string {
  if (!filename) return "Unknown";
  const ext = filename.split('.').pop()?.toUpperCase();
  return ext || "Unknown";
}
