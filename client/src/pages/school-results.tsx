import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Download, AlertCircle, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExamYear {
  id: number;
  name: string;
  year: number;
  isActive: boolean;
}

interface Subject {
  id: number;
  name: string;
  arabicName?: string;
  code?: string;
}

interface StudentResult {
  id: number;
  studentId: number;
  subjectId: number;
  examYearId: number;
  firstTermScore?: string;
  examScore?: string;
  totalScore?: string;
  grade: string;
  status: string;
  ranking?: number;
  subject?: Subject;
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  indexNumber?: string;
  grade: number;
  results?: StudentResult[];
  ranking?: number;
}

interface SchoolResultsData {
  school: { id: number };
  students: Student[];
  results: StudentResult[];
  examYears: ExamYear[];
}

export default function SchoolResults() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [selectedExamYearId, setSelectedExamYearId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<SchoolResultsData>({
    queryKey: ["/api/school/results"],
  });

  const examYears = data?.examYears || [];
  const students = data?.students || [];
  const allResults = data?.results || [];

  // Filter results by selected exam year
  const filteredResults = selectedExamYearId
    ? allResults.filter(r => r.examYearId === selectedExamYearId)
    : allResults;

  // Filter students who have results in selected year
  const studentsWithResults = selectedExamYearId
    ? students.filter(s =>
        filteredResults.some(r => r.studentId === s.id)
      )
    : students;

  // Get unique subjects sorted by name
  const getSubjects = (): Subject[] => {
    const uniqueSubjects = new Map<number, Subject>();
    filteredResults.forEach(r => {
      if (r.subject && r.subjectId) {
        uniqueSubjects.set(r.subjectId, r.subject);
      }
    });
    return Array.from(uniqueSubjects.values()).sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
  };

  const subjects = getSubjects();

  // Get subject score for a student
  const getSubjectScore = (studentId: number, subjectId: number): string => {
    const result = filteredResults.find(
      r => r.studentId === studentId && r.subjectId === subjectId
    );
    return result ? parseFloat(result.totalScore || '0').toFixed(1) : '0';
  };

  // Group results by student and exam year
  const getStudentTotal = (studentId: number, examYearId?: number) => {
    const results = examYearId
      ? filteredResults.filter(r => r.studentId === studentId && r.examYearId === examYearId)
      : filteredResults.filter(r => r.studentId === studentId);
    
    const total = results.reduce((sum, r) => {
      const score = parseFloat(r.totalScore || '0');
      return sum + score;
    }, 0);
    
    return total;
  };

  const getStudentPercentage = (studentId: number, examYearId?: number) => {
    const results = examYearId
      ? filteredResults.filter(r => r.studentId === studentId && r.examYearId === examYearId)
      : filteredResults.filter(r => r.studentId === studentId);
    
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + parseFloat(r.totalScore || '0'), 0);
    const maxScore = results.length * 100;
    return ((total / maxScore) * 100).toFixed(1);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/school/results/pdf', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Try to parse error message from JSON response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to download PDF');
        } catch (jsonError) {
          // If not JSON, throw generic error
          throw new Error('Failed to download PDF');
        }
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'No published results available');
        } catch {
          throw new Error('No published results available');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `school-results-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: isRTL ? "تم التنزيل" : "Downloaded",
        description: isRTL ? "تم تنزيل ملف PDF بنجاح" : "PDF file downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تنزيل PDF" : "Failed to download PDF"),
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            {isRTL ? "النتائج" : "Results"}
          </h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">
                {isRTL ? "خطأ في جلب النتائج" : "Error Loading Results"}
              </h3>
              <p className="text-sm text-destructive/80">
                {isRTL ? "تأكد من أن النتائج قد تم نشرها بواسطة مسؤول الامتحانات" : "Please ensure results have been published by the Examination Administrator"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          {isRTL ? "النتائج" : "Published Results"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL
            ? "عرض النتائج المنشورة لطلاب مدرستك"
            : "View published results for your school's students"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Filters and Actions */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                {isRTL ? "السنة الامتحانية" : "Examination Year"}
              </label>
              <Select
                value={selectedExamYearId ? String(selectedExamYearId) : "placeholder"}
                onValueChange={(value) => setSelectedExamYearId(value === "placeholder" ? null : parseInt(value))}
              >
                <SelectTrigger data-testid="select-exam-year-filter">
                  <SelectValue placeholder={isRTL ? "اختر السنة" : "Select Year"} />
                </SelectTrigger>
                <SelectContent>
                  {examYears.map((year) => (
                    <SelectItem key={year.id} value={String(year.id)}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleDownloadPDF}
              disabled={filteredResults.length === 0}
              data-testid="button-download-results-pdf"
            >
              <Download className="w-4 h-4 me-2" />
              {isRTL ? "تنزيل PDF" : "Download PDF"}
            </Button>
          </div>

          {/* Results Table */}
          {filteredResults.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {isRTL
                    ? "لا توجد نتائج منشورة حتى الآن"
                    : "No published results available yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{isRTL ? "جدول النتائج" : "Results Table"}</CardTitle>
                    <CardDescription>
                      {studentsWithResults.length} {isRTL ? "طالب" : "students"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div style={{ overflowX: 'auto' }}>
                    <style>{`
                      @media print {
                        @page {
                          size: A4 landscape;
                          margin: 10mm;
                        }
                        body {
                          margin: 0;
                          padding: 0;
                        }
                        .results-table {
                          font-size: 9px;
                          width: 100%;
                        }
                        .results-table thead {
                          background: #0d9488;
                          color: white;
                        }
                        .results-table th {
                          padding: 4px 2px;
                          font-weight: bold;
                          text-align: center;
                          border: 1px solid #0d9488;
                        }
                        .results-table td {
                          padding: 3px 2px;
                          border: 1px solid #ddd;
                        }
                        .results-table tr:nth-child(odd) {
                          background: #f9fafb;
                        }
                      }
                    `}</style>
                    <table className="w-full text-sm results-table">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-3 py-3 font-semibold">
                            {isRTL ? "اسم الطالب" : "Student Name"}
                          </th>
                          <th className="text-left px-3 py-3 font-semibold">
                            {isRTL ? "رقم الفهرس" : "Index Number"}
                          </th>
                          <th className="text-left px-3 py-3 font-semibold">
                            {isRTL ? "الصف" : "Grade"}
                          </th>
                          {subjects.map((subject) => (
                            <th key={subject.id} className="text-center px-2 py-2 font-semibold text-xs whitespace-nowrap">
                              {isRTL ? subject.arabicName : subject.name}
                            </th>
                          ))}
                          <th className="text-center px-3 py-3 font-semibold">
                            {isRTL ? "المجموع" : "Total"}
                          </th>
                          <th className="text-center px-3 py-3 font-semibold">
                            {isRTL ? "النسبة %" : "%"}
                          </th>
                          <th className="text-center px-3 py-3 font-semibold">
                            {isRTL ? "الترتيب" : "Rank"}
                          </th>
                          <th className="text-center px-3 py-3 font-semibold">
                            {isRTL ? "النتيجة" : "Status"}
                          </th>
                        </tr>
                      </thead>
                    <tbody>
                        {studentsWithResults.map((student, idx) => {
                          const ranking = student.ranking;
                          const total = getStudentTotal(student.id, selectedExamYearId || undefined);
                          const percentage = getStudentPercentage(
                            student.id,
                            selectedExamYearId || undefined
                          );

                          return (
                            <tr
                              key={student.id}
                              className={idx % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-muted/30"}
                              data-testid={`row-student-${student.id}`}
                            >
                              <td className="px-3 py-2 font-medium">
                                {student.firstName} {student.lastName}
                              </td>
                              <td className="px-3 py-2">{student.indexNumber || "-"}</td>
                              <td className="px-3 py-2">{student.grade}</td>
                              {subjects.map((subject) => (
                                <td key={subject.id} className="px-2 py-2 text-center text-xs">
                                  {getSubjectScore(student.id, subject.id)}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center font-semibold">{total}</td>
                              <td className="px-3 py-2 text-center font-semibold">{percentage}%</td>
                              <td className="px-3 py-2 text-center">
                                {ranking ? `${ranking}${rankingSuffix(ranking)}` : "-"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant="outline">
                                  {isRTL ? "منشور" : "Published"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function rankingSuffix(rank: number): string {
  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th";
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
}
