import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Award,
  Download,
  User,
  School,
  MapPin,
  Building2,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Loader2,
  Wand2,
  Edit,
  Calendar,
  Users,
  AlertCircle,
  FileCheck2,
  Printer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, Cluster, School as SchoolType, ExamYear, Certificate } from "@shared/schema";

interface EligibleStudent {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  indexNumber: string | null;
  grade: number;
  gender: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  schoolId: number;
  hasResults: boolean;
  resultCount: number;
  finalGrade: string | null;
  passed: boolean;
  missingFields: string[];
  isEligible: boolean;
  hasCertificate: boolean;
}

interface GenderDetectionResult {
  gender: 'male' | 'female' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  matchedName?: string;
  matchType?: string;
}

function CertificatesTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function GeneratingOverlay({ isRTL, count }: { isRTL: boolean; count: number }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-8 rounded-lg shadow-lg border max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <div className="relative w-20 h-20 mx-auto">
            <Loader2 className="w-20 h-20 text-primary animate-spin" />
            <Award className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isRTL ? "جاري إنشاء الشهادات..." : "Generating Certificates..."}
        </h3>
        <p className="text-muted-foreground mb-4">
          {isRTL 
            ? `يرجى الانتظار، جاري إنشاء ${count} شهادة`
            : `Please wait, generating ${count} certificate(s)`}
        </p>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {isRTL 
            ? "قد يستغرق هذا بضع ثوانٍ لكل شهادة"
            : "This may take a few seconds per certificate"}
        </p>
      </div>
    </div>
  );
}

