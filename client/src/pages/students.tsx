import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/lib/i18n/LanguageContext";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  Copy,
  User,
  School,
  Calendar,
  Hash,
  GraduationCap,
  Loader2,
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Student, Region, Cluster, School as SchoolType } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  approved: "bg-chart-3/10 text-chart-3",
  rejected: "bg-destructive/10 text-destructive",
};

const getStatusLabel = (status: string, isRTL: boolean) => {
  const labels: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    approved: { en: "Approved", ar: "معتمد" },
    rejected: { en: "Rejected", ar: "مرفوض" },
  };
  return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
};

const getGradeLabel = (grade: number, isRTL: boolean) => {
  if (isRTL) {
    return `الصف ${grade}`;
  }
  return `Grade ${grade}`;
};

// School type to examination classes (grades) mapping
const SCHOOL_TYPE_GRADES: Record<string, { grades: number[]; label: { en: string; ar: string } }> = {
  LBS: { grades: [3, 6], label: { en: "Lower Basic School", ar: "المدرسة الابتدائية الدنيا" } },
  BCS: { grades: [3, 6, 9], label: { en: "Basic Cycle School", ar: "مدرسة الحلقة الأساسية" } },
  UBS: { grades: [9], label: { en: "Upper Basic School", ar: "المدرسة الابتدائية العليا" } },
  SSS: { grades: [12], label: { en: "Senior Secondary School", ar: "الثانوية" } },
  QM: { grades: [3, 6, 9, 12], label: { en: "Quranic Memorization", ar: "تحفيظ القرآن الكريم" } },
  ECD: { grades: [], label: { en: "Early Childhood Development", ar: "روضة" } },
};

