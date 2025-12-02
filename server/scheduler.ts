import { storage } from "./storage";
import {
  sendWeeklyRegistrationReminder,
  sendUrgentRegistrationReminder,
} from "./emailService";

let schedulerInterval: NodeJS.Timeout | null = null;
let lastWeeklyRun: Date | null = null;
let lastDailyRun: Date | null = null;

async function sendScheduledReminders(baseUrl: string) {
  try {
    const activeExamYear = await storage.getActiveExamYear();
    if (!activeExamYear || !activeExamYear.registrationEndDate) {
      return;
    }

    const registrationEndDate = new Date(activeExamYear.registrationEndDate);
    const now = new Date();
    const timeDiff = registrationEndDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (daysRemaining < 0) {
      return;
    }

    const isUrgent = daysRemaining < 3;
    const today = new Date().toDateString();

    if (isUrgent) {
      if (lastDailyRun?.toDateString() === today) {
        return;
      }
      lastDailyRun = new Date();
    } else {
      const dayOfWeek = now.getDay();
      if (dayOfWeek !== 1 && dayOfWeek !== 4) {
        return;
      }
      if (lastWeeklyRun && now.getTime() - lastWeeklyRun.getTime() < 3 * 24 * 60 * 60 * 1000) {
        return;
      }
      lastWeeklyRun = new Date();
    }

    console.log(`[Scheduler] Sending ${isUrgent ? 'urgent daily' : 'weekly'} registration reminders...`);

    const approvedSchools = await storage.getSchoolsByStatus('approved');
    let successCount = 0;
    let failCount = 0;

    for (const school of approvedSchools) {
      try {
        const schoolStudents = await storage.getStudentsBySchool(school.id, activeExamYear.id);
        const registeredStudents = schoolStudents?.length || 0;

        if (isUrgent) {
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
        console.error(`[Scheduler] Failed to send reminder to ${school.email}:`, error);
        failCount++;
      }
    }

    console.log(`[Scheduler] Reminders sent: ${successCount} successful, ${failCount} failed`);
  } catch (error) {
    console.error('[Scheduler] Error running scheduled reminders:', error);
  }
}

export function startScheduler(baseUrl: string) {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] Starting registration reminder scheduler...');

  schedulerInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 8 && now.getMinutes() < 5) {
      sendScheduledReminders(baseUrl);
    }
  }, 5 * 60 * 1000);

  console.log('[Scheduler] Scheduler started - will check every 5 minutes, sending reminders at 8 AM');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Scheduler stopped');
  }
}
