import { db } from "./db";
import { studentResults, students, examYears } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function fireSkyOSExamImportWebhook(
  examYearId: number,
  importedBy: string,
): Promise<void> {
  const baseUrl = process.env.SKYOS_WEBHOOK_URL?.replace(/\/$/, "");
  const apiKey = process.env.SKYOS_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn(
      "[SkyOS] Webhook not configured — set SKYOS_WEBHOOK_URL and SKYOS_API_KEY to enable billing integration",
    );
    return;
  }

  try {
    // Resolve the exam year record to get the integer calendar year
    const [examYear] = await db
      .select()
      .from(examYears)
      .where(eq(examYears.id, examYearId));

    if (!examYear) {
      console.error("[SkyOS] Exam year not found for id:", examYearId);
      return;
    }

    // Count distinct students with at least one published result, grouped by grade
    const gradeCounts = await db
      .select({
        grade: students.grade,
        studentCount: sql<number>`count(distinct ${studentResults.studentId})`,
      })
      .from(studentResults)
      .innerJoin(students, eq(studentResults.studentId, students.id))
      .where(
        and(
          eq(studentResults.examYearId, examYearId),
          eq(studentResults.status, "published"),
        ),
      )
      .groupBy(students.grade);

    // Build grades array — only include grades where studentCount > 0
    const grades = gradeCounts
      .filter((r) => Number(r.grade) > 0 && Number(r.studentCount) > 0)
      .map((r) => ({
        grade: `Grade ${r.grade}`,
        studentCount: Number(r.studentCount),
      }))
      .sort((a, b) => {
        const numA = parseInt(a.grade.replace("Grade ", ""), 10);
        const numB = parseInt(b.grade.replace("Grade ", ""), 10);
        return numA - numB;
      });

    if (grades.length === 0) {
      console.log("[SkyOS] No published results found — skipping webhook");
      return;
    }

    const payload = {
      examYear: examYear.year,
      grades,
      importedBy,
    };

    const endpoint = `${baseUrl}/api/amaanah/exam-import`;
    console.log(
      `[SkyOS] POST ${endpoint} — examYear=${examYear.year}, grades=${grades.length}, importedBy=${importedBy}`,
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (response.ok && responseData.success) {
      console.log(
        `[SkyOS] Invoice created — ${responseData.invoiceNumber ?? "n/a"}, totalFee=${responseData.totalFee ?? "n/a"}`,
      );
    } else {
      console.error(
        `[SkyOS] Webhook returned error (HTTP ${response.status}):`,
        JSON.stringify(responseData),
      );
    }
  } catch (err: any) {
    // Never let billing webhook errors break the main results flow
    console.error("[SkyOS] Webhook request failed:", err.message);
  }
}
