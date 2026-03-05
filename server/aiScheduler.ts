import OpenAI from "openai";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export interface TimeSlotConfig {
  label: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleEntry {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  grade: number;
  isCore?: boolean;
  notes?: string;
}

export interface GenerateScheduleParams {
  examYearId: number;
  examYearName: string;
  startDate: string;
  endDate: string;
  grades: number[];
  subjects: Array<{
    id: number;
    name: string;
    arabicName?: string | null;
    code: string;
    grade: number;
    isCore?: boolean | null;
  }>;
  // Scheduling configuration
  timeSlots: TimeSlotConfig[];          // e.g. [{label:"Morning", startTime:"09:00", endTime:"11:00"}]
  maxPapersPerDay: number;              // 1, 2, or 3
  weekendDays: number[];                // Islamic: [4, 5] = Thursday, Friday
  mixCoreWithNonCore: boolean;          // allow core + non-core on same day
}

export async function generateExamScheduleWithAI(
  params: GenerateScheduleParams
): Promise<ScheduleEntry[]> {
  const openai = getOpenAIClient();

  // Build subject list WITH their IDs clearly for the AI
  const subjectLines = params.subjects.map(s =>
    `  ID=${s.id} | Grade ${s.grade} | ${s.name}${s.arabicName ? ` (${s.arabicName})` : ""} | Code: ${s.code} | ${s.isCore ? "CORE SUBJECT" : "Non-core subject"}`
  ).join("\n");

  // Build time slots description
  const slotLines = params.timeSlots.map((slot, i) =>
    `  Slot ${i + 1} (${slot.label}): ${slot.startTime} – ${slot.endTime}`
  ).join("\n");

  // Weekend days label
  const weekendNames = params.weekendDays.map(d =>
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]
  ).join(" and ");

  const prompt = `You are an expert exam timetable scheduler for an Islamic Arabic education board in The Gambia.

Generate a complete exam timetable for the ${params.examYearName} examination.

EXAM PERIOD:
- Start date: ${params.startDate}
- End date: ${params.endDate}

SUBJECTS TO SCHEDULE (use the exact ID numbers provided):
${subjectLines}

TIME SLOTS AVAILABLE EACH DAY:
${slotLines}
- Maximum papers per day across ALL grades: ${params.maxPapersPerDay} (spread slots across grades if multiple on same day)

WEEKEND DAYS (no exams on these days):
- ${weekendNames} (JavaScript day numbers: ${params.weekendDays.join(", ")})

SCHEDULING RULES:
1. Use the EXACT subject IDs provided above - do not invent IDs
2. Schedule ONE subject per grade per day (no two subjects for the same grade on the same day)
3. When multiple grades have exams on the same day, assign them to different time slots
4. Never schedule more than ${params.maxPapersPerDay} paper(s) total in one day (counting all grades)
5. Skip weekend days (${weekendNames})
6. Leave at least one rest day between consecutive exam days for each grade
${params.mixCoreWithNonCore
  ? "7. MIX subjects freely — do NOT group all core subjects first. Interleave core and non-core subjects throughout the entire exam period for a balanced schedule\n8. Spread subjects evenly across the available dates\n9. Every subject must be scheduled exactly once\n10. All dates must fall within the exam period"
  : "7. CORE SUBJECTS first: Schedule all CORE SUBJECTS in the first portion of the exam period\n8. Keep core subject days separate from non-core subject days where possible\n9. Spread subjects evenly across the available dates\n10. Every subject must be scheduled exactly once\n11. All dates must fall within the exam period"}

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "subjectId": <exact integer ID from the list above>,
    "examDate": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "grade": <integer>
  }
]

IMPORTANT: Use only the subjectId values from the list above. Return only the JSON array, nothing else.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || "[]";
  const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed: any[];
  try {
    parsed = JSON.parse(cleanContent);
  } catch {
    const match = cleanContent.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("AI returned invalid schedule format");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AI returned non-array response");
  }

  const subjectMap = new Map(params.subjects.map(s => [s.id, s]));
  const validSubjectIds = new Set(params.subjects.map(s => s.id));

  const result: ScheduleEntry[] = [];

  for (const entry of parsed) {
    const subjectId = Number(entry.subjectId);
    const grade = Number(entry.grade);

    if (isNaN(subjectId) || isNaN(grade)) continue;
    if (!validSubjectIds.has(subjectId)) continue;
    if (!entry.examDate || !entry.startTime || !entry.endTime) continue;

    const subject = subjectMap.get(subjectId);
    result.push({
      subjectId,
      subjectName: subject?.name || "Unknown",
      subjectCode: subject?.code || "UNK",
      examDate: entry.examDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
      grade,
      isCore: subject?.isCore ?? false,
    });
  }

  return result;
}
