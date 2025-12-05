import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatNumber } from "@/lib/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  Send,
  Check,
  ArrowLeft,
  Calendar,
  GraduationCap,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudentResult, Student, Subject, School, Cluster, Region, ExamYear } from "@shared/schema";

const GRADE_COLORS: Record<number, { bg: string; icon: string; border: string }> = {
  3: { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/30" },
  6: { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/30" },
  9: { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/30" },
  12: { bg: "bg-purple-500/10", icon: "text-purple-500", border: "border-purple-500/30" },
};

const getGradeColors = (grade: number) => GRADE_COLORS[grade] || { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/30" };
const getGradeLabel = (grade: number, isRTL: boolean) => isRTL ? `الصف ${grade}` : `Grade ${grade}`;

interface StudentWithResults extends Student {
  school?: School;
  results?: StudentResult[];
}

interface ResultRow {
  student: StudentWithResults;
  marks: Record<number, number | null>; // subjectId -> mark
}

function ExamYearCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="hover-elevate">
          <CardContent className="p-6">
            <Skeleton className="h-12 w-12 rounded-lg mb-4" />
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Results() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [selectedExamYear, setSelectedExamYear] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editedMarks, setEditedMarks] = useState<Record<string, Record<number, number | null>>>({});
  const [uploadSummary, setUploadSummary] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'previewing' | 'preview_complete' | 'confirming' | 'confirmed'>('idle');

  // Fetch exam years
  const { data: examYears, isLoading: examYearsLoading } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  // Fetch regions, clusters, schools, subjects
  const { data: regions } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });
  const { data: schoolsList } = useQuery<School[]>({ queryKey: ["/api/schools"] });
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: selectedGrade ? ["/api/subjects", selectedGrade] : null,
    queryFn: () => fetch(`/api/subjects?grade=${selectedGrade}`).then(r => r.json()),
    enabled: !!selectedGrade,
  });

  const schools = Array.isArray(schoolsList) ? schoolsList : [];

  // Fetch students based on filters
  const { data: studentListResponse, isLoading: studentsLoading } = useQuery<{ data: StudentWithResults[] }>({
    queryKey: ["/api/students", selectedExamYear!, selectedGrade!, regionFilter, clusterFilter, schoolFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedExamYear) params.set("examYearId", String(selectedExamYear));
      if (selectedGrade) params.set("grade", String(selectedGrade));
      if (regionFilter !== "all") params.set("regionId", regionFilter);
      if (clusterFilter !== "all") params.set("clusterId", clusterFilter);
      if (schoolFilter !== "all") params.set("schoolId", schoolFilter);
      
      const response = await fetch(`/api/students?${params}`);
      return response.json();
    },
    enabled: !!selectedExamYear && !!selectedGrade,
  });

  const studentList = studentListResponse?.data || [];

  // Fetch results for students
  const { data: resultsList, isLoading: resultsLoading } = useQuery<StudentResult[]>({
    queryKey: ["/api/results", selectedExamYear, selectedGrade],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedExamYear) params.set("examYearId", String(selectedExamYear));
      if (selectedGrade) params.set("grade", String(selectedGrade));
      
      const response = await fetch(`/api/results?${params}`);
      return response.json();
    },
    enabled: !!selectedExamYear && !!selectedGrade,
  });

  // Filter schools by region and cluster
  const filteredSchools = useMemo(() => {
    return schools.filter((school: School) => {
      if (regionFilter !== "all" && school.regionId !== parseInt(regionFilter)) return false;
      if (clusterFilter !== "all" && school.clusterId !== parseInt(clusterFilter)) return false;
      return true;
    });
  }, [schools, regionFilter, clusterFilter]);

  // Get unique grades
  const uniqueGrades = [3, 6, 9, 12];

  // Build result rows with calculated totals
  const resultRows = useMemo(() => {
    if (!Array.isArray(studentList) || !Array.isArray(resultsList) || !Array.isArray(subjects) || subjects.length === 0) return [];

    return studentList.map(student => {
      const studentKey = `${student.id}`;
      const marks: Record<number, number | null> = {};
      
      (subjects || []).forEach((subject: Subject) => {
        const result = resultsList.find(r => r.studentId === student.id && r.subjectId === subject.id);
        const mark = editedMarks[studentKey]?.[subject.id] ?? 
                     (result ? parseFloat(result.totalScore?.toString() || "0") : null);
        marks[subject.id] = mark;
      });

      return { student, marks };
    });
  }, [studentList, resultsList, subjects, editedMarks]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return resultRows.slice(start, start + pageSize);
  }, [resultRows, currentPage, pageSize]);

  const totalPages = Math.ceil((resultRows?.length || 0) / pageSize);

  // Calculate totals and percentage for a row
  const calculateRowTotals = (marks: Record<number, number | null>) => {
    const validMarks = Object.values(marks).filter(m => m !== null) as number[];
    if (validMarks.length === 0) return { total: 0, percentage: 0 };
    const total = validMarks.reduce((a, b) => a + b, 0);
    const maxScore = (subjects?.length || 1) * 100;
    const percentage = (total / maxScore) * 100;
    return { total: Math.round(total), percentage: Math.round(percentage * 100) / 100 };
  };

  // Save marks mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { studentId: number; subjectId: number; mark: number }) => {
      const response = await apiRequest("POST", "/api/results/upsert", {
        studentId: data.studentId,
        subjectId: data.subjectId,
        examYearId: selectedExamYear,
        totalScore: data.mark,
        status: "pending",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل حفظ الدرجة" : "Failed to save mark",
        variant: "destructive",
      });
    },
  });

  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    const key = `${studentId}`;
    const numValue = value === "" ? null : Math.max(0, Math.min(100, parseInt(value) || 0));
    
    setEditedMarks(prev => ({
      ...prev,
      [key]: { ...prev[key], [subjectId]: numValue }
    }));
  };

  const handleSaveMark = (studentId: number, subjectId: number) => {
    const key = `${studentId}`;
    const mark = editedMarks[key]?.[subjectId];
    if (mark !== null && mark !== undefined) {
      saveMutation.mutate({ studentId, subjectId, mark });
    }
  };

  // Phase 1: Preview upload (matches schools/students, returns stats, no saving)
  const previewMutation = useMutation({
    mutationFn: async (data: { file: File; examYearId: number; grade: number }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('examYearId', String(data.examYearId));
      formData.append('grade', String(data.grade));
      
      const response = await fetch('/api/results/upload/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Preview failed');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setPreviewData(data);
      setUploadPhase('preview_complete');
      setIsUploading(false);
      
      toast({
        title: isRTL ? "تم تحليل الملف" : "File Analyzed",
        description: isRTL 
          ? `تم مطابقة ${data.summary?.matchedRows || 0} صف من ${data.summary?.totalRows || 0}`
          : `Matched ${data.summary?.matchedRows || 0} of ${data.summary?.totalRows || 0} rows`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تحليل الملف" : "Failed to analyze file"),
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadPhase('idle');
    },
  });

  // Phase 2: Confirm upload (applies matched results to database)
  const confirmMutation = useMutation({
    mutationFn: async (params: { sessionKey: string; defaultRegionId?: number; defaultClusterId?: number }) => {
      const response = await fetch('/api/results/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Confirm failed');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setUploadSummary(data);
      setUploadPhase('confirmed');
      setIsConfirming(false);
      
      const schoolsCreatedMsg = data.summary?.schoolsCreated > 0 
        ? (isRTL ? `${data.summary.schoolsCreated} مدرسة جديدة، ` : `${data.summary.schoolsCreated} new schools, `)
        : '';
      const studentsCreatedMsg = data.summary?.studentsCreated > 0 
        ? (isRTL ? `${data.summary.studentsCreated} طالب جديد، ` : `${data.summary.studentsCreated} new students, `)
        : '';
      
      toast({
        title: isRTL ? "تم تحميل النتائج بنجاح" : "Results Applied Successfully",
        description: `${schoolsCreatedMsg}${studentsCreatedMsg}${data.summary?.resultsCreated || 0} ${isRTL ? "نتائج جديدة" : "new results"}, ${data.summary?.resultsUpdated || 0} ${isRTL ? "نتائج محدثة" : "updated"}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تطبيق النتائج" : "Failed to apply results"),
        variant: "destructive",
      });
      setIsConfirming(false);
    },
  });

  // Reset upload dialog state when closing
  const resetUploadState = () => {
    setShowUploadDialog(false);
    setUploadSummary(null);
    setPreviewData(null);
    setUploadPhase('idle');
    setIsUploading(false);
    setIsConfirming(false);
  };

  // Calculate progress percentage based on upload phase
  const getProgressPercentage = () => {
    switch (uploadPhase) {
      case 'idle': return 0;
      case 'previewing': return 25;
      case 'preview_complete': return 50;
      case 'confirming': return 75;
      case 'confirmed': return 100;
      default: return 0;
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedGrade) return;
    try {
      const response = await fetch(`/api/results/template?grade=${selectedGrade}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_template_grade_${selectedGrade}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل تنزيل القالب" : "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleDownloadErrors = async (type: 'unmatched' | 'unmatchedstudents' | 'nomarks' | 'invalid') => {
    try {
      const response = await fetch(`/api/results/errors/${type}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Download failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filenames: Record<string, string> = {
        'unmatched': 'unmatched_schools.csv',
        'unmatchedstudents': 'unmatched_students.csv',
        'nomarks': 'no_valid_marks.csv',
        'invalid': 'invalid_marks.csv'
      };
      a.download = filenames[type] || 'errors.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تنزيل الملف" : "Failed to download file"),
        variant: "destructive",
      });
    }
  };

  // LEVEL 1: Exam Years View
  const renderExamYears = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{isRTL ? "النتائج" : "Results"}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "اختر سنة امتحانية لعرض النتائج" : "Select an examination year to view results"}
          </p>
        </div>

        {examYearsLoading ? (
          <ExamYearCardSkeleton />
        ) : examYears && examYears.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {examYears.map((year) => (
              <Card 
                key={year.id}
                className="hover-elevate active-elevate-2 cursor-pointer transition-all border-2 border-primary/30"
                onClick={() => setSelectedExamYear(year.id)}
                data-testid={`card-exam-year-${year.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-primary" />
                    </div>
                    {year.isActive && (
                      <Badge className="bg-chart-3/10 text-chart-3">
                        {isRTL ? "نشط" : "Active"}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-1">{year.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isRTL ? "لا توجد سنوات امتحانية" : "No Examination Years"}
              </h3>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // LEVEL 2: Grades View
  const renderGrades = () => {
    const currentYear = examYears?.find(y => y.id === selectedExamYear);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setSelectedExamYear(null);
              setSelectedGrade(null);
              setRegionFilter("all");
              setClusterFilter("all");
              setSchoolFilter("all");
            }}
            data-testid="button-back-to-years"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{currentYear?.name}</h1>
            <p className="text-muted-foreground mt-1">
              {isRTL ? "اختر الصف لعرض النتائج" : "Select a grade to view results"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {uniqueGrades.map((grade) => {
            const colors = getGradeColors(grade);
            return (
              <Card 
                key={grade}
                className={`hover-elevate active-elevate-2 cursor-pointer transition-all border-2 ${colors.border}`}
                onClick={() => setSelectedGrade(grade)}
                data-testid={`card-grade-${grade}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <GraduationCap className={`w-7 h-7 ${colors.icon}`} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{getGradeLabel(grade, isRTL)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "عرض النتائج" : "View results"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // LEVEL 3: Editable Results Table
  const renderResultsTable = () => {
    const currentYear = examYears?.find(y => y.id === selectedExamYear);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSelectedGrade(null)}
            data-testid="button-back-to-grades"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
              {getGradeLabel(selectedGrade!, isRTL)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentYear?.name} - {isRTL ? "إدخال الدرجات" : "Mark Entry"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الطلاب" : "Students"}</p>
                  <p className="text-2xl font-semibold">{formatNumber(resultRows.length)}</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Button */}
        <div className="flex gap-2">
          <Button onClick={() => setShowUploadDialog(true)} data-testid="button-upload-results">
            <Upload className="w-4 h-4 me-2" />
            {isRTL ? "تحميل النتائج" : "Upload Results"}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={isRTL ? "البحث باسم الطالب..." : "Search by student name..."}
                  className={isRTL ? "pe-9" : "ps-9"}
                  data-testid="input-search-results"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={regionFilter} onValueChange={(value) => {
                  setRegionFilter(value);
                  setClusterFilter("all");
                  setSchoolFilter("all");
                }}>
                  <SelectTrigger className="w-[140px]" data-testid="select-region-filter">
                    <SelectValue placeholder={isRTL ? "الإقليم" : "Region"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? "جميع الأقاليم" : "All Regions"}</SelectItem>
                    {regions?.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={clusterFilter} onValueChange={(value) => {
                  setClusterFilter(value);
                  setSchoolFilter("all");
                }} disabled={regionFilter === "all"}>
                  <SelectTrigger className="w-[140px]" data-testid="select-cluster-filter">
                    <SelectValue placeholder={isRTL ? "العنقود" : "Cluster"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? "جميع العناقيد" : "All Clusters"}</SelectItem>
                    {clusters?.filter(c => regionFilter === "all" || c.regionId === parseInt(regionFilter)).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-school-filter">
                    <SelectValue placeholder={isRTL ? "المدرسة" : "School"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? "جميع المدارس" : "All Schools"}</SelectItem>
                    {filteredSchools.map((s: School) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Pagination size selector */}
                <Select value={String(pageSize)} onValueChange={(v) => {
                  setPageSize(parseInt(v));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={isRTL ? "الحد" : "Per Page"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{isRTL ? "جدول الدرجات" : "Marks Table"}</CardTitle>
                <CardDescription>
                  {resultRows.length} {isRTL ? "طالب" : "students"} - {isRTL ? "صفحة" : "Page"} {currentPage} {isRTL ? "من" : "of"} {totalPages}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading || subjectsLoading || resultsLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : paginatedRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-3 py-3 font-semibold">{isRTL ? "المدرسة" : "School"}</th>
                      <th className="text-left px-3 py-3 font-semibold">{isRTL ? "اسم الطالب" : "Student Name"}</th>
                      {(subjects || []).map((subj: Subject) => (
                        <th key={subj.id} className="text-center px-2 py-3 font-semibold text-xs">
                          {isRTL ? subj.arabicName || subj.name : subj.name}
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-semibold">{isRTL ? "المجموع" : "Total"}</th>
                      <th className="text-center px-3 py-3 font-semibold">{isRTL ? "النسبة %" : "Percentage"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, idx) => {
                      const { total, percentage } = calculateRowTotals(row.marks);
                      const studentKey = `${row.student.id}`;
                      
                      return (
                        <tr key={row.student.id} className={idx % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-muted/30"}>
                          <td className="px-3 py-2">{row.student.school?.name}</td>
                          <td className="px-3 py-2 font-medium">{row.student.firstName} {row.student.lastName}</td>
                          
                          {(subjects || []).map((subj: Subject) => (
                            <td key={subj.id} className="px-2 py-2 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={editedMarks[studentKey]?.[subj.id] ?? row.marks[subj.id] ?? ''}
                                onChange={(e) => handleMarkChange(row.student.id, subj.id, e.target.value)}
                                onBlur={() => handleSaveMark(row.student.id, subj.id)}
                                className="w-14 h-8 text-center text-xs"
                                placeholder="-"
                                data-testid={`input-mark-${row.student.id}-${subj.id}`}
                              />
                            </td>
                          ))}
                          
                          <td className="px-3 py-2 text-center font-semibold">{total}</td>
                          <td className="px-3 py-2 text-center font-semibold">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {isRTL ? "لا توجد نتائج" : "No results found"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              {isRTL ? "السابق" : "Previous"}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              {isRTL ? "التالي" : "Next"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {!selectedExamYear ? (
        renderExamYears()
      ) : !selectedGrade ? (
        renderGrades()
      ) : (
        renderResultsTable()
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open) {
          resetUploadState();
        } else {
          setShowUploadDialog(open);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تحميل النتائج" : "Upload Results"}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "قم بتحميل ملف CSV يحتوي على النتائج. التنسيق المطلوب: اسم المدرسة، العنوان، اسم الطالب، [أعمدة المواد]" 
                : "Upload a CSV file containing results. Expected format: School name, address, Student name, [subject columns]"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{isRTL ? "تنزيل القالب" : "Download Template"}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "احصل على ملف CSV مع العناوين الصحيحة" : "Get a CSV file with correct headers"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} data-testid="button-download-template">
                <Download className="w-4 h-4 me-2" />
                {isRTL ? "تنزيل" : "Download"}
              </Button>
            </div>

            {/* File Upload - Phase 1: Preview */}
            {uploadPhase === 'idle' && (
              <div className="border-2 border-dashed rounded-lg p-4">
                <Input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedExamYear && selectedGrade) {
                      setIsUploading(true);
                      setUploadSummary(null);
                      setPreviewData(null);
                      setUploadPhase('previewing');
                      previewMutation.mutate({
                        file,
                        examYearId: selectedExamYear,
                        grade: selectedGrade,
                      });
                    }
                  }}
                  disabled={isUploading}
                  data-testid="input-results-file"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {isRTL 
                    ? "سيتم تحليل الملف أولاً ومطابقة المدارس والطلاب قبل تحديث النتائج"
                    : "File will be analyzed first to match schools and students before updating results"}
                </p>
              </div>
            )}

            {/* Loading State with Progress Bar */}
            {(uploadPhase === 'previewing' || uploadPhase === 'confirming') && (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm">
                    {uploadPhase === 'previewing' 
                      ? (isRTL ? "جاري تحليل الملف..." : "Analyzing file...") 
                      : (isRTL ? "جاري تطبيق النتائج..." : "Applying results...")}
                  </span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{getProgressPercentage()}%</p>
              </div>
            )}

            {/* Progress Bar for Preview Complete */}
            {uploadPhase === 'preview_complete' && (
              <Progress value={50} className="h-2" />
            )}

            {/* Progress Bar for Confirmed */}
            {uploadPhase === 'confirmed' && (
              <Progress value={100} className="h-2" />
            )}

            {/* Phase 1 Complete: Preview Summary */}
            {uploadPhase === 'preview_complete' && previewData && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    {isRTL ? "نتائج التحليل" : "Analysis Results"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {isRTL 
                      ? "راجع النتائج ثم اضغط على زر التأكيد لتطبيق النتائج"
                      : "Review the results below, then click Confirm to apply"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">{isRTL ? "إجمالي الصفوف" : "Total Rows"}</span>
                      <span className="font-medium">{formatNumber(previewData.summary?.totalRows || 0)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-500/10 rounded">
                      <span className="text-muted-foreground">{isRTL ? "الصفوف المتطابقة" : "Matched Rows"}</span>
                      <span className="font-medium text-green-600">{formatNumber(previewData.summary?.matchedRows || 0)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">{isRTL ? "المدارس الموجودة" : "Existing Schools"}</span>
                      <span className="font-medium">{formatNumber(previewData.summary?.matchedSchools || 0)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">{isRTL ? "الطلاب الموجودين" : "Existing Students"}</span>
                      <span className="font-medium">{formatNumber(previewData.summary?.existingStudentsCount || 0)}</span>
                    </div>
                    {(previewData.summary?.newSchoolsCount || 0) > 0 && (
                      <div className="flex justify-between p-2 bg-emerald-500/10 rounded col-span-2">
                        <span className="text-emerald-600">{isRTL ? "مدارس جديدة سيتم إنشاؤها" : "New Schools to Create"}</span>
                        <span className="font-medium text-emerald-600">{formatNumber(previewData.summary?.newSchoolsCount || 0)}</span>
                      </div>
                    )}
                    {(previewData.summary?.newStudentsCount || 0) > 0 && (
                      <div className="flex justify-between p-2 bg-blue-500/10 rounded col-span-2">
                        <span className="text-blue-600">{isRTL ? "طلاب جدد سيتم إنشاؤهم" : "New Students to Create"}</span>
                        <span className="font-medium text-blue-600">{formatNumber(previewData.summary?.newStudentsCount || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Details - Show only for actual issues (noMarks, invalidMarks) */}
                {(previewData.summary?.noMarksRows > 0 ||
                  previewData.summary?.invalidMarksRows > 0) && (
                  <div className="border border-amber-500/30 rounded-lg p-4 space-y-3 bg-amber-50/50 dark:bg-amber-500/5">
                    <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      {isRTL ? "المشاكل المكتشفة" : "Issues Found"}
                    </h4>
                    <div className="space-y-2">
                      {previewData.summary?.noMarksRows > 0 && (
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border">
                          <div>
                            <p className="text-sm font-medium">{isRTL ? "بدون درجات صالحة" : "No Valid Marks"}</p>
                            <p className="text-xs text-muted-foreground">
                              {previewData.summary.noMarksRows} {isRTL ? "صفوف بدون درجات" : "rows without valid marks"}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadErrors('nomarks')} data-testid="button-download-nomarks">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {previewData.summary?.invalidMarksRows > 0 && (
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border">
                          <div>
                            <p className="text-sm font-medium">{isRTL ? "درجات غير صالحة" : "Invalid Marks"}</p>
                            <p className="text-xs text-muted-foreground">
                              {previewData.summary.invalidMarksRows} {isRTL ? "درجات خارج النطاق" : "marks out of valid range"}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadErrors('invalid')} data-testid="button-download-invalid">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setUploadPhase('idle'); 
                      setPreviewData(null); 
                    }} 
                    data-testid="button-cancel-upload"
                  >
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button 
                    onClick={() => {
                      if (previewData?.sessionKey && uploadPhase === 'preview_complete') {
                        setIsConfirming(true);
                        setUploadPhase('confirming');
                        confirmMutation.mutate({ sessionKey: previewData.sessionKey });
                      }
                    }}
                    disabled={!previewData?.canConfirm || !previewData?.sessionKey || uploadPhase !== 'preview_complete' || isConfirming}
                    data-testid="button-confirm-upload"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                        {isRTL ? "جاري التطبيق..." : "Applying..."}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 me-2" />
                        {isRTL 
                          ? `تأكيد وتطبيق (${previewData?.summary?.matchedRows || 0} صف)`
                          : `Confirm & Apply (${previewData?.summary?.matchedRows || 0} rows)`}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Phase 2 Complete: Final Summary */}
            {uploadPhase === 'confirmed' && uploadSummary && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3 bg-green-50/50 dark:bg-green-500/5 border-green-500/30">
                  <h4 className="font-semibold flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" />
                    {isRTL ? "تم تطبيق النتائج بنجاح" : "Results Applied Successfully"}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(uploadSummary.summary?.schoolsCreated || 0) > 0 && (
                      <div className="flex justify-between p-2 bg-emerald-500/10 rounded">
                        <span className="text-muted-foreground">{isRTL ? "مدارس جديدة" : "Schools Created"}</span>
                        <span className="font-medium text-emerald-600">{formatNumber(uploadSummary.summary?.schoolsCreated || 0)}</span>
                      </div>
                    )}
                    {(uploadSummary.summary?.studentsCreated || 0) > 0 && (
                      <div className="flex justify-between p-2 bg-blue-500/10 rounded">
                        <span className="text-muted-foreground">{isRTL ? "طلاب جدد" : "Students Created"}</span>
                        <span className="font-medium text-blue-600">{formatNumber(uploadSummary.summary?.studentsCreated || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-2 bg-white dark:bg-slate-900 rounded">
                      <span className="text-muted-foreground">{isRTL ? "الطلاب المعالجين" : "Students Processed"}</span>
                      <span className="font-medium">{formatNumber(uploadSummary.summary?.studentsProcessed || 0)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-500/10 rounded">
                      <span className="text-muted-foreground">{isRTL ? "نتائج جديدة" : "Results Created"}</span>
                      <span className="font-medium text-green-600">{formatNumber(uploadSummary.summary?.resultsCreated || 0)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded col-span-2">
                      <span className="text-muted-foreground">{isRTL ? "نتائج محدثة" : "Results Updated"}</span>
                      <span className="font-medium">{formatNumber(uploadSummary.summary?.resultsUpdated || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={resetUploadState} 
                    data-testid="button-close-upload"
                  >
                    {isRTL ? "إغلاق" : "Close"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
