import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  MapPin,
  FileSearch,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
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
  const [selectedExamYear, setSelectedExamYear] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [showInvoiceSummary, setShowInvoiceSummary] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [printingCards, setPrintingCards] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);
  
  // Admin bulk upload state
  const [showAdminUploadDialog, setShowAdminUploadDialog] = useState(false);
  const [adminUploadFile, setAdminUploadFile] = useState<File | null>(null);
  const [adminUploadProgress, setAdminUploadProgress] = useState(0);
  const [adminUploadPhase, setAdminUploadPhase] = useState<'idle' | 'uploading' | 'parsing' | 'matching' | 'preview' | 'confirming' | 'complete'>('idle');
  const [adminUploadPreview, setAdminUploadPreview] = useState<any[]>([]);
  const [adminUploadSummary, setAdminUploadSummary] = useState<any>(null);
  const [adminUploadExamYear, setAdminUploadExamYear] = useState<number | null>(null);
  const [adminUploadGrade, setAdminUploadGrade] = useState<number | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);
  
  const isSchoolAdmin = user?.role === 'school_admin';
  const canApproveStudents = user?.role === 'super_admin' || user?.role === 'examination_admin';
  
  // Fetch school profile for school admins
  const { data: schoolProfile } = useQuery<SchoolType>({
    queryKey: ["/api/school/profile"],
    enabled: isSchoolAdmin && !!user?.schoolId,
  });

  // Fetch assigned examination center for school admins
  const { data: assignedCenter } = useQuery<any>({
    queryKey: ["/api/center-assignments/school", schoolProfile?.id],
    enabled: isSchoolAdmin && !!schoolProfile?.id,
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate required IDs before proceeding
      const schoolId = isSchoolAdmin ? schoolProfile?.id : (schoolFilter !== "all" ? parseInt(schoolFilter) : null);
      // Use selected exam year or fallback to active exam year
      const examYearId = selectedExamYear || activeExamYear?.id;
      
      if (!schoolId) {
        throw new Error(isRTL ? "يجب تحديد المدرسة" : "School must be selected");
      }
      if (!examYearId) {
        throw new Error(isRTL ? "يجب اختيار السنة الامتحانية" : "Please select an examination year first");
      }
      
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
          schoolId,
          examYearId,
        };
      });

      setUploadProgress(85);
      const response = await apiRequest('POST', '/api/students/bulk', { students });
      setUploadProgress(100);
      return response.json();
    },
    onSuccess: async (data: any) => {
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
      
      // Auto-generate/update invoice for school admin after upload
      if (isSchoolAdmin) {
        try {
          const invoiceResult = await apiRequest('POST', '/api/invoices/auto-generate', {}) as any;
          if (invoiceResult?.invoice) {
            setShowInvoiceSummary(true);
            setGeneratedInvoice(invoiceResult);
          }
        } catch (error) {
          console.log('Invoice generation info:', error);
        }
      }
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

  // Admin bulk upload with school matching - preview phase
  const adminUploadPreviewMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!adminUploadExamYear || !adminUploadGrade) {
        throw new Error(isRTL ? "يجب اختيار السنة الامتحانية والصف" : "Please select exam year and grade");
      }

      setAdminUploadPhase('uploading');
      setAdminUploadProgress(5);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('examYearId', adminUploadExamYear.toString());
      formData.append('grade', adminUploadGrade.toString());

      setAdminUploadProgress(20);
      setAdminUploadPhase('parsing');

      const response = await fetch('/api/students/bulk-upload-preview', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      setAdminUploadProgress(60);
      setAdminUploadPhase('matching');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      setAdminUploadProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      setAdminUploadPhase('preview');
      setAdminUploadPreview(data.preview || []);
      setAdminUploadSummary(data.summary);
      toast({
        title: isRTL ? "تم تحليل الملف" : "File Analyzed",
        description: isRTL 
          ? `تم العثور على ${data.summary?.total || 0} طالب، ${data.summary?.matched || 0} مطابق`
          : `Found ${data.summary?.total || 0} students, ${data.summary?.matched || 0} matched`,
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ في التحليل" : "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
      setAdminUploadPhase('idle');
      setAdminUploadProgress(0);
    },
  });

  // Admin bulk upload - confirm and create students
  const adminUploadConfirmMutation = useMutation({
    mutationFn: async () => {
      if (!adminUploadExamYear || !adminUploadGrade) {
        throw new Error("Exam year and grade required");
      }

      setAdminUploadPhase('confirming');
      setAdminUploadProgress(10);

      // Only send students that have a matched school
      const matchedStudents = adminUploadPreview.filter(s => s.matchedSchoolId);

      const response = await apiRequest('POST', '/api/students/bulk-upload-confirm', {
        students: matchedStudents,
        examYearId: adminUploadExamYear,
        grade: adminUploadGrade,
      });

      setAdminUploadProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      setAdminUploadPhase('complete');
      toast({
        title: isRTL ? "تم الرفع بنجاح" : "Upload Complete",
        description: isRTL 
          ? `تم إضافة ${data.created} طالب، فشل ${data.failed} طالب`
          : `Created ${data.created} students, ${data.failed} failed`,
      });
      
      // Invalidate all student queries and refetch
      queryClient.refetchQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/students');
        },
      });
      
      // Close dialog after a short delay
      setTimeout(() => {
        resetAdminUpload();
        setShowAdminUploadDialog(false);
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ في الحفظ" : "Save Failed",
        description: error.message,
        variant: "destructive",
      });
      setAdminUploadPhase('preview');
      setAdminUploadProgress(0);
    },
  });

  // Reset admin upload state
  const resetAdminUpload = () => {
    setAdminUploadFile(null);
    setAdminUploadProgress(0);
    setAdminUploadPhase('idle');
    setAdminUploadPreview([]);
    setAdminUploadSummary(null);
    setAdminUploadExamYear(null);
    setAdminUploadGrade(null);
  };

  // Memoize student query URL - scoped to selected exam year
  const studentsUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    
    if (statusFilter !== "all") {
      queryParams.set("status", statusFilter);
    }
    // Filter by selected exam year
    if (selectedExamYear) {
      queryParams.set("examYearId", selectedExamYear.toString());
    }
    // For school admins, always filter by their school
    if (isSchoolAdmin && schoolProfile?.id) {
      queryParams.set("schoolId", schoolProfile.id.toString());
    } else {
      if (regionFilter !== "all") {
        queryParams.set("regionId", regionFilter);
      }
      if (clusterFilter !== "all") {
        queryParams.set("clusterId", clusterFilter);
      }
      if (schoolFilter !== "all") {
        queryParams.set("schoolId", schoolFilter);
      }
    }
    
    queryParams.set("limit", pageSize.toString());
    queryParams.set("offset", (currentPage * pageSize).toString());
    
    if (selectedGrade !== null) {
      queryParams.set("grade", selectedGrade.toString());
    }
    
    const queryString = queryParams.toString();
    return queryString ? `/api/students?${queryString}` : "/api/students";
  }, [statusFilter, regionFilter, clusterFilter, schoolFilter, selectedGrade, selectedExamYear, isSchoolAdmin, schoolProfile?.id, pageSize, currentPage]);

  // Fetch all students for counting (without grade filter) - scoped to selected exam year
  const allStudentsUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    if (statusFilter !== "all") queryParams.set("status", statusFilter);
    // Filter by selected exam year
    if (selectedExamYear) {
      queryParams.set("examYearId", selectedExamYear.toString());
    }
    // For school admins, always filter by their school
    if (isSchoolAdmin && schoolProfile?.id) {
      queryParams.set("schoolId", schoolProfile.id.toString());
    } else {
      if (regionFilter !== "all") queryParams.set("regionId", regionFilter);
      if (clusterFilter !== "all") queryParams.set("clusterId", clusterFilter);
      if (schoolFilter !== "all") queryParams.set("schoolId", schoolFilter);
    }
    const queryString = queryParams.toString();
    return queryString ? `/api/students?${queryString}` : "/api/students";
  }, [statusFilter, regionFilter, clusterFilter, schoolFilter, selectedExamYear, isSchoolAdmin, schoolProfile?.id]);

  // Fetch all students for school across ALL exam years (for past year visibility check)
  // This is NOT scoped by selectedExamYear so we can always check which years have students
  const allSchoolStudentsUrl = useMemo(() => {
    if (!isSchoolAdmin || !schoolProfile?.id) return null;
    return `/api/students?schoolId=${schoolProfile.id}`;
  }, [isSchoolAdmin, schoolProfile?.id]);

  const { data: allStudentsResponse } = useQuery<{ data: StudentWithRelations[]; total: number; limit: number; offset: number }>({
    queryKey: [allStudentsUrl],
  });
  const allStudents = allStudentsResponse?.data || [];

  // Unscoped student list for visibility checks (all years)
  const { data: allSchoolStudentsResponse, isLoading: allSchoolStudentsLoading } = useQuery<{ data: StudentWithRelations[]; total: number; limit: number; offset: number }>({
    queryKey: [allSchoolStudentsUrl],
    enabled: !!allSchoolStudentsUrl,
  });
  const allSchoolStudents = allSchoolStudentsResponse?.data || [];

  const { data: studentsResponse, isLoading } = useQuery<{ data: StudentWithRelations[]; total: number; limit: number; offset: number }>({
    queryKey: [studentsUrl],
    enabled: selectedGrade !== null,
  });
  
  const students = studentsResponse?.data || [];
  const totalStudents = studentsResponse?.total || 0;
  const totalPages = Math.ceil(totalStudents / pageSize);

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  // Fetch all exam years
  const { data: examYears, isLoading: examYearsLoading } = useQuery({
    queryKey: ["/api/exam-years"],
  });

  const activeExamYear = (examYears as any[])?.find(ey => ey.isActive);
  
  // Get the currently selected exam year object
  const selectedExamYearObj = selectedExamYear 
    ? (examYears as any[])?.find(ey => ey.id === selectedExamYear)
    : null;
  
  // Get all unique grades from school types as fallback
  const getAllGradesFromSchoolTypes = (): number[] => {
    const allGrades = new Set<number>();
    Object.values(SCHOOL_TYPE_GRADES).forEach(config => {
      config.grades.forEach(grade => allGrades.add(grade));
    });
    return Array.from(allGrades).sort((a, b) => a - b);
  };
  
  // Get grades based on school profile types (for school admins)
  const getSchoolTypeGrades = (): number[] => {
    if (!schoolProfile?.schoolTypes || schoolProfile.schoolTypes.length === 0) {
      return getAllGradesFromSchoolTypes();
    }
    const gradeSet = new Set<number>();
    schoolProfile.schoolTypes.forEach((type: string) => {
      const config = SCHOOL_TYPE_GRADES[type];
      if (config) {
        config.grades.forEach(grade => gradeSet.add(grade));
      }
    });
    return Array.from(gradeSet).sort((a, b) => a - b);
  };
  
  // Use selected exam year grades, then school types, then all grades as fallback
  const availableGrades: number[] = useMemo(() => {
    // If we have a selected exam year, use its grades
    if (selectedExamYearObj?.grades?.length > 0) {
      // For school admins, filter by school type
      const schoolTypes = schoolProfile?.schoolTypes;
      if (isSchoolAdmin && schoolTypes && schoolTypes.length > 0) {
        const schoolGrades = getSchoolTypeGrades();
        return selectedExamYearObj.grades.filter((g: number) => schoolGrades.includes(g));
      }
      return selectedExamYearObj.grades;
    }
    // Fallback to school type grades for school admins
    if (isSchoolAdmin) {
      return getSchoolTypeGrades();
    }
    return getAllGradesFromSchoolTypes();
  }, [selectedExamYearObj, isSchoolAdmin, schoolProfile?.schoolTypes]);

  // Countdown timer for registration deadline (uses selected exam year)
  useEffect(() => {
    const examYear = selectedExamYearObj || activeExamYear;
    if (!examYear?.registrationEndDate) {
      setCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const endDate = new Date(examYear.registrationEndDate);
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
  }, [selectedExamYearObj?.registrationEndDate, activeExamYear?.registrationEndDate]);

  // Build school query URL based on region/cluster filters
  const schoolQueryParams = new URLSearchParams();
  if (regionFilter !== "all") schoolQueryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") schoolQueryParams.set("clusterId", clusterFilter);
  const schoolQueryString = schoolQueryParams.toString();
  const schoolsUrl = schoolQueryString ? `/api/schools?${schoolQueryString}` : "/api/schools";

  const { data: schools } = useQuery<SchoolWithRelations[]>({
    queryKey: [schoolsUrl],
  });

  // Fetch invoices to check payment status for the selected school
  const selectedSchoolId = isSchoolAdmin ? schoolProfile?.id : (schoolFilter !== "all" ? parseInt(schoolFilter) : null);
  const currentExamYearId = selectedExamYear || activeExamYear?.id;
  
  const invoicesQueryUrl = useMemo(() => {
    if (!selectedSchoolId) return null;
    const params = new URLSearchParams();
    params.set("schoolId", selectedSchoolId.toString());
    if (currentExamYearId) {
      params.set("examYearId", currentExamYearId.toString());
    }
    return `/api/invoices?${params.toString()}`;
  }, [selectedSchoolId, currentExamYearId]);

  const { data: schoolInvoices } = useQuery<any[]>({
    queryKey: [invoicesQueryUrl],
    enabled: canApproveStudents && !!invoicesQueryUrl,
  });

  // Check if the school has a paid invoice for the current exam year
  const schoolPaymentApproved = useMemo(() => {
    if (!schoolInvoices || !selectedSchoolId || !currentExamYearId) return false;
    return schoolInvoices.some(
      (inv: any) => inv.schoolId === selectedSchoolId && 
                    inv.examYearId === currentExamYearId && 
                    inv.status === 'paid'
    );
  }, [schoolInvoices, selectedSchoolId, currentExamYearId]);

  // Can only approve students if payment is approved
  const canApproveWithPayment = canApproveStudents && schoolPaymentApproved;

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
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل اعتماد الطالب" : "Failed to approve student"),
        variant: "destructive",
      });
    },
  });

  const rejectStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return apiRequest("POST", `/api/students/${studentId}/reject`);
    },
    onSuccess: () => {
      invalidateStudentQueries();
      toast({
        title: t.common.success,
        description: isRTL ? "تم رفض الطالب" : "The student has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل رفض الطالب" : "Failed to reject student"),
        variant: "destructive",
      });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      return apiRequest("POST", `/api/students/bulk-approve`, { studentIds });
    },
    onSuccess: (data: any) => {
      invalidateStudentQueries();
      setSelectedStudentIds(new Set());
      toast({
        title: t.common.success,
        description: isRTL 
          ? `تم اعتماد ${data.approved} طالب بنجاح` 
          : `Successfully approved ${data.approved} students.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل اعتماد الطلاب" : "Failed to approve students"),
        variant: "destructive",
      });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      return apiRequest("POST", `/api/students/bulk-reject`, { studentIds });
    },
    onSuccess: (data: any) => {
      invalidateStudentQueries();
      setSelectedStudentIds(new Set());
      toast({
        title: t.common.success,
        description: isRTL 
          ? `تم رفض ${data.rejected} طالب` 
          : `Rejected ${data.rejected} students.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل رفض الطلاب" : "Failed to reject students"),
        variant: "destructive",
      });
    },
  });

  // Selection helpers
  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

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

  // Toggle select all pending students (must be after filteredStudents is defined)
  const toggleSelectAll = () => {
    if (!filteredStudents) return;
    const pendingStudents = filteredStudents.filter(s => s.status === 'pending');
    if (selectedStudentIds.size === pendingStudents.length && pendingStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(pendingStudents.map(s => s.id)));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: isRTL ? "تم النسخ" : "Copied",
      description: isRTL ? "تم نسخ رقم الفهرس" : "Index number copied to clipboard",
    });
  };

  const handlePrintCards = async () => {
    try {
      setPrintingCards(true);
      
      // Build query params based on current filters
      const params = new URLSearchParams();
      if (selectedExamYear) params.append('examYearId', selectedExamYear.toString());
      if (selectedGrade) params.append('grade', selectedGrade.toString());
      if (schoolFilter && schoolFilter !== 'all') params.append('schoolId', schoolFilter);
      
      const response = await fetch(`/api/students/exam-cards/pdf?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate exam cards');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-cards.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: isRTL ? "تم التحميل" : "Downloaded",
        description: isRTL ? "تم تحميل بطاقات الامتحان بنجاح" : "Exam cards downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تحميل بطاقات الامتحان" : "Failed to download exam cards"),
        variant: "destructive",
      });
    } finally {
      setPrintingCards(false);
    }
  };

  // TIER 1: Exam Year Dashboard View
  const renderExamYearDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.students.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "لوحة تسجيل الطلاب" : "Student Registration Dashboard"}
          </p>
        </div>
        {canApproveStudents && (
          <Button 
            onClick={() => setShowAdminUploadDialog(true)}
            data-testid="button-admin-bulk-upload"
          >
            <Upload className="w-4 h-4 me-2" />
            {isRTL ? "رفع الطلاب بالجملة" : "Bulk Student Upload"}
          </Button>
        )}
      </div>

      {/* Step 1 Instructions */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-primary">
                {isRTL ? "الخطوة 1: اختر السنة الامتحانية" : "Step 1: Select Examination Year"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL 
                  ? "اختر السنة الامتحانية التي تريد تسجيل الطلاب فيها. كل سنة لها مواعيد تسجيل ورسوم مختلفة."
                  : "Choose the examination year you want to register students for. Each year has different registration deadlines and fees."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Year Cards */}
      {examYearsLoading ? (
        <GradeCardSkeleton />
      ) : (() => {
        // Filter exam years for school admins
        const filteredExamYears = (examYears as any[])?.filter((examYear) => {
          // Check if exam is past (examEndDate < current date)
          const isPast = examYear.examEndDate && new Date(examYear.examEndDate) < new Date();
          
          // For school admins, only show:
          // 1. Active exam years (can register students)
          // 2. Past exam years where school has registered students (view-only)
          // Do NOT show: inactive future years
          if (isSchoolAdmin) {
            // Always show active exam years
            if (examYear.isActive) return true;
            // For past exam years, only show if school has registered students
            if (isPast) {
              // If unscoped query is still loading, show past years temporarily (safe fallback)
              // This prevents past years from disappearing during load
              if (allSchoolStudentsLoading || !allSchoolStudents) {
                return true; // Show all past years while loading
              }
              // Once loaded, check if school has students for this past exam year
              const studentsInThisYear = allSchoolStudents.filter(s => s.examYearId === examYear.id);
              return studentsInThisYear.length > 0;
            }
            // Hide non-active, non-past (future) exam years from school admins
            return false;
          }
          // Admins can see all exam years
          return true;
        }) || [];

        return filteredExamYears.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExamYears.map((examYear) => {
            const isActive = examYear.isActive;
            const isPast = examYear.examEndDate && new Date(examYear.examEndDate) < new Date();
            const hasDeadlinePassed = examYear.registrationEndDate && new Date(examYear.registrationEndDate) < new Date();
            // Use unscoped query for school admins, scoped for admins
            const studentsInThisYear = (isSchoolAdmin ? allSchoolStudents : allStudents)?.filter(s => s.examYearId === examYear.id)?.length || 0;
            
            return (
              <Card 
                key={examYear.id}
                className={`hover-elevate active-elevate-2 cursor-pointer transition-all border-2 ${
                  isPast ? 'border-destructive/30 bg-destructive/5' :
                  isActive ? 'border-primary/50 bg-primary/5' : 'border-muted'
                } hover:shadow-lg`}
                onClick={() => {
                  setSelectedExamYear(examYear.id);
                  setSelectedGrade(null); // Reset grade when changing exam year
                }}
                data-testid={`card-exam-year-${examYear.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className={`w-14 h-14 rounded-xl ${
                      isPast ? 'bg-destructive/20' :
                      isActive ? 'bg-primary/20' : 'bg-muted'
                    } flex items-center justify-center`}>
                      <Calendar className={`w-7 h-7 ${
                        isPast ? 'text-destructive' :
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {isPast && (
                        <Badge className="bg-destructive text-destructive-foreground">
                          {isRTL ? "ماضي" : "Past"}
                        </Badge>
                      )}
                      {isActive && !isPast && (
                        <Badge className="bg-primary/10 text-primary">
                          {isRTL ? "نشطة" : "Active"}
                        </Badge>
                      )}
                      {hasDeadlinePassed && !isActive && !isPast && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          {isRTL ? "مغلق" : "Closed"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{examYear.name}</h3>
                  
                  {/* Show registered student count for this exam year */}
                  {studentsInThisYear > 0 && (
                    <p className="text-sm text-primary font-medium mb-2">
                      {isRTL ? `${studentsInThisYear} طالب مسجل` : `${studentsInThisYear} students registered`}
                    </p>
                  )}
                  
                  {isPast && isSchoolAdmin && (
                    <p className="text-xs text-muted-foreground mb-2 italic">
                      {isRTL ? "للعرض فقط - لا يمكن التعديل" : "View only - no changes allowed"}
                    </p>
                  )}
                  
                  {examYear.registrationEndDate && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {isRTL ? "آخر موعد للتسجيل: " : "Registration Deadline: "}
                      <span className={hasDeadlinePassed ? 'text-destructive' : 'text-foreground font-medium'}>
                        {new Date(examYear.registrationEndDate).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  
                  {examYear.feePerStudent && (
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? "الرسوم لكل طالب: " : "Fee per Student: "}
                      <span className="text-foreground font-medium">GMD {parseFloat(examYear.feePerStudent).toFixed(2)}</span>
                    </p>
                  )}
                  
                  {examYear.grades?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        {isRTL ? "الصفوف المتاحة:" : "Available Grades:"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {examYear.grades.map((grade: number) => (
                          <Badge key={grade} variant="outline" className="text-xs">
                            {getGradeLabel(grade, isRTL)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isRTL ? "لا توجد سنوات امتحانية" : "No Examination Years Available"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isRTL 
                ? "يرجى الانتظار حتى يتم إنشاء سنة امتحانية جديدة من قبل إدارة الامتحانات"
                : "Please wait until a new examination year is created by the examination administration"}
            </p>
          </CardContent>
        </Card>
      );
      })()}
    </div>
  );

  // TIER 2: Grade Dashboard View (after exam year is selected)
  const renderGradeDashboard = () => {
    // Check if this is a past exam year
    const isPastExamYear = selectedExamYearObj?.examEndDate && new Date(selectedExamYearObj.examEndDate) < new Date();
    const isReadOnly = isSchoolAdmin && isPastExamYear;
    
    return (
    <div className="space-y-6">
      {/* Read-only warning for past exam years */}
      {isReadOnly && (
        <Card className="border-2 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
              <div>
                <h3 className="font-semibold text-destructive">
                  {isRTL ? "سنة امتحانية منتهية - للعرض فقط" : "Past Examination Year - View Only"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? "هذه السنة الامتحانية قد انتهت. يمكنك فقط عرض الطلاب المسجلين."
                    : "This examination year has ended. You can only view registered students."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setSelectedExamYear(null);
              setSelectedGrade(null); // Also reset grade when going back
            }}
            data-testid="button-back-to-exam-years"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                {selectedExamYearObj?.name || (isRTL ? "اختر الصف" : "Select Grade")}
              </h1>
              {isPastExamYear && (
                <Badge className="bg-destructive text-destructive-foreground">
                  {isRTL ? "ماضي" : "Past"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isReadOnly 
                ? (isRTL ? "عرض الطلاب المسجلين سابقاً" : "View previously registered students")
                : (isRTL ? "الخطوة 2: اختر الصف لتسجيل الطلاب" : "Step 2: Select a grade to register students")}
            </p>
          </div>
        </div>
      </div>

      {/* Step 2 Instructions - hide for read-only mode */}
      {!isReadOnly && (
        <Card className="border-2 border-chart-2/20 bg-chart-2/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-chart-2 text-white flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-chart-2">
                  {isRTL ? "الخطوة 2: اختر الصف الدراسي" : "Step 2: Select Grade Level"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? "اختر الصف الذي تريد تسجيل الطلاب فيه. الصفوف المعروضة تعتمد على نوع مدرستك والسنة الامتحانية المختارة."
                    : "Choose the grade level you want to register students for. Grades shown depend on your school type and the selected exam year."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Exam Year Info */}
      {selectedExamYearObj && (
        <div className={`${isPastExamYear ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'} border rounded-md p-4`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${isPastExamYear ? 'bg-destructive/20' : 'bg-primary/20'} flex items-center justify-center`}>
                <Calendar className={`w-5 h-5 ${isPastExamYear ? 'text-destructive' : 'text-primary'}`} />
              </div>
              <div>
                <p className={`font-medium ${isPastExamYear ? 'text-destructive' : 'text-primary'}`}>
                  {isRTL ? "السنة الامتحانية المختارة" : "Selected Exam Year"}
                </p>
                <p className={`text-sm ${isPastExamYear ? 'text-destructive/80' : 'text-primary/80'}`}>{selectedExamYearObj.name}</p>
              </div>
            </div>
            {selectedExamYearObj.registrationEndDate && (
              <div className="text-sm">
                <span className="text-muted-foreground">{isRTL ? "آخر موعد: " : "Deadline: "}</span>
                <span className="font-medium">{new Date(selectedExamYearObj.registrationEndDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assigned Examination Center Card - For School Admins */}
      {isSchoolAdmin && assignedCenter && (
        <Card className="border-2 border-chart-3/20 bg-chart-3/5" data-testid="card-assigned-center">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-chart-3" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-chart-3">
                  {isRTL ? "مركز الامتحان المخصص" : "Your Assigned Examination Center"}
                </h3>
                <p className="text-lg font-medium mt-1">{assignedCenter.center?.name || assignedCenter.centerName}</p>
                {(assignedCenter.center?.address || assignedCenter.centerAddress) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {assignedCenter.center?.address || assignedCenter.centerAddress}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {assignedCenter.center?.contactPerson && (
                    <span>{isRTL ? "المسؤول: " : "Contact: "}{assignedCenter.center.contactPerson}</span>
                  )}
                  {assignedCenter.center?.contactPhone && (
                    <span>{assignedCenter.center.contactPhone}</span>
                  )}
                </div>
              </div>
              {assignedCenter.assignedGrades && assignedCenter.assignedGrades.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {assignedCenter.assignedGrades.map((grade: number) => (
                    <Badge key={grade} variant="secondary" className="bg-chart-3/10 text-chart-3">
                      {isRTL ? `الصف ${grade}` : `Grade ${grade}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
                  
                  {/* Hide upload buttons for read-only mode (past exam years) */}
                  {!isReadOnly ? (
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
                  ) : (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground text-center">
                        {isRTL ? "انقر للعرض" : "Click to view"}
                      </p>
                    </div>
                  )}
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
                ? "لا توجد صفوف متاحة لنوع مدرستك في هذه السنة الامتحانية"
                : "No grades are available for your school type in this exam year"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
  };

  // TIER 3: Grade Detail View (with student list and upload)
  const renderGradeDetail = () => {
    const colors = getGradeColors(selectedGrade!);
    const currentExamYear = selectedExamYearObj || activeExamYear;
    // Check if this is a past exam year (exam has ended)
    const isPastExamYear = currentExamYear?.examEndDate && new Date(currentExamYear.examEndDate) < new Date();
    // School admins can only view past exam years, not edit
    const isReadOnly = isSchoolAdmin && isPastExamYear;
    
    return (
      <div className="space-y-6">
        {/* Read-only warning for past exam years */}
        {isReadOnly && (
          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
                <div>
                  <h3 className="font-semibold text-destructive">
                    {isRTL ? "سنة امتحانية منتهية - للعرض فقط" : "Past Examination Year - View Only"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRTL 
                      ? "لا يمكن تعديل سجلات هذه السنة الامتحانية لأنها قد انتهت. يمكنك فقط عرض الطلاب المسجلين."
                      : "Records for this examination year cannot be modified as it has ended. You can only view registered students."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                  {getGradeLabel(selectedGrade!, isRTL)}
                </h1>
                {isPastExamYear && (
                  <Badge className="bg-destructive text-destructive-foreground">
                    {isRTL ? "ماضي" : "Past"}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {currentExamYear?.name} - {isReadOnly 
                  ? (isRTL ? "عرض الطلاب المسجلين" : "Viewing Registered Students")
                  : (isRTL ? "الخطوة 3: تسجيل الطلاب" : "Step 3: Register Students")}
              </p>
            </div>
          </div>
          {/* Hide action buttons for read-only mode */}
          {!isReadOnly && !isPastExamYear && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-csv">
                <Upload className="w-4 h-4 me-2" />
                {t.common.uploadCSV}
              </Button>
              <Button variant="outline" onClick={() => window.open('/api/templates/students')} data-testid="button-download-template">
                <FileSpreadsheet className="w-4 h-4 me-2" />
                {isRTL ? "القالب" : "Template"}
              </Button>
              {/* Approve All button - only when payment is approved */}
              {canApproveWithPayment && pendingCount > 0 && (
                <Button 
                  onClick={() => {
                    const pendingIds = students?.filter(s => s.status === 'pending').map(s => s.id) || [];
                    bulkApproveMutation.mutate(pendingIds);
                  }}
                  disabled={bulkApproveMutation.isPending}
                  data-testid="button-approve-all"
                >
                  {bulkApproveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 me-2" />
                  )}
                  {isRTL ? `موافقة الكل (${pendingCount})` : `Approve All (${pendingCount})`}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Step 3 Instructions */}
        <Card className="border-2 border-chart-3/20 bg-chart-3/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-chart-3 text-white flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-chart-3">
                  {isRTL ? "الخطوة 3: رفع قائمة الطلاب" : "Step 3: Upload Student List"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? "قم بتحميل قالب CSV، أدخل بيانات الطلاب، ثم ارفع الملف. بعد الرفع سيتم احتساب الفاتورة تلقائياً."
                    : "Download the CSV template, fill in student data, then upload the file. Your invoice will be calculated automatically after upload."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Exam Year Info */}
        {currentExamYear && (
          <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium text-primary">
                {isRTL ? `السنة الامتحانية: ${currentExamYear.name}` : `Exam Year: ${currentExamYear.name}`}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {getGradeLabel(selectedGrade!, isRTL)}
                </span>
                {currentExamYear.feePerStudent && (
                  <span className="font-medium">
                    GMD {parseFloat(currentExamYear.feePerStudent).toFixed(2)} / {isRTL ? "طالب" : "student"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Required Instruction Banner - for admins when payment not approved */}
        {canApproveStudents && selectedSchoolId && !schoolPaymentApproved && pendingCount > 0 && (
          <Card className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                    {isRTL ? "مطلوب موافقة الدفع" : "Payment Approval Required"}
                  </h3>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                    {isRTL 
                      ? "يرجى الموافقة على دفع المدرسة أولاً لاعتماد الطلاب تلقائياً. انتقل إلى صفحة المدفوعات للموافقة على الفاتورة، وسيتم اعتماد جميع الطلاب المسجلين تلقائياً."
                      : "Please approve the school's payment first to automatically approve students. Go to the Payments page to confirm the invoice, and all registered students will be approved automatically."}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-amber-500 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    onClick={() => window.location.href = '/dashboard/payments'}
                    data-testid="button-go-to-payments"
                  >
                    {isRTL ? "انتقل إلى المدفوعات" : "Go to Payments"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Deadline Countdown or Past Exam Message */}
        {isPastExamYear ? (
          <Card className="border-2 border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-destructive" />
                <h2 className="text-lg font-bold text-destructive">
                  {isRTL ? "انتهت السنة الامتحانية" : "Examination Year Has Passed"}
                </h2>
              </div>
              <p className="text-center text-sm text-destructive/80">
                {isRTL 
                  ? "هذه السنة الامتحانية قد انتهت. يمكنك فقط عرض سجلاتك هنا."
                  : "This examination year has already passed. You can only view your records here."}
              </p>
            </CardContent>
          </Card>
        ) : countdown && (() => {
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
                {/* Region/Cluster/School filters - only shown for admin roles, not school admins */}
                {!isSchoolAdmin && (
                  <>
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
                  </>
                )}
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
                  {canApproveStudents && selectedStudentIds.size > 0 && (
                    <span className="ms-2 text-primary font-medium">
                      ({selectedStudentIds.size} {isRTL ? "محدد" : "selected"})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Bulk actions for admins - only when payment is approved */}
                {canApproveWithPayment && selectedStudentIds.size > 0 && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => bulkApproveMutation.mutate(Array.from(selectedStudentIds))}
                      disabled={bulkApproveMutation.isPending}
                      data-testid="button-bulk-approve"
                    >
                      {bulkApproveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 me-2" />
                      )}
                      {isRTL ? `اعتماد (${selectedStudentIds.size})` : `Approve (${selectedStudentIds.size})`}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => bulkRejectMutation.mutate(Array.from(selectedStudentIds))}
                      disabled={bulkRejectMutation.isPending}
                      data-testid="button-bulk-reject"
                    >
                      {bulkRejectMutation.isPending ? (
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 me-2" />
                      )}
                      {isRTL ? `رفض (${selectedStudentIds.size})` : `Reject (${selectedStudentIds.size})`}
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrintCards}
                  disabled={printingCards || isPastExamYear}
                  data-testid="button-print-cards"
                >
                  {printingCards ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 me-2" />
                  )}
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
                      {/* Checkbox column for bulk selection - only for admins */}
                      {canApproveStudents && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={filteredStudents.filter(s => s.status === 'pending').length > 0 && 
                              selectedStudentIds.size === filteredStudents.filter(s => s.status === 'pending').length}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                      )}
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
                        {/* Checkbox for bulk selection - only for admins and pending students */}
                        {canApproveStudents && (
                          <TableCell className="w-10">
                            {student.status === 'pending' ? (
                              <Checkbox
                                checked={selectedStudentIds.has(student.id)}
                                onCheckedChange={() => toggleStudentSelection(student.id)}
                                data-testid={`checkbox-student-${student.id}`}
                              />
                            ) : (
                              <div className="w-4" />
                            )}
                          </TableCell>
                        )}
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
                              {/* Approve/Reject actions - only when payment is approved */}
                              {canApproveWithPayment && student.status === 'pending' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => approveStudentMutation.mutate(student.id)}
                                    className="text-chart-3"
                                    data-testid={`button-approve-${student.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4 me-2" />
                                    {t.common.approve}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => rejectStudentMutation.mutate(student.id)}
                                    className="text-destructive"
                                    data-testid={`button-reject-${student.id}`}
                                  >
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
          {students.length > 0 && (
            <CardFooter className="border-t p-4 flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {isRTL 
                  ? `عرض ${students.length > 0 ? (currentPage * pageSize + 1) : 0} - ${Math.min((currentPage + 1) * pageSize, totalStudents)} من ${totalStudents}` 
                  : `Showing ${students.length > 0 ? (currentPage * pageSize + 1) : 0} to ${Math.min((currentPage + 1) * pageSize, totalStudents)} of ${totalStudents}`}
              </div>
              <div className="flex items-center gap-2">
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(0);
                }} data-testid="select-student-page-size">
                  <SelectTrigger className="w-[100px]" data-testid="select-student-page-size-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  data-testid="button-student-prev-page"
                >
                  ←
                </Button>
                <span className="text-sm">
                  {isRTL ? `صفحة ${currentPage + 1} من ${totalPages || 1}` : `Page ${currentPage + 1} of ${totalPages || 1}`}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  data-testid="button-student-next-page"
                >
                  →
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {selectedExamYear === null 
        ? renderExamYearDashboard() 
        : selectedGrade === null 
          ? renderGradeDashboard() 
          : renderGradeDetail()}

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

      {/* Admin Bulk Upload Dialog with School Matching */}
      <Dialog open={showAdminUploadDialog} onOpenChange={(open) => {
        if (!open) resetAdminUpload();
        setShowAdminUploadDialog(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {isRTL ? "رفع الطلاب مع مطابقة المدارس" : "Bulk Student Upload with School Matching"}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "قم برفع ملف Excel أو CSV يحتوي على أسماء الطلاب والمدارس. سيتم مطابقة المدارس تلقائياً."
                : "Upload an Excel or CSV file with student names and schools. Schools will be automatically matched."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Step 1: Select Exam Year and Grade */}
            {adminUploadPhase === 'idle' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{isRTL ? "السنة الامتحانية" : "Exam Year"}</label>
                    <Select 
                      value={adminUploadExamYear?.toString() || ""} 
                      onValueChange={(v) => setAdminUploadExamYear(parseInt(v))}
                      data-testid="select-admin-upload-exam-year"
                    >
                      <SelectTrigger data-testid="select-admin-upload-exam-year-trigger">
                        <SelectValue placeholder={isRTL ? "اختر السنة" : "Select Year"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(examYears as any[])?.map((ey: any) => (
                          <SelectItem key={ey.id} value={ey.id.toString()}>{ey.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{isRTL ? "الصف" : "Grade"}</label>
                    <Select 
                      value={adminUploadGrade?.toString() || ""} 
                      onValueChange={(v) => setAdminUploadGrade(parseInt(v))}
                      data-testid="select-admin-upload-grade"
                    >
                      <SelectTrigger data-testid="select-admin-upload-grade-trigger">
                        <SelectValue placeholder={isRTL ? "اختر الصف" : "Select Grade"} />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 6, 9, 12].map((g) => (
                          <SelectItem key={g} value={g.toString()}>
                            {isRTL ? `الصف ${g}` : `Grade ${g}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => adminFileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {adminUploadFile 
                      ? adminUploadFile.name 
                      : (isRTL ? "اسحب وأفلت ملف Excel أو CSV هنا، أو انقر للتصفح" : "Drag and drop your Excel or CSV file here, or click to browse")}
                  </p>
                  <Button variant="outline" size="sm" type="button" data-testid="button-select-admin-upload-file">
                    {isRTL ? "اختر ملف" : "Choose File"}
                  </Button>
                  <input
                    ref={adminFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    hidden
                    onChange={(e) => setAdminUploadFile(e.target.files?.[0] || null)}
                    data-testid="input-admin-upload-file"
                  />
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">{isRTL ? "الأعمدة المطلوبة:" : "Required columns:"}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>{isRTL ? "اسم الطالب (أو الاسم الأول واسم العائلة)" : "Student Name (or First Name and Last Name)"}</li>
                    <li>{isRTL ? "اسم المدرسة" : "School Name"}</li>
                    <li>{isRTL ? "المنطقة (اختياري - يساعد في المطابقة)" : "Region (optional - helps with matching)"}</li>
                    <li>{isRTL ? "المجموعة (اختياري - يساعد في المطابقة)" : "Cluster (optional - helps with matching)"}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {(adminUploadPhase === 'uploading' || adminUploadPhase === 'parsing' || adminUploadPhase === 'matching' || adminUploadPhase === 'confirming') && (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {adminUploadPhase === 'uploading' && (isRTL ? "جاري الرفع..." : "Uploading...")}
                      {adminUploadPhase === 'parsing' && (isRTL ? "جاري تحليل الملف..." : "Parsing file...")}
                      {adminUploadPhase === 'matching' && (isRTL ? "جاري مطابقة المدارس..." : "Matching schools...")}
                      {adminUploadPhase === 'confirming' && (isRTL ? "جاري حفظ الطلاب..." : "Saving students...")}
                    </span>
                    <span className="font-semibold">{adminUploadProgress}%</span>
                  </div>
                  <Progress value={adminUploadProgress} className="w-full h-3" />
                </div>
              </div>
            )}

            {/* Preview Results */}
            {adminUploadPhase === 'preview' && adminUploadSummary && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p>
                    <p className="text-xl font-bold">{adminUploadSummary.total}</p>
                  </Card>
                  <Card className="p-3 border-chart-3">
                    <p className="text-xs text-muted-foreground">{isRTL ? "مطابق" : "Matched"}</p>
                    <p className="text-xl font-bold text-chart-3">{adminUploadSummary.matched}</p>
                  </Card>
                  <Card className="p-3 border-yellow-500">
                    <p className="text-xs text-muted-foreground">{isRTL ? "غير مؤكد" : "Ambiguous"}</p>
                    <p className="text-xl font-bold text-yellow-500">{adminUploadSummary.ambiguous}</p>
                  </Card>
                  <Card className="p-3 border-destructive">
                    <p className="text-xs text-muted-foreground">{isRTL ? "غير مطابق" : "Unmatched"}</p>
                    <p className="text-xl font-bold text-destructive">{adminUploadSummary.unmatched + adminUploadSummary.errors}</p>
                  </Card>
                </div>

                {/* Preview Table */}
                <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{isRTL ? "الطالب" : "Student"}</TableHead>
                        <TableHead>{isRTL ? "المدرسة (الملف)" : "School (File)"}</TableHead>
                        <TableHead>{isRTL ? "المدرسة المطابقة" : "Matched School"}</TableHead>
                        <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUploadPreview.slice(0, 100).map((row, idx) => (
                        <TableRow key={idx} className={row.status === 'error' || row.status === 'unmatched' ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-mono text-xs">{row.row}</TableCell>
                          <TableCell className="font-medium">
                            {row.firstName} {row.middleName} {row.lastName}
                          </TableCell>
                          <TableCell className="text-sm">{row.schoolName}</TableCell>
                          <TableCell className="text-sm">
                            {row.matchedSchoolName || (
                              <span className="text-muted-foreground italic">
                                {isRTL ? "لم يتم المطابقة" : "Not matched"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={row.status === 'matched' ? 'default' : row.status === 'ambiguous' ? 'secondary' : 'destructive'}
                              className={row.status === 'matched' ? 'bg-chart-3' : ''}
                            >
                              {row.status === 'matched' && (isRTL ? "مطابق" : "Matched")}
                              {row.status === 'ambiguous' && (isRTL ? "غير مؤكد" : "Ambiguous")}
                              {row.status === 'unmatched' && (isRTL ? "غير مطابق" : "Unmatched")}
                              {row.status === 'error' && (isRTL ? "خطأ" : "Error")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {adminUploadPreview.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {isRTL 
                      ? `عرض أول 100 صف من ${adminUploadPreview.length}`
                      : `Showing first 100 rows of ${adminUploadPreview.length}`}
                  </p>
                )}
              </div>
            )}

            {/* Complete */}
            {adminUploadPhase === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-chart-3 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {isRTL ? "تم الرفع بنجاح!" : "Upload Complete!"}
                </h3>
                <p className="text-muted-foreground">
                  {isRTL ? "تم إضافة الطلاب بنجاح" : "Students have been added successfully"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            {adminUploadPhase === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setShowAdminUploadDialog(false)} data-testid="button-cancel-admin-upload">
                  {t.common.cancel}
                </Button>
                <Button 
                  disabled={!adminUploadFile || !adminUploadExamYear || !adminUploadGrade}
                  onClick={() => adminUploadFile && adminUploadPreviewMutation.mutate(adminUploadFile)}
                  data-testid="button-analyze-admin-upload"
                >
                  <FileSearch className="w-4 h-4 me-2" />
                  {isRTL ? "تحليل ومطابقة" : "Analyze & Match"}
                </Button>
              </>
            )}
            {adminUploadPhase === 'preview' && (
              <>
                <Button variant="outline" onClick={resetAdminUpload} data-testid="button-back-admin-upload">
                  {isRTL ? "رجوع" : "Back"}
                </Button>
                <Button 
                  disabled={!adminUploadPreview.some(s => s.matchedSchoolId)}
                  onClick={() => adminUploadConfirmMutation.mutate()}
                  data-testid="button-confirm-admin-upload"
                >
                  <CheckCircle className="w-4 h-4 me-2" />
                  {isRTL 
                    ? `إضافة ${adminUploadPreview.filter(s => s.matchedSchoolId).length} طالب`
                    : `Add ${adminUploadPreview.filter(s => s.matchedSchoolId).length} Students`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Summary Dialog */}
      <Dialog open={showInvoiceSummary} onOpenChange={setShowInvoiceSummary}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {isRTL ? "ملخص الفاتورة" : "Invoice Summary"}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "تم حساب الفاتورة تلقائياً بناءً على عدد الطلاب المسجلين"
                : "Invoice has been automatically calculated based on registered students"}
            </DialogDescription>
          </DialogHeader>
          
          {generatedInvoice?.invoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? "رقم الفاتورة" : "Invoice Number"}</span>
                  <span className="font-mono">{generatedInvoice.invoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? "إجمالي الطلاب" : "Total Students"}</span>
                  <span className="font-semibold">{generatedInvoice.invoice.totalStudents}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? "الرسوم لكل طالب" : "Fee per Student"}</span>
                  <span>GMD {parseFloat(generatedInvoice.invoice.feePerStudent || 0).toFixed(2)}</span>
                </div>
              </div>

              {generatedInvoice.items?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{isRTL ? "تفاصيل حسب الصف" : "Breakdown by Grade"}</h4>
                  <div className="bg-muted/30 rounded-lg divide-y">
                    {generatedInvoice.items.map((item: any) => (
                      <div key={item.grade} className="flex items-center justify-between p-3 text-sm">
                        <span>{getGradeLabel(item.grade, isRTL)}</span>
                        <span className="text-muted-foreground">
                          {item.studentCount} × GMD {parseFloat(item.feePerStudent).toFixed(2)} = 
                          <span className="font-medium text-foreground ms-1">GMD {parseFloat(item.subtotal).toFixed(2)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</span>
                  <span className="font-bold text-2xl text-primary">
                    GMD {parseFloat(generatedInvoice.invoice.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {isRTL 
                    ? "يرجى الانتقال إلى صفحة المدفوعات لإتمام عملية الدفع"
                    : "Please proceed to the Payments page to complete your payment"}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowInvoiceSummary(false)}>
              {isRTL ? "إغلاق" : "Close"}
            </Button>
            <Button onClick={() => {
              setShowInvoiceSummary(false);
              window.location.href = '/payments';
            }} data-testid="button-go-to-payments">
              <CreditCard className="w-4 h-4 me-2" />
              {isRTL ? "الانتقال إلى المدفوعات" : "Go to Payments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