export default function Certificates() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EligibleStudent | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editForm, setEditForm] = useState({
    gender: '' as string,
    dateOfBirth: '' as string,
    placeOfBirth: '' as string,
  });
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<EligibleStudent | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [generatingCount, setGeneratingCount] = useState<number>(0);

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: schoolsResponse } = useQuery<{ data: SchoolType[]; total: number }>({
    queryKey: ["/api/schools"],
  });
  
  const schools = schoolsResponse?.data || [];

  const activeExamYear = examYears?.find(y => y.isActive);

  useEffect(() => {
    if (activeExamYear && !selectedExamYear) {
      setSelectedExamYear(activeExamYear.id.toString());
    }
  }, [activeExamYear, selectedExamYear]);

  const filteredClusters = clusters?.filter(c => 
    selectedRegion === "all" || c.regionId === parseInt(selectedRegion)
  ) || [];

  const filteredSchools = schools.filter(s => {
    if (selectedRegion !== "all" && s.regionId !== parseInt(selectedRegion)) return false;
    if (selectedCluster !== "all" && s.clusterId !== parseInt(selectedCluster)) return false;
    return true;
  });

  const { data: eligibleStudentsData, isLoading: eligibleLoading } = useQuery<{
    students: EligibleStudent[];
    total: number;
    limit: number;
    offset: number;
    summary: {
      total: number;
      eligible: number;
      withCertificate: number;
      missingData: number;
      noResults: number;
      failed: number;
    };
  }>({
    queryKey: ["/api/certificates/eligible-students", selectedExamYear, selectedSchool, selectedGrade, pageSize, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedExamYear) params.append("examYearId", selectedExamYear);
      if (selectedSchool && selectedSchool !== "all") params.append("schoolId", selectedSchool);
      if (selectedGrade && selectedGrade !== "all") params.append("grade", selectedGrade);
      params.append("limit", pageSize.toString());
      params.append("offset", ((currentPage - 1) * pageSize).toString());
      const response = await fetch(`/api/certificates/eligible-students?${params}`);
      if (!response.ok) throw new Error("Failed to fetch eligible students");
      return response.json();
    },
    enabled: !!selectedExamYear,
  });

  // Fetch all certificates for the selected exam year
  const { data: allCertificates } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates", selectedExamYear],
    queryFn: async () => {
      const response = await fetch(`/api/certificates?examYearId=${selectedExamYear}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedExamYear,
  });

  // Get certificate for a specific student
  const getStudentCertificate = (studentId: number): Certificate | undefined => {
    return allCertificates?.find(c => c.studentId === studentId);
  };

  const { data: detectedGender } = useQuery<GenderDetectionResult>({
    queryKey: ["/api/students/detect-gender", editingStudent?.firstName],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/students/detect-gender", {
        names: editingStudent?.firstName + " " + (editingStudent?.middleName || ""),
      });
      return response.json();
    },
    enabled: !!editingStudent && showEditDialog,
  });

  const generatePrimaryMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      setGeneratingCount(studentIds.length);
      const response = await apiRequest("POST", "/api/certificates/generate-primary", {
        studentIds,
        examYearId: parseInt(selectedExamYear),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingCount(0);
      const errorCount = data.errors?.length || 0;
      
      if (data.generated > 0 && errorCount > 0) {
        const errorNames = data.errors.slice(0, 3).map((e: any) => e.studentName || 'Unknown').join(', ');
        toast({
          title: isRTL ? "تم إنشاء بعض الشهادات" : "Some Certificates Generated",
          description: isRTL 
            ? `تم إنشاء ${data.generated} شهادة، فشل ${errorCount}: ${errorNames}${errorCount > 3 ? '...' : ''}`
            : `Generated ${data.generated}, failed ${errorCount}: ${errorNames}${errorCount > 3 ? '...' : ''}`,
        });
      } else if (data.generated > 0) {
        toast({
          title: isRTL ? "تم إنشاء الشهادات" : "Certificates Generated",
          description: isRTL 
            ? `تم إنشاء ${data.generated} شهادة بنجاح`
            : `Successfully generated ${data.generated} certificate(s)`,
        });
      } else if (errorCount > 0) {
        const errorMsg = data.errors.map((e: any) => e.studentName ? `${e.studentName}: ${e.error}` : e.error).join(', ');
        toast({
          title: isRTL ? "لم يتم إنشاء شهادات" : "No Certificates Generated",
          description: errorMsg || (isRTL ? "تحقق من بيانات الطلاب" : "Check student data"),
          variant: "destructive",
        });
      } else {
        toast({
          title: isRTL ? "لم يتم إنشاء شهادات" : "No Certificates Generated",
          description: isRTL ? "جميع الطلاب لديهم شهادات بالفعل أو غير مؤهلين" : "All students already have certificates or are not eligible",
        });
      }
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key[0] === "/api/certificates/eligible-students" ||
            key[0] === "/api/certificates"
          );
        }
      });
    },
    onError: (error: Error) => {
      setGeneratingCount(0);
      toast({
        title: isRTL ? "خطأ في الإنشاء" : "Generation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: { studentId: number; gender: string; dateOfBirth: string; placeOfBirth: string }) => {
      const response = await apiRequest("PATCH", `/api/students/${data.studentId}/certificate-info`, {
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isRTL ? "تم التحديث" : "Updated",
        description: isRTL ? "تم تحديث بيانات الطالب بنجاح" : "Student data updated successfully",
      });
      setShowEditDialog(false);
      setEditingStudent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/eligible-students"] });
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditStudent = (student: EligibleStudent) => {
    setEditingStudent(student);
    setEditForm({
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth || '',
      placeOfBirth: student.placeOfBirth || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveStudentInfo = () => {
    if (!editingStudent) return;
    updateStudentMutation.mutate({
      studentId: editingStudent.id,
      gender: editForm.gender,
      dateOfBirth: editForm.dateOfBirth,
      placeOfBirth: editForm.placeOfBirth,
    });
  };

  useEffect(() => {
    if (detectedGender && detectedGender.gender !== 'unknown' && !editForm.gender) {
      setEditForm(prev => ({ ...prev, gender: detectedGender.gender }));
    }
  }, [detectedGender, editForm.gender]);

  const handlePreview = (student: EligibleStudent) => {
    setPreviewStudent(student);
    const cert = getStudentCertificate(student.id);
    setPreviewCertificate(cert || null);
    setShowPreviewDialog(true);
  };

  const handleDownload = (certificateId: number) => {
    window.open(`/api/certificates/${certificateId}/download`, '_blank');
  };

  const handlePrintAll = () => {
    const studentsWithCerts = eligibleStudentsData?.students?.filter(s => s.hasCertificate) || [];
    if (studentsWithCerts.length === 0) {
      toast({
        title: isRTL ? "لا توجد شهادات للطباعة" : "No Certificates to Print",
        description: isRTL ? "يرجى إنشاء الشهادات أولاً." : "Please generate certificates first.",
        variant: "destructive",
      });
      return;
    }
    
    // Open all certificate PDFs
    studentsWithCerts.forEach((student, index) => {
      const cert = getStudentCertificate(student.id);
      if (cert) {
        setTimeout(() => {
          window.open(`/api/certificates/${cert.id}/download`, '_blank');
        }, index * 500);
      }
    });
    
    toast({
      title: isRTL ? "جاري الطباعة" : "Printing",
      description: isRTL 
        ? `جاري فتح ${studentsWithCerts.length} شهادة للطباعة.`
        : `Opening ${studentsWithCerts.length} certificates for printing.`,
    });
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {generatePrimaryMutation.isPending && generatingCount > 0 && (
        <GeneratingOverlay isRTL={isRTL} count={generatingCount} />
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center gap-2">
            <FileCheck2 className="w-7 h-7 text-primary" />
            {isRTL ? "شهادة إتمام المرحلة" : "Primary Completion Certificates"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL 
              ? "إنشاء شهادات عربية رسمية مع كشف تلقائي للجنس من الأسماء" 
              : "Generate official Arabic certificates with automatic gender detection from names"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrintAll}
            disabled={!eligibleStudentsData?.summary?.withCertificate}
            data-testid="button-print-all"
          >
            <Printer className="w-4 h-4 me-2" />
            {isRTL 
              ? `طباعة الكل (${eligibleStudentsData?.summary?.withCertificate || 0})` 
              : `Print All (${eligibleStudentsData?.summary?.withCertificate || 0})`}
          </Button>
          <Button
            onClick={() => {
              const eligibleIds = eligibleStudentsData?.students
                ?.filter(s => s.isEligible && !s.hasCertificate)
                .map(s => s.id) || [];
              if (eligibleIds.length > 0) {
                generatePrimaryMutation.mutate(eligibleIds);
              } else {
                toast({
                  title: isRTL ? "لا توجد طلاب مؤهلين" : "No Eligible Students",
                  description: isRTL 
                    ? "يجب أن يكون لدى الطلاب بيانات كاملة ونتائج منشورة." 
                    : "Students must have complete data and published results.",
                  variant: "destructive",
                });
              }
            }}
            disabled={generatePrimaryMutation.isPending || !eligibleStudentsData?.summary?.eligible}
            data-testid="button-generate-all"
          >
            {generatePrimaryMutation.isPending ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Award className="w-4 h-4 me-2" />
            )}
            {isRTL 
              ? `إنشاء الشهادات (${eligibleStudentsData?.students?.filter(s => s.isEligible && !s.hasCertificate).length || 0})` 
              : `Generate All (${eligibleStudentsData?.students?.filter(s => s.isEligible && !s.hasCertificate).length || 0})`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{isRTL ? "تصفية الطلاب" : "Filter Students"}</CardTitle>
          <CardDescription>
            {isRTL ? "حدد المنطقة والمجموعة والمدرسة لعرض الطلاب المؤهلين" : "Select region, cluster, and school to view eligible students"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Award className="w-4 h-4 text-muted-foreground" />
                {isRTL ? "السنة الامتحانية" : "Exam Year"}
              </Label>
              <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
                <SelectTrigger data-testid="select-exam-year">
                  <SelectValue placeholder={isRTL ? "اختر السنة" : "Select Year"} />
                </SelectTrigger>
                <SelectContent>
                  {examYears?.map(year => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name} {year.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {t.schools.region}
              </Label>
              <Select value={selectedRegion} onValueChange={(value) => {
                setSelectedRegion(value);
                setSelectedCluster("all");
                setSelectedSchool("all");
              }}>
                <SelectTrigger data-testid="select-region">
                  <SelectValue placeholder={isRTL ? "الكل" : "All Regions"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "الكل" : "All Regions"}</SelectItem>
                  {regions?.map(region => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                {t.schools.cluster}
              </Label>
              <Select 
                value={selectedCluster} 
                onValueChange={(value) => {
                  setSelectedCluster(value);
                  setSelectedSchool("all");
                }}
              >
                <SelectTrigger data-testid="select-cluster">
                  <SelectValue placeholder={isRTL ? "الكل" : "All Clusters"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "الكل" : "All Clusters"}</SelectItem>
                  {filteredClusters.map(cluster => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <School className="w-4 h-4 text-muted-foreground" />
                {t.schools.title}
              </Label>
              <Select 
                value={selectedSchool} 
                onValueChange={setSelectedSchool}
              >
                <SelectTrigger data-testid="select-school">
                  <SelectValue placeholder={isRTL ? "الكل" : "All Schools"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "الكل" : "All Schools"}</SelectItem>
                  {filteredSchools.map(school => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                {isRTL ? "الصف" : "Grade"}
              </Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger data-testid="select-grade">
                  <SelectValue placeholder={isRTL ? "الكل" : "All Grades"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "الكل" : "All Grades"}</SelectItem>
                  {[6, 9, 12].map(grade => (
                    <SelectItem key={grade} value={grade.toString()}>
                      {isRTL ? `الصف ${grade}` : `Grade ${grade}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {eligibleStudentsData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-semibold">{eligibleStudentsData.summary.total}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-chart-3">{eligibleStudentsData.summary.eligible}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "مؤهل" : "Eligible"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-chart-2">{eligibleStudentsData.summary.withCertificate}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "لديه شهادة" : "Has Cert"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-amber-500">{eligibleStudentsData.summary.missingData}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "بيانات ناقصة" : "Missing Data"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-500">{eligibleStudentsData.summary.noResults}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "بلا نتائج" : "No Results"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-destructive">{eligibleStudentsData.summary.failed}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "راسب" : "Failed"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {isRTL ? "قائمة الطلاب" : "Student List"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "الطلاب الذين اجتازوا الامتحان ومؤهلون للحصول على الشهادة" 
              : "Students who passed the examination and are eligible for certificates"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedExamYear ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{isRTL ? "اختر سنة امتحانية" : "Select Exam Year"}</h3>
              <p className="text-muted-foreground">
                {isRTL ? "اختر سنة امتحانية لعرض الطلاب المؤهلين" : "Select an exam year to view eligible students"}
              </p>
            </div>
          ) : eligibleLoading ? (
            <CertificatesTableSkeleton />
          ) : eligibleStudentsData?.students && eligibleStudentsData.students.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {isRTL 
                      ? `عرض ${eligibleStudentsData.students.length} من ${eligibleStudentsData.total} (الصفحة ${currentPage})`
                      : `Showing ${eligibleStudentsData.students.length} of ${eligibleStudentsData.total} (Page ${currentPage})`}
                  </div>
                  <Select value={pageSize.toString()} onValueChange={(val) => {
                    setPageSize(parseInt(val));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-32" data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">{isRTL ? "10 الصفات" : "10 Items"}</SelectItem>
                      <SelectItem value="50">{isRTL ? "50 الصفات" : "50 Items"}</SelectItem>
                      <SelectItem value="100">{isRTL ? "100 الصفات" : "100 Items"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "الطالب" : "Student"}</TableHead>
                      <TableHead>{isRTL ? "رقم الفهرس" : "Index"}</TableHead>
                      <TableHead>{isRTL ? "الصف" : "Grade"}</TableHead>
                      <TableHead>{isRTL ? "الجنس" : "Gender"}</TableHead>
                      <TableHead>{isRTL ? "النتيجة" : "Result"}</TableHead>
                      <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                      <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleStudentsData.students.map((student) => (
                    <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student.firstName} {student.middleName || ''} {student.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.placeOfBirth || (isRTL ? "مكان غير محدد" : "No place")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {student.indexNumber || "-"}
                        </code>
                      </TableCell>
                      <TableCell>{student.grade}</TableCell>
                      <TableCell>
                        {student.gender ? (
                          <Badge variant="outline">
                            {student.gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-amber-600">
                            <AlertCircle className="w-3 h-3 me-1" />
                            {isRTL ? "غير محدد" : "Not Set"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.finalGrade ? (
                          <Badge variant={student.passed ? "default" : "destructive"}>
                            {student.finalGrade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.hasCertificate ? (
                          <Badge className="bg-chart-3/10 text-chart-3">
                            <CheckCircle2 className="w-3 h-3 me-1" />
                            {isRTL ? "لديه شهادة" : "Has Cert"}
                          </Badge>
                        ) : student.isEligible ? (
                          <Badge className="bg-chart-2/10 text-chart-2">
                            <CheckCircle2 className="w-3 h-3 me-1" />
                            {isRTL ? "مؤهل" : "Eligible"}
                          </Badge>
                        ) : student.missingFields.length > 0 ? (
                          <Badge variant="outline" className="text-amber-600">
                            <AlertTriangle className="w-3 h-3 me-1" />
                            {isRTL ? "بيانات ناقصة" : "Missing Data"}
                          </Badge>
                        ) : !student.hasResults ? (
                          <Badge variant="secondary">
                            {isRTL ? "بلا نتائج" : "No Results"}
                          </Badge>
                        ) : !student.passed ? (
                          <Badge variant="destructive">
                            {isRTL ? "راسب" : "Failed"}
                          </Badge>
                        ) : (
                          <Badge className="bg-chart-2/10 text-chart-2">
                            <CheckCircle2 className="w-3 h-3 me-1" />
                            {isRTL ? "ناجح" : "Passed"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={isRTL ? "text-left" : "text-right"}>
                        <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : "justify-end"}`}>
                          {student.missingFields.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStudent(student)}
                              data-testid={`button-edit-${student.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {student.isEligible && !student.hasCertificate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => generatePrimaryMutation.mutate([student.id])}
                              disabled={generatePrimaryMutation.isPending}
                              data-testid={`button-generate-${student.id}`}
                            >
                              {generatePrimaryMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Award className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {student.hasCertificate && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(student)}
                                data-testid={`button-preview-${student.id}`}
                                title={isRTL ? "معاينة" : "Preview"}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const cert = getStudentCertificate(student.id);
                                  if (cert) handleDownload(cert.id);
                                }}
                                data-testid={`button-download-${student.id}`}
                                title={isRTL ? "تنزيل" : "Download"}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  {isRTL ? "السابق" : "Previous"}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {isRTL ? `الصفحة ${currentPage}` : `Page ${currentPage}`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!eligibleStudentsData?.students || eligibleStudentsData.students.length < pageSize}
                  data-testid="button-next-page"
                >
                  {isRTL ? "التالي" : "Next"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{isRTL ? "لا توجد طلاب" : "No Students Found"}</h3>
              <p className="text-muted-foreground">
                {isRTL 
                  ? "لا يوجد طلاب مطابقون للمعايير المحددة" 
                  : "No students match the selected criteria"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تحديث بيانات الطالب" : "Update Student Data"}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? `تحديث بيانات ${editingStudent?.firstName} ${editingStudent?.lastName} للشهادة`
                : `Update ${editingStudent?.firstName} ${editingStudent?.lastName}'s data for certificate`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الجنس" : "Gender"}</Label>
              {detectedGender && detectedGender.gender !== 'unknown' && (
                <div className="flex items-center gap-2 p-2 bg-chart-2/10 rounded-md text-sm mb-2">
                  <Wand2 className="w-4 h-4 text-chart-2" />
                  <span>
                    {isRTL ? "كشف تلقائي:" : "Auto-detected:"}{" "}
                    <strong>{detectedGender.gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female')}</strong>
                    {" "}({detectedGender.confidence})
                    {detectedGender.matchedName && (
                      <span className="text-muted-foreground"> - {detectedGender.matchedName}</span>
                    )}
                  </span>
                </div>
              )}
              <Select value={editForm.gender} onValueChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue placeholder={isRTL ? "اختر الجنس" : "Select Gender"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{isRTL ? "ذكر" : "Male"}</SelectItem>
                  <SelectItem value="female">{isRTL ? "أنثى" : "Female"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {isRTL ? "تاريخ الميلاد" : "Date of Birth"}
              </Label>
              <Input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                data-testid="input-edit-dob"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {isRTL ? "مكان الميلاد" : "Place of Birth"}
              </Label>
              <Input
                value={editForm.placeOfBirth}
                onChange={(e) => setEditForm(prev => ({ ...prev, placeOfBirth: e.target.value }))}
                placeholder={isRTL ? "مثال: بانجول، غامبيا" : "e.g., Banjul, The Gambia"}
                data-testid="input-edit-place"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              onClick={handleSaveStudentInfo}
              disabled={updateStudentMutation.isPending}
            >
              {updateStudentMutation.isPending ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 me-2" />
              )}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {isRTL ? "معاينة الشهادة" : "Certificate Preview"}
            </DialogTitle>
            <DialogDescription>
              {previewStudent && (
                <span>
                  {previewStudent.firstName} {previewStudent.middleName || ''} {previewStudent.lastName}
                  {previewStudent.finalGrade && (
                    <> - {isRTL ? "الدرجة:" : "Grade:"} {previewStudent.finalGrade}</>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {previewCertificate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "رقم الشهادة" : "Certificate Number"}</p>
                  <p className="font-mono font-medium">{previewCertificate.certificateNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "تاريخ الإصدار" : "Issue Date"}</p>
                  <p className="font-medium">
                    {previewCertificate.issuedDate 
                      ? new Date(previewCertificate.issuedDate).toLocaleDateString() 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الصف" : "Grade"}</p>
                  <p className="font-medium">{previewCertificate.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "عدد الطباعات" : "Print Count"}</p>
                  <p className="font-medium">{previewCertificate.printCount || 0}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 text-center">
                <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {isRTL ? "اضغط على زر التنزيل لعرض الشهادة الكاملة" : "Click download to view the full certificate PDF"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {isRTL ? "لم يتم العثور على الشهادة" : "Certificate not found"}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t.common.cancel}
            </Button>
            {previewCertificate && (
              <Button onClick={() => handleDownload(previewCertificate.id)}>
                <Download className="w-4 h-4 me-2" />
                {isRTL ? "تنزيل PDF" : "Download PDF"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
