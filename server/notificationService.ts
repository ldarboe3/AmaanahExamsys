import { storage } from "./storage";
import type { InsertNotification } from "@shared/schema";

type NotificationType = 
  | 'registration_deadline'
  | 'payment_reminder'
  | 'result_published'
  | 'school_approved'
  | 'student_approved'
  | 'exam_reminder'
  | 'exam_year_created'
  | 'action_required'
  | 'system_alert';

type UserRole = 'super_admin' | 'examination_admin' | 'logistics_admin' | 'school_admin' | 'examiner' | 'candidate';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    actionUrl?: string;
    examYearId?: number;
    schoolId?: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    [key: string]: any;
  };
}

export async function notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    await storage.createNotification({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
    });
  } catch (error) {
    console.error(`[NotificationService] Failed to notify user ${userId}:`, error);
  }
}

export async function notifyUsersByRole(
  roles: UserRole[],
  payload: NotificationPayload,
  options?: {
    schoolId?: number;
    centerId?: number;
    excludeUserIds?: string[];
  }
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failCount = 0;

  try {
    const allUsers = await storage.getAllUsers();
    
    const targetUsers = allUsers.filter(user => {
      if (!roles.includes(user.role as UserRole)) return false;
      if (user.status !== 'active') return false;
      if (options?.excludeUserIds?.includes(user.id)) return false;
      if (options?.schoolId && user.schoolId !== options.schoolId) return false;
      if (options?.centerId && user.centerId !== options.centerId) return false;
      return true;
    });

    if (targetUsers.length === 0) {
      console.log(`[NotificationService] No users found for roles: ${roles.join(', ')}`);
      return { success: 0, failed: 0 };
    }

    const notifications: InsertNotification[] = targetUsers.map(user => ({
      userId: user.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
    }));

    await storage.createNotificationsBulk(notifications);
    successCount = notifications.length;
    
    console.log(`[NotificationService] Sent ${successCount} notifications to roles: ${roles.join(', ')}`);
  } catch (error) {
    console.error('[NotificationService] Failed to send bulk notifications:', error);
    failCount = 1;
  }

  return { success: successCount, failed: failCount };
}

export async function notifyAllSchoolAdmins(
  payload: NotificationPayload,
  options?: { excludeSchoolIds?: number[] }
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failCount = 0;

  try {
    const approvedSchools = await storage.getSchoolsByStatus('approved');
    const allUsers = await storage.getAllUsers();
    
    const schoolAdminUsers = allUsers.filter(user => {
      if (user.role !== 'school_admin') return false;
      if (user.status !== 'active') return false;
      if (!user.schoolId) return false;
      
      const school = approvedSchools.find(s => s.id === user.schoolId);
      if (!school) return false;
      
      if (options?.excludeSchoolIds?.includes(user.schoolId)) return false;
      
      return true;
    });

    if (schoolAdminUsers.length === 0) {
      console.log('[NotificationService] No school admin users found');
      return { success: 0, failed: 0 };
    }

    const notifications: InsertNotification[] = schoolAdminUsers.map(user => ({
      userId: user.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: {
        ...payload.data,
        schoolId: user.schoolId,
      },
    }));

    await storage.createNotificationsBulk(notifications);
    successCount = notifications.length;
    
    console.log(`[NotificationService] Sent ${successCount} notifications to school admins`);
  } catch (error) {
    console.error('[NotificationService] Failed to notify school admins:', error);
    failCount = 1;
  }

  return { success: successCount, failed: failCount };
}

export async function notifyExamYearCreated(
  examYearName: string,
  examYearId: number,
  registrationEndDate: Date | null,
  createdByUserId: string
): Promise<void> {
  const formattedDeadline = registrationEndDate
    ? registrationEndDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Not set';

  await notifyAllSchoolAdmins({
    type: 'exam_year_created',
    title: `New Examination Year: ${examYearName}`,
    message: `A new examination year has been announced. Registration deadline: ${formattedDeadline}. Please register your students before the deadline to avoid penalties.`,
    data: {
      actionUrl: '/students',
      examYearId,
      priority: 'high',
      registrationDeadline: registrationEndDate?.toISOString(),
    },
  });

  await notifyUsersByRole(['super_admin', 'examination_admin', 'logistics_admin'], {
    type: 'exam_year_created',
    title: `Exam Year Created: ${examYearName}`,
    message: `The examination year "${examYearName}" has been created. Schools have been notified to begin registration.`,
    data: {
      actionUrl: '/exam-years',
      examYearId,
      priority: 'medium',
    },
  }, { excludeUserIds: [createdByUserId] });

  console.log(`[NotificationService] Exam year created notifications sent for: ${examYearName}`);
}

