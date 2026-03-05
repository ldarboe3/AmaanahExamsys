import OpenAI from "openai";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export interface ScheduleEntry {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  grade: number;
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
  }>;
}

export async function generateExamScheduleWithAI(
  params: GenerateScheduleParams
): Promise<ScheduleEntry[]> {
  const openai = getOpenAIClient();

  const subjectsByGrade: Record<number, typeof params.subjects> = {};
  for (const subject of params.subjects) {
    if (!subjectsByGrade[subject.grade]) subjectsByGrade[subject.grade] = [];
    subjectsByGrade[subject.grade].push(subject);
  }

  const prompt = `You are an expert exam timetable scheduler for an Islamic education board in The Gambia.

Generate a complete exam timetable for the ${params.examYearName} examination.

EXAM DETAILS:
- Exam period: ${params.startDate} to ${params.endDate}
- Grades: ${params.grades.join(", ")}
- Subjects to schedule:
${params.subjects.map(s => `  • Grade ${s.grade}: ${s.name} (${s.code})`).join("\n")}

SCHEDULING RULES:
1. Schedule ONE subject per day per grade (no two subjects of the same grade on the same day)
2. If multiple grades have exams on the same day, they can share a day but must have different times
3. Use these standard time slots:
   - Morning session: 09:00 - 11:00 (120 min)
   - Afternoon session: 14:00 - 16:00 (120 min)
4. Skip weekends (Saturday = day 6, Sunday = day 0)
5. Leave at least one rest day between consecutive exam days for the same grade
6. Schedule more important/core subjects (Quran, Arabic Language) in the first week
7. Start with easier subjects and progress to harder ones
8. Spread subjects evenly across the available dates
9. The schedule must fit within the exam period dates

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "subjectId": <number>,
    "examDate": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "grade": <number>
  }
]

Ensure every subject is scheduled exactly once. Return only the JSON array.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
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

  const subjectMap = new Map(params.subjects.map(s => [s.id, s]));

  return parsed.map((entry: any) => {
    const subject = subjectMap.get(entry.subjectId);
    return {
      subjectId: entry.subjectId,
      subjectName: subject?.name || "Unknown",
      subjectCode: subject?.code || "UNK",
      examDate: entry.examDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
      grade: entry.grade,
    };
  });
}
