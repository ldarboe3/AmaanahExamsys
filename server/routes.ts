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
      let schools = await storage.getAllSchools();
      
      // Apply filters
      const status = req.query.status as string | undefined;
      const schoolType = req.query.schoolType as string | undefined;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const clusterId = req.query.clusterId ? parseInt(req.query.clusterId as string) : undefined;
      
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
  
  // Bulk school upload
  app.post("/api/schools/bulk-upload", isAuthenticated, async (req, res) => {
    try {
      const { schools: schoolList } = req.body;
      if (!Array.isArray(schoolList)) {
        return res.status(400).json({ message: "schools must be an array" });
      }
      
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as { row: number; email: string; error: string }[]
      };
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      for (let i = 0; i < schoolList.length; i++) {
        const schoolData = schoolList[i];
        try {
          // Check if school already exists
          const existing = await storage.getSchoolByEmail(schoolData.email);
          if (existing) {
            results.skipped++;
            continue;
          }
          
          // Generate verification token with 2-hour expiry
          const verificationToken = generateVerificationToken();
          const verificationExpiry = getVerificationExpiry();
          
          const school = await storage.createSchool({
            ...schoolData,
            verificationToken,
            verificationExpiry,
            status: 'pending',
            isEmailVerified: false,
          });
          
          // Send verification email
          try {
            await sendSchoolVerificationEmail(
              school.email,
              school.name,
              school.registrarName,
              verificationToken,
              baseUrl
            );
          } catch (emailError) {
            console.error(`Failed to send verification email to ${school.email}:`, emailError);
          }
          
          results.created++;
        } catch (error: any) {
          results.errors.push({
            row: i + 1,
            email: schoolData.email || 'unknown',
            error: error.message
          });
        }
      }
      
      res.json({
        message: `Created ${results.created} schools, skipped ${results.skipped} duplicates`,
        ...results
      });
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
      if (!user.schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }
      const school = await storage.getSchool(user.schoolId);
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
      if (!user.schoolId) {
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
      
      const school = await storage.updateSchool(user.schoolId, {
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
      if (!user.schoolId) {
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
      
      const school = await storage.updateSchool(user.schoolId, updateData);
      if (!school) {
        return res.status(500).json({ message: "Failed to update school record with document URL" });
      }

      // Log the action
      await storage.createAuditLog({
        action: 'school_document_uploaded',
        entityType: 'school',
        entityId: user.schoolId.toString(),
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
      if (!user.schoolId) {
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
      
      const school = await storage.updateSchool(user.schoolId, updateData);

      // Log the action
      await storage.createAuditLog({
        action: 'school_document_deleted',
        entityType: 'school',
        entityId: user.schoolId.toString(),
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
      if (!user.schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      const invitations = await storage.getSchoolInvitationsBySchool(user.schoolId);
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
      if (!user.schoolId) {
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
      const existingInvitations = await storage.getSchoolInvitationsBySchool(user.schoolId);
      const pendingInvite = existingInvitations.find(i => i.email === email && !i.isUsed && new Date(i.expiresAt) > new Date());
      if (pendingInvite) {
        return res.status(400).json({ message: "An invitation has already been sent to this email" });
      }

      // Get school info
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Generate token and expiry (48 hours)
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create invitation
      const invitation = await storage.createSchoolInvitation({
        schoolId: user.schoolId,
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
        details: { email, schoolId: user.schoolId },
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
      if (!user.schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getSchoolInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.schoolId !== user.schoolId) {
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
      if (!user.schoolId) {
        return res.status(404).json({ message: "No school associated with this account" });
      }

      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getSchoolInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.schoolId !== user.schoolId) {
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
        details: { email: invitation.email, schoolId: user.schoolId },
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
        const student = await storage.approveStudent(id);
        if (student) approvedStudents.push(student);
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
        if (!user.schoolId) {
          return res.status(400).json({ message: "School admin not associated with a school" });
        }
        schoolId = user.schoolId;
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

  // Get school's invoice for active exam year
  app.get("/api/school/invoice", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== 'school_admin' || !user.schoolId) {
        return res.status(403).json({ message: "Only school admins can access this endpoint" });
      }
      
      const activeExamYear = await storage.getActiveExamYear();
      if (!activeExamYear) {
        return res.json({ invoice: null, message: "No active exam year" });
      }
      
      const invoices = await storage.getInvoicesBySchool(user.schoolId);
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
      if (user.role === 'school_admin' && user.schoolId !== invoice.schoolId) {
        return res.status(403).json({ message: "Not authorized to update this invoice" });
      }
      
      // Prevent uploading slips for already paid invoices
      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Invoice is already paid" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Please upload PDF, JPG, or PNG." });
      }
      
      // Store the file as base64 data URL (for production would use object storage)
      const bankSlipUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Update invoice with bank slip and set to processing status
      const updatedInvoice = await storage.updateInvoice(invoiceId, {
        bankSlipUrl,
        status: 'processing' as any,
      });
      
      res.json({ 
        message: "Bank slip uploaded successfully. Payment is pending verification.",
        invoice: updatedInvoice 
      });
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
      
      // Get count of pending students for this school/exam year
      const allStudents = await storage.getStudentsBySchool(invoice.schoolId);
      const pendingStudents = allStudents.filter(s => 
        s.examYearId === invoice.examYearId && 
        s.status === 'pending'
      );
      
      res.json({
        invoice: paidInvoice,
        message: "Payment confirmed successfully. You can now approve students.",
        pendingStudentsCount: pendingStudents.length
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

  return httpServer;
}

function getFileTypeFromName(filename?: string): string {
  if (!filename) return "Unknown";
  const ext = filename.split('.').pop()?.toUpperCase();
  return ext || "Unknown";
}