export async function notifyRegistrationDeadlineApproaching(
  examYearId: number,
  examYearName: string,
  daysRemaining: number,
  registrationEndDate: Date
): Promise<void> {
  const isUrgent = daysRemaining < 3;
  const priority = isUrgent ? 'urgent' : (daysRemaining < 7 ? 'high' : 'medium');
  
  const title = isUrgent
    ? `URGENT: Only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left for registration!`
    : `Registration deadline in ${daysRemaining} days`;

  const message = isUrgent
    ? `The registration deadline for ${examYearName} is in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}! Complete student registration immediately to avoid late penalties.`
    : `Reminder: The registration deadline for ${examYearName} is approaching. Please ensure all students are registered before the deadline.`;

  await notifyAllSchoolAdmins({
    type: 'registration_deadline',
    title,
    message,
    data: {
      actionUrl: '/students',
      examYearId,
      daysRemaining,
      priority,
      registrationDeadline: registrationEndDate.toISOString(),
      isUrgent,
    },
  });

  console.log(`[NotificationService] Registration deadline notifications sent: ${daysRemaining} days remaining`);
}

export async function notifySchoolApproved(
  schoolId: number,
  schoolName: string
): Promise<void> {
  await notifyUsersByRole(['school_admin'], {
    type: 'school_approved',
    title: 'School Registration Approved!',
    message: `Congratulations! Your school "${schoolName}" has been approved. You can now register students for examinations.`,
    data: {
      actionUrl: '/students',
      schoolId,
      priority: 'high',
    },
  }, { schoolId });

  await notifyUsersByRole(['super_admin', 'examination_admin'], {
    type: 'school_approved',
    title: `School Approved: ${schoolName}`,
    message: `The school "${schoolName}" has been approved and can now register students.`,
    data: {
      actionUrl: '/schools',
      schoolId,
      priority: 'low',
    },
  });
}

export async function notifyResultsPublished(
  examYearId: number,
  examYearName: string,
  gradeLevel?: number
): Promise<void> {
  const gradeText = gradeLevel ? ` for Grade ${gradeLevel}` : '';
  
  await notifyAllSchoolAdmins({
    type: 'result_published',
    title: `Results Published${gradeText}`,
    message: `Examination results for ${examYearName}${gradeText} have been published. You can now view and download student results and certificates.`,
    data: {
      actionUrl: '/admin-results',
      examYearId,
      gradeLevel,
      priority: 'high',
    },
  });

  console.log(`[NotificationService] Results published notifications sent for ${examYearName}${gradeText}`);
}

export async function notifyPaymentRequired(
  schoolId: number,
  schoolName: string,
  invoiceAmount: number,
  invoiceNumber: string
): Promise<void> {
  await notifyUsersByRole(['school_admin'], {
    type: 'payment_reminder',
    title: 'Payment Required',
    message: `An invoice of GMD ${invoiceAmount.toLocaleString()} has been generated for ${schoolName}. Invoice #: ${invoiceNumber}. Please complete payment to finalize student registration.`,
    data: {
      actionUrl: '/payments',
      schoolId,
      invoiceNumber,
      amount: invoiceAmount,
      priority: 'high',
    },
  }, { schoolId });
}

export async function notifyBankSlipUploaded(
  schoolId: number,
  schoolName: string,
  invoiceNumber: string,
  invoiceAmount: number
): Promise<void> {
  await notifyUsersByRole(['super_admin', 'examination_admin'], {
    type: 'action_required',
    title: `Payment Slip Uploaded: ${schoolName}`,
    message: `${schoolName} has uploaded a payment slip for invoice #${invoiceNumber} (GMD ${invoiceAmount.toLocaleString()}). Please review and confirm the payment.`,
    data: {
      actionUrl: '/payments',
      schoolId,
      invoiceNumber,
      amount: invoiceAmount,
      priority: 'high',
    },
  });
  
  console.log(`[NotificationService] Bank slip upload notification sent for school: ${schoolName}`);
}

export async function notifyPaymentConfirmed(
  schoolId: number,
  schoolName: string,
  invoiceNumber: string,
  invoiceAmount: number,
  studentCount: number
): Promise<void> {
  await notifyUsersByRole(['school_admin'], {
    type: 'payment_reminder',
    title: 'Payment Confirmed - Index Numbers Generated!',
    message: `Your payment for invoice #${invoiceNumber} (GMD ${invoiceAmount.toLocaleString()}) has been confirmed. Index numbers have been generated for ${studentCount} student(s). You can now view and print examination cards from your dashboard.`,
    data: {
      actionUrl: '/students',
      schoolId,
      invoiceNumber,
      studentCount,
      priority: 'high',
    },
  }, { schoolId });
  
  console.log(`[NotificationService] Payment confirmed notification sent to school: ${schoolName}`);
}