// Grade card colors for visual distinction
const GRADE_COLORS: Record<number, { bg: string; icon: string; border: string }> = {
  3: { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/30" },
  6: { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/30" },
  9: { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/30" },
  12: { bg: "bg-purple-500/10", icon: "text-purple-500", border: "border-purple-500/30" },
};

const getGradeColors = (grade: number) => {
  return GRADE_COLORS[grade] || { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/30" };
};

interface StudentWithRelations extends Student {
  school?: { name: string };
  examYear?: { name: string };
}

interface SchoolWithRelations extends SchoolType {
  region?: { name: string };
  cluster?: { name: string };
}

function StudentsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function GradeCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <Skeleton className="w-16 h-6" />
            </div>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Students() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(10);
      const text = await file.text();
      
      setUploadProgress(30);
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      setUploadProgress(50);
      const students = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        setUploadProgress(Math.min(50 + (index / lines.length) * 30, 80));
        return {
          firstName: values[headers.indexOf('firstname')] || '',
          lastName: values[headers.indexOf('lastname')] || '',
          middleName: values[headers.indexOf('middlename')] || '',
          dateOfBirth: values[headers.indexOf('dateofbirth')] || undefined,
          placeOfBirth: values[headers.indexOf('placeofbirth')] || undefined,
          gender: values[headers.indexOf('gender')] || '',
          grade: selectedGrade || parseInt(values[headers.indexOf('grade')] || '0') || 0,
        };
      });

      setUploadProgress(85);
      const response = await apiRequest('POST', '/api/students/bulk', { students });
      setUploadProgress(100);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: isRTL ? "تم الرفع بنجاح" : "Upload Successful",
        description: isRTL 
          ? `تم إضافة ${data.created} طالب`
          : `Added ${data.created} students`,
      });
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadProgress(0);
      invalidateStudentQueries();
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ في الرفع" : "Upload Failed",
        description: error.message || (isRTL ? "فشل رفع الملف" : "Failed to upload file"),
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  // Memoize student query URL
  const studentsUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    
    if (statusFilter !== "all") {
      queryParams.set("status", statusFilter);
    }
    if (regionFilter !== "all") {
      queryParams.set("regionId", regionFilter);
    }
    if (clusterFilter !== "all") {
      queryParams.set("clusterId", clusterFilter);
    }
    if (schoolFilter !== "all") {
      queryParams.set("schoolId", schoolFilter);
    }
    if (selectedGrade !== null) {
      queryParams.set("grade", selectedGrade.toString());
    }
    
    const queryString = queryParams.toString();
    return queryString ? `/api/students?${queryString}` : "/api/students";
  }, [statusFilter, regionFilter, clusterFilter, schoolFilter, selectedGrade]);

  // Fetch all students for counting (without grade filter)
  const allStudentsUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    if (statusFilter !== "all") queryParams.set("status", statusFilter);
    if (regionFilter !== "all") queryParams.set("regionId", regionFilter);
    if (clusterFilter !== "all") queryParams.set("clusterId", clusterFilter);
    if (schoolFilter !== "all") queryParams.set("schoolId", schoolFilter);
    const queryString = queryParams.toString();
    return queryString ? `/api/students?${queryString}` : "/api/students";
  }, [statusFilter, regionFilter, clusterFilter, schoolFilter]);

  const { data: allStudents } = useQuery<StudentWithRelations[]>({
    queryKey: [allStudentsUrl],
  });

  const { data: students, isLoading } = useQuery<StudentWithRelations[]>({
    queryKey: [studentsUrl],
    enabled: selectedGrade !== null,
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  // Fetch active exam year to get available grades
  const { data: examYears, isLoading: examYearsLoading } = useQuery({
    queryKey: ["/api/exam-years"],
  });

  const activeExamYear = (examYears as any[])?.find(ey => ey.isActive);
  
  // Get all unique grades from school types as fallback
  const getAllGradesFromSchoolTypes = (): number[] => {
    const allGrades = new Set<number>();
    Object.values(SCHOOL_TYPE_GRADES).forEach(config => {
      config.grades.forEach(grade => allGrades.add(grade));
    });
    return Array.from(allGrades).sort((a, b) => a - b);
  };
  
  // Use active exam year grades if available, otherwise fallback to all school type grades
  const availableGrades: number[] = activeExamYear?.grades?.length > 0 
    ? activeExamYear.grades 
    : getAllGradesFromSchoolTypes();

  // Countdown timer for registration deadline
  useEffect(() => {
    if (!activeExamYear?.registrationEndDate) {
      setCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const endDate = new Date(activeExamYear.registrationEndDate);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [activeExamYear?.registrationEndDate]);

  // Build school query URL based on region/cluster filters
  const schoolQueryParams = new URLSearchParams();
  if (regionFilter !== "all") schoolQueryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") schoolQueryParams.set("clusterId", clusterFilter);
  const schoolQueryString = schoolQueryParams.toString();
  const schoolsUrl = schoolQueryString ? `/api/schools?${schoolQueryString}` : "/api/schools";

  const { data: schools } = useQuery<SchoolWithRelations[]>({
    queryKey: [schoolsUrl],
  });

  // Filter clusters based on selected region
  const clustersForFilter = clusters?.filter(
    (cluster) => regionFilter === "all" || cluster.regionId === parseInt(regionFilter)
  );

  const schoolsForFilter = schools;

  // Helper to invalidate all student queries
  const invalidateStudentQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/students');
      },
    });
  };

  const approveStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return apiRequest("POST", `/api/students/${studentId}/approve`);
    },
    onSuccess: () => {
      invalidateStudentQueries();
      toast({
        title: t.common.success,
        description: isRTL ? "تم اعتماد الطالب بنجاح" : "The student has been approved successfully.",
      });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/students/approve-all`);
    },
    onSuccess: () => {
      invalidateStudentQueries();
      toast({
        title: t.common.success,
        description: isRTL ? "تم اعتماد جميع الطلاب المعلقين" : "All pending students have been approved.",
      });
    },
  });

  // Get student count per grade
  const getStudentCountForGrade = (grade: number) => {
    return allStudents?.filter(s => s.grade === grade).length || 0;
  };

  const getPendingCountForGrade = (grade: number) => {
    return allStudents?.filter(s => s.grade === grade && s.status === 'pending').length || 0;
  };

  const getApprovedCountForGrade = (grade: number) => {
    return allStudents?.filter(s => s.grade === grade && s.status === 'approved').length || 0;
  };

  // Local filtering for search only
  const filteredStudents = students?.filter((student) => {
    if (!searchQuery) return true;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      (student.indexNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const pendingCount = students?.filter(s => s.status === 'pending').length || 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: isRTL ? "تم النسخ" : "Copied",
      description: isRTL ? "تم نسخ رقم الفهرس" : "Index number copied to clipboard",
    });
  };

  // Grade Dashboard View
  const renderGradeDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.students.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "اختر الصف لإدارة تسجيلات الطلاب" : "Select a grade to manage student registrations"}
          </p>
        </div>
      </div>

      {/* Active Exam Year Banner */}
      {activeExamYear && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-primary">
                {isRTL ? "السنة الامتحانية النشطة" : "Active Exam Year"}
              </p>
              <p className="text-sm text-primary/80">{activeExamYear.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grade Dashboard Cards */}
      {examYearsLoading ? (
        <GradeCardSkeleton />
      ) : availableGrades.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableGrades.map((grade) => {
            const colors = getGradeColors(grade);
            const totalCount = getStudentCountForGrade(grade);
            const pendingCount = getPendingCountForGrade(grade);
            const approvedCount = getApprovedCountForGrade(grade);
            
            return (
              <Card 
                key={grade}
                className={`hover-elevate active-elevate-2 cursor-pointer transition-all border-2 ${colors.border} hover:shadow-lg`}
                onClick={() => setSelectedGrade(grade)}
                data-testid={`card-grade-${grade}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <GraduationCap className={`w-7 h-7 ${colors.icon}`} />
                    </div>
                    {pendingCount > 0 && (
                      <Badge variant="secondary" className="bg-chart-5/10 text-chart-5">
                        {pendingCount} {isRTL ? "معلق" : "pending"}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1">{getGradeLabel(grade, isRTL)}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {totalCount} {isRTL ? "طالب مسجل" : "students registered"}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-chart-3" />
                      <span className="text-muted-foreground">{approvedCount} {isRTL ? "معتمد" : "approved"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-chart-5" />
                      <span className="text-muted-foreground">{pendingCount} {isRTL ? "معلق" : "pending"}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGrade(grade);
                        setShowUploadDialog(true);
                      }}
                      data-testid={`button-upload-grade-${grade}`}
                    >
                      <Upload className="w-4 h-4 me-1" />
                      {isRTL ? "رفع" : "Upload"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('/api/templates/students');
                      }}
                      data-testid={`button-template-grade-${grade}`}
                    >
                      <Download className="w-4 h-4 me-1" />
                      {isRTL ? "القالب" : "Template"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isRTL ? "لا توجد صفوف متاحة" : "No Grades Available"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isRTL 
                ? "يرجى التأكد من وجود سنة امتحانية نشطة مع صفوف محددة"
                : "Please ensure there is an active exam year with grades configured"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Grade Detail View (with student list)
  const renderGradeDetail = () => {
    const colors = getGradeColors(selectedGrade!);
    
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
                {isRTL ? "إدارة تسجيلات الطلاب والتحقق منها" : "Manage student registrations and validations"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-csv">
              <Upload className="w-4 h-4 me-2" />
              {t.common.uploadCSV}
            </Button>
            <Button variant="outline" onClick={() => window.open('/api/templates/students')} data-testid="button-download-template">
              <FileSpreadsheet className="w-4 h-4 me-2" />
              {isRTL ? "القالب" : "Template"}
            </Button>
            {pendingCount > 0 && (
              <Button onClick={() => approveAllMutation.mutate()} data-testid="button-approve-all">
                <CheckCircle className="w-4 h-4 me-2" />
                {isRTL ? `موافقة الكل (${pendingCount})` : `Approve All (${pendingCount})`}
              </Button>
            )}
          </div>
        </div>

        {/* Active Exam Year Banner */}
        {activeExamYear && (
          <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
            <p className="text-sm font-medium text-primary">
              {isRTL ? `السنة الامتحانية النشطة: ${activeExamYear.name}` : `Active Exam Year: ${activeExamYear.name}`}
            </p>
          </div>
        )}

        {/* Registration Deadline Countdown */}
        {countdown && (() => {
          const isUrgent = countdown.days < 3;
          const cardClass = isUrgent 
            ? "border-2 border-destructive bg-destructive text-white" 
            : "border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10";
          const iconClass = isUrgent ? "text-white" : "text-primary";
          const titleClass = isUrgent ? "text-white" : "text-primary";
          const numberClass = isUrgent ? "text-white" : "text-foreground";
          const labelClass = isUrgent ? "text-white/80" : "text-muted-foreground";
          const separatorClass = isUrgent ? "text-white/60" : "text-muted-foreground";
          
          return (
            <Card className={cardClass} data-testid="countdown-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Clock className={`w-6 h-6 ${iconClass}`} />
                  <h2 className={`text-lg font-bold ${titleClass}`}>
                    {isRTL ? "الوقت المتبقي للتسجيل" : "Registration Deadline"}
                  </h2>
                </div>
                {isUrgent && (
                  <p className="text-center text-sm font-medium text-white/90 mb-4">
                    {isRTL 
                      ? "⚠️ تحذير: التأخير في التسجيل يترتب عليه غرامة!" 
                      : "⚠️ Warning: Late registration will incur a penalty!"}
                  </p>
                )}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="text-center min-w-[80px]">
                    <p className={`text-3xl md:text-4xl font-bold ${numberClass}`} data-testid="countdown-days">
                      {String(countdown.days).padStart(2, '0')}
                    </p>
                    <p className={`text-sm font-bold uppercase tracking-wide ${labelClass}`}>
                      {isRTL ? "أيام" : "Days"}
                    </p>
                  </div>
                  <span className={`text-3xl md:text-4xl font-bold ${separatorClass}`}>:</span>
                  <div className="text-center min-w-[80px]">
                    <p className={`text-3xl md:text-4xl font-bold ${numberClass}`} data-testid="countdown-hours">
                      {String(countdown.hours).padStart(2, '0')}
                    </p>
                    <p className={`text-sm font-bold uppercase tracking-wide ${labelClass}`}>
                      {isRTL ? "ساعات" : "Hours"}
                    </p>
                  </div>
                  <span className={`text-3xl md:text-4xl font-bold ${separatorClass}`}>:</span>
                  <div className="text-center min-w-[80px]">
                    <p className={`text-3xl md:text-4xl font-bold ${numberClass}`} data-testid="countdown-minutes">
                      {String(countdown.minutes).padStart(2, '0')}
                    </p>
                    <p className={`text-sm font-bold uppercase tracking-wide ${labelClass}`}>
                      {isRTL ? "دقائق" : "Minutes"}
                    </p>
                  </div>
                  <span className={`text-3xl md:text-4xl font-bold ${separatorClass}`}>:</span>
                  <div className="text-center min-w-[80px]">
                    <p className={`text-3xl md:text-4xl font-bold ${numberClass}`} data-testid="countdown-seconds">
                      {String(countdown.seconds).padStart(2, '0')}
                    </p>
                    <p className={`text-sm font-bold uppercase tracking-wide ${labelClass}`}>
                      {isRTL ? "ثواني" : "Seconds"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`border-2 ${colors.border}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.dashboard.totalStudents}</p>
                  <p className="text-2xl font-semibold">{students?.length || 0}</p>
                </div>
                <div className={`w-10 h-10 rounded-md ${colors.bg} flex items-center justify-center`}>
                  <Users className={`w-5 h-5 ${colors.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.common.pending}</p>
                  <p className="text-2xl font-semibold">{pendingCount}</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-chart-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.common.approved}</p>
                  <p className="text-2xl font-semibold">
                    {students?.filter(s => s.status === 'approved').length || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "مع رقم الفهرس" : "With Index #"}</p>
                  <p className="text-2xl font-semibold">
                    {students?.filter(s => s.indexNumber).length || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={t.common.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={isRTL ? "pe-9" : "ps-9"}
                  data-testid="input-search-students"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={regionFilter} onValueChange={(value) => {
                  setRegionFilter(value);
                  setClusterFilter("all");
                  setSchoolFilter("all");
                }}>
                  <SelectTrigger className="w-[160px]" data-testid="select-region-filter">
                    <SelectValue placeholder={t.schools.region} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.allRegions}</SelectItem>
                    {regions?.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={clusterFilter} onValueChange={(value) => {
                  setClusterFilter(value);
                  setSchoolFilter("all");
                }} disabled={regionFilter === "all"}>
                  <SelectTrigger className="w-[160px]" data-testid="select-cluster-filter">
                    <SelectValue placeholder={regionFilter === "all" ? t.common.selectRegionFirst : t.schools.cluster} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.allClusters}</SelectItem>
                    {clustersForFilter?.map((cluster) => (
                      <SelectItem key={cluster.id} value={cluster.id.toString()}>
                        {cluster.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-school-filter">
                    <SelectValue placeholder={t.students.school} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? "جميع المدارس" : "All Schools"}</SelectItem>
                    {schoolsForFilter?.map((school) => (
                      <SelectItem key={school.id} value={school.id.toString()}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                    <SelectValue placeholder={t.common.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.allStatus}</SelectItem>
                    <SelectItem value="pending">{t.common.pending}</SelectItem>
                    <SelectItem value="approved">{t.common.approved}</SelectItem>
                    <SelectItem value="rejected">{t.common.rejected}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-lg">{isRTL ? "قائمة الطلاب" : "Student List"}</CardTitle>
                <CardDescription>
                  {filteredStudents?.length || 0} {t.students.title.toLowerCase()} {t.common.found}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="w-4 h-4 me-2" />
                  {isRTL ? "طباعة البطاقات" : "Print Cards"}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 me-2" />
                  {t.common.export}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <StudentsTableSkeleton />
            ) : filteredStudents && filteredStudents.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.students.title}</TableHead>
                      <TableHead>{t.students.indexNumber}</TableHead>
                      <TableHead>{t.students.school}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                      <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {student.gender}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.indexNumber ? (
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {student.indexNumber}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(student.indexNumber!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t.common.notAssigned}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {student.school?.name || (isRTL ? "غير معروف" : "Unknown")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[student.status || 'pending']} text-xs`}>
                            {getStatusLabel(student.status || 'pending', isRTL)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${student.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 me-2" />
                                {t.common.viewDetails}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="w-4 h-4 me-2" />
                                {isRTL ? "طباعة البطاقة" : "Print Card"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {student.status === 'pending' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => approveStudentMutation.mutate(student.id)}
                                    className="text-chart-3"
                                  >
                                    <CheckCircle className="w-4 h-4 me-2" />
                                    {t.common.approve}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    <XCircle className="w-4 h-4 me-2" />
                                    {t.common.reject}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t.common.noResults}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? t.common.tryAdjusting
                    : isRTL ? "قم برفع ملف CSV لتسجيل الطلاب" : "Upload a CSV file to register students"}
                </p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 me-2" />
                  {isRTL ? "رفع الطلاب" : "Upload Students"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {selectedGrade === null ? renderGradeDashboard() : renderGradeDetail()}

      {/* Student Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل الطالب" : "Student Details"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "معلومات كاملة عن الطالب" : "Complete information about the student"}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedStudent.firstName} {selectedStudent.middleName} {selectedStudent.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {isRTL ? (selectedStudent.gender === 'male' ? 'ذكر' : 'أنثى') : selectedStudent.gender} - {getGradeLabel(selectedStudent.grade, isRTL)}
                  </p>
                  <Badge className={`${statusColors[selectedStudent.status || 'pending']} mt-2`}>
                    {getStatusLabel(selectedStudent.status || 'pending', isRTL)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                {selectedStudent.indexNumber && (
                  <div className="p-4 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">{t.students.indexNumber}</p>
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-mono font-semibold">
                        {selectedStudent.indexNumber}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedStudent.indexNumber!)}
                      >
                        <Copy className="w-4 h-4 me-2" />
                        {isRTL ? "نسخ" : "Copy"}
                      </Button>
                    </div>
                    {selectedStudent.confirmationCode && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">{isRTL ? "رمز التأكيد" : "Confirmation Code"}</p>
                        <code className="text-sm font-mono">
                          {selectedStudent.confirmationCode}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t.students.school}</p>
                      <p className="text-sm font-medium">{selectedStudent.school?.name || (isRTL ? "غير معروف" : "Unknown")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? "سنة الامتحان" : "Exam Year"}</p>
                      <p className="text-sm font-medium">{selectedStudent.examYear?.name || (isRTL ? "غير معروف" : "Unknown")}</p>
                    </div>
                  </div>
                </div>

                {selectedStudent.dateOfBirth && (
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</p>
                    <p className="text-sm font-medium">{selectedStudent.dateOfBirth}</p>
                  </div>
                )}
                {selectedStudent.placeOfBirth && (
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "مكان الميلاد" : "Place of Birth"}</p>
                    <p className="text-sm font-medium">{selectedStudent.placeOfBirth}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t.common.close}
            </Button>
            <Button variant="outline">
              <Printer className="w-4 h-4 me-2" />
              {isRTL ? "طباعة البطاقة" : "Print Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload CSV Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "رفع قائمة الطلاب" : "Upload Student List"}
              {selectedGrade && (
                <Badge variant="secondary" className="ms-2">
                  {getGradeLabel(selectedGrade, isRTL)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? "قم برفع ملف CSV يحتوي على معلومات الطلاب" : "Upload a CSV file containing student information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {uploadFile ? uploadFile.name : (isRTL ? "اسحب وأفلت ملف CSV هنا، أو انقر للتصفح" : "Drag and drop your CSV file here, or click to browse")}
              </p>
              <Button variant="outline" size="sm" type="button">
                {isRTL ? "اختر ملف" : "Choose File"}
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            {bulkUploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? "جاري الرفع" : "Uploading"}</span>
                  <span className="font-semibold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
            {!bulkUploadMutation.isPending && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "هل تحتاج إلى القالب؟" : "Need the template?"}</span>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-primary underline-offset-4 hover:underline"
                  onClick={() => window.open('/api/templates/students')}>
                  <Download className="w-4 h-4 me-1" />
                  {isRTL ? "تحميل قالب CSV" : "Download CSV Template"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setUploadFile(null); }}>
              {t.common.cancel}
            </Button>
            <Button disabled={!uploadFile || bulkUploadMutation.isPending}
              onClick={() => uploadFile && bulkUploadMutation.mutate(uploadFile)}>
              {bulkUploadMutation.isPending ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" />{isRTL ? "جاري الرفع..." : "Uploading..."}</>
              ) : (
                isRTL ? "رفع والتحقق" : "Upload & Validate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
