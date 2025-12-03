import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload,
  Download,
  FileSpreadsheet,
  FileCheck,
  Clock,
  Send,
  BarChart3,
  User,
  Users,
  Edit,
  Loader2,
  AlertCircle,
  FileUp,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudentResult, Student, Subject, School, Cluster, Region, ExamYear } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  validated: "bg-chart-2/10 text-chart-2",
  published: "bg-chart-3/10 text-chart-3",
};

const gradeColors: Record<string, string> = {
  'A': "bg-chart-3/10 text-chart-3",
  'A+': "bg-chart-3/10 text-chart-3",
  'B': "bg-chart-2/10 text-chart-2",
  'C': "bg-chart-4/10 text-chart-4",
  'D': "bg-chart-5/10 text-chart-5",
  'E': "bg-chart-5/10 text-chart-5",
  'F': "bg-destructive/10 text-destructive",
};

const getResultStatusLabel = (status: string, isRTL: boolean) => {
  const labels: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    validated: { en: "Validated", ar: "تم التحقق" },
    published: { en: "Published", ar: "منشور" },
  };
  return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
};

interface ResultWithRelations extends StudentResult {
  student?: Student & { school?: { name: string } };
  subject?: Subject;
}

interface StudentWithSchool extends Student {
  school?: { id: number; name: string } | null;
  cluster?: { id: number; name: string } | null;
}

function ResultsTableSkeleton() {
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
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function Results() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>("all");
  const [resultGradeFilter, setResultGradeFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<ResultWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showComprehensiveUploadDialog, setShowComprehensiveUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [uploadProgress, setUploadProgress] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [comprehensiveProgress, setComprehensiveProgress] = useState<{
    stage: 'uploading' | 'processing' | 'complete' | 'error';
    percentage: number;
    message: string;
    summary?: {
      totalRows: number;
      processed: number;
      regionsCreated: number;
      clustersCreated: number;
      schoolsCreated: number;
      studentsCreated: number;
      subjectsCreated: number;
      resultsCreated: number;
      skippedNoMarks: number;
      errorsCount: number;
    };
    schoolCredentials?: Array<{
      schoolName: string;
      region: string;
      cluster: string;
      username: string;
      password: string;
      schoolId: number;
    }>;
    errors?: any[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comprehensiveFileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: activeExamYear } = useQuery<ExamYear>({
    queryKey: ["/api/exam-years/active"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: schools } = useQuery<{ data: School[] } | School[]>({
    queryKey: ["/api/schools"],
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const schoolsList = Array.isArray(schools) ? schools : schools?.data || [];

  // Filter schools based on selected region and cluster
  const filteredSchools = schoolsList.filter((school: School) => {
    if (regionFilter !== "all") {
      const matchingClusters = clusters?.filter(c => c.regionId === parseInt(regionFilter)) || [];
      const clusterIds = new Set(matchingClusters.map(c => c.id));
      if (school.clusterId && !clusterIds.has(school.clusterId)) return false;
    }
    if (clusterFilter !== "all") {
      if (school.clusterId !== parseInt(clusterFilter)) return false;
    }
    return true;
  });

  const studentsQueryParams = new URLSearchParams();
  if (schoolFilter !== "all") studentsQueryParams.set("schoolId", schoolFilter);
  if (clusterFilter !== "all") studentsQueryParams.set("clusterId", clusterFilter);
  if (regionFilter !== "all") studentsQueryParams.set("regionId", regionFilter);
  if (studentGradeFilter !== "all") studentsQueryParams.set("grade", studentGradeFilter);
  if (activeExamYear?.id) studentsQueryParams.set("examYearId", String(activeExamYear.id));
  
  const studentsQueryUrl = `/api/results/students-for-entry${studentsQueryParams.toString() ? `?${studentsQueryParams.toString()}` : ''}`;
  
  const { data: studentsData, isLoading: studentsLoading } = useQuery<{ students: StudentWithSchool[]; role: string }>({
    queryKey: [studentsQueryUrl],
    enabled: !!activeExamYear?.id,
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ResultWithRelations[]>({
    queryKey: ["/api/results", statusFilter, resultGradeFilter],
  });

  const validateResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      return apiRequest("POST", `/api/results/${resultId}/validate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({
        title: isRTL ? "تم التحقق من النتيجة" : "Result Validated",
        description: isRTL ? "تم التحقق من النتيجة بنجاح." : "The result has been validated successfully.",
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل التحقق من النتيجة." : "Failed to validate result.",
        variant: "destructive",
      });
    },
  });

  const publishAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/results/publish`, { examYearId: activeExamYear?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({
        title: isRTL ? "تم نشر النتائج" : "Results Published",
        description: isRTL ? "تم نشر جميع النتائج المعتمدة." : "All validated results have been published.",
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل نشر النتائج." : "Failed to publish results.",
        variant: "destructive",
      });
    },
  });

  const uploadResultsMutation = useMutation({
    mutationFn: async (data: { rows: any[]; examYearId: number; grade: number }) => {
      return apiRequest("POST", "/api/results/multi-subject-upload", data);
    },
    onSuccess: (data: any) => {
      setUploadProgress({ created: data.created, updated: data.updated, errors: data.errors });
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: isRTL ? "تم تحميل النتائج" : "Results Uploaded",
        description: isRTL 
          ? `تم إنشاء ${data.created} وتحديث ${data.updated} نتيجة` 
          : `Created ${data.created} and updated ${data.updated} results`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تحميل النتائج" : "Failed to upload results"),
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!activeExamYear?.id) {
      toast({
        title: t.common.error,
        description: isRTL ? "يرجى تحديد سنة الامتحان" : "Please select an exam year",
        variant: "destructive",
      });
      return;
    }

    if (studentGradeFilter === "all") {
      toast({
        title: t.common.error,
        description: isRTL ? "يرجى تحديد الصف" : "Please select a grade level",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error(isRTL ? "الملف فارغ أو لا يحتوي على بيانات" : "File is empty or has no data");
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;
        
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }

      await uploadResultsMutation.mutateAsync({
        rows,
        examYearId: activeExamYear.id,
        grade: parseInt(studentGradeFilter),
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل قراءة الملف" : "Failed to read file"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleComprehensiveUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!activeExamYear?.id) {
      toast({
        title: t.common.error,
        description: isRTL ? "يرجى تحديد سنة الامتحان" : "Please select an exam year",
        variant: "destructive",
      });
      return;
    }

    if (studentGradeFilter === "all") {
      toast({
        title: t.common.error,
        description: isRTL ? "يرجى تحديد الصف" : "Please select a grade level",
        variant: "destructive",
      });
      return;
    }

    setComprehensiveProgress({
      stage: 'uploading',
      percentage: 10,
      message: isRTL ? 'جاري تحميل الملف...' : 'Uploading file...',
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('examYearId', String(activeExamYear.id));
      formData.append('grade', studentGradeFilter);

      setComprehensiveProgress({
        stage: 'processing',
        percentage: 30,
        message: isRTL ? 'جاري معالجة البيانات...' : 'Processing data...',
      });

      const response = await fetch('/api/results/comprehensive-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();

      setComprehensiveProgress({
        stage: 'complete',
        percentage: 100,
        message: isRTL ? 'تم التحميل بنجاح!' : 'Upload complete!',
        summary: result.summary,
        schoolCredentials: result.schoolCredentials,
        errors: result.errors,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/regions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clusters'] });

      toast({
        title: isRTL ? "تم التحميل بنجاح" : "Upload Successful",
        description: isRTL 
          ? `تم إنشاء ${result.summary.studentsCreated} طالب و${result.summary.resultsCreated} نتيجة`
          : `Created ${result.summary.studentsCreated} students and ${result.summary.resultsCreated} results`,
      });
    } catch (error: any) {
      setComprehensiveProgress({
        stage: 'error',
        percentage: 0,
        message: error.message || (isRTL ? "فشل التحميل" : "Upload failed"),
      });
      toast({
        title: t.common.error,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (comprehensiveFileInputRef.current) {
        comprehensiveFileInputRef.current.value = '';
      }
    }
  };

  const filteredResults = results?.filter((result) => {
    const studentName = `${result.student?.firstName} ${result.student?.lastName}`.toLowerCase();
    const matchesSearch =
      studentName.includes(searchQuery.toLowerCase()) ||
      result.student?.indexNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = resultGradeFilter === "all" || result.grade === resultGradeFilter;
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  const filteredStudents = studentsData?.students?.filter((student) => {
    const studentName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch =
      studentName.includes(searchQuery.toLowerCase()) ||
      student.indexNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = results?.filter(r => r.status === 'pending').length || 0;
  const validatedCount = results?.filter(r => r.status === 'validated').length || 0;
  const publishedCount = results?.filter(r => r.status === 'published').length || 0;

  const userRole = currentUser?.role || studentsData?.role;
  const isExaminer = userRole === 'examiner';

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.results.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة نتائج الامتحانات وتحميلها والتحقق منها" : "Manage, upload, and validate examination results"}
          </p>
          {isExaminer && (
            <Badge className="mt-2 bg-primary/10 text-primary">
              {isRTL ? "عرض الطلاب المعينين لك فقط" : "Showing only students assigned to you"}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowComprehensiveUploadDialog(true)} data-testid="button-comprehensive-upload">
            <FileUp className="w-4 h-4 me-2" />
            {isRTL ? "تحميل شامل" : "Full Upload"}
          </Button>
          <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-results">
            <Upload className="w-4 h-4 me-2" />
            {isRTL ? "تحميل النتائج" : "Upload Results"}
          </Button>
          <Button variant="outline" data-testid="button-download-template">
            <FileSpreadsheet className="w-4 h-4 me-2" />
            {isRTL ? "القالب" : "Template"}
          </Button>
          {validatedCount > 0 && (
            <Button onClick={() => publishAllMutation.mutate()} disabled={publishAllMutation.isPending} data-testid="button-publish-all">
              {publishAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 me-2" />
              )}
              {isRTL ? `نشر (${validatedCount})` : `Publish (${validatedCount})`}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الطلاب" : "Students"}</p>
                <p className="text-2xl font-semibold">{studentsData?.students?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
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
                <Clock className="w-5 h-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "تم التحقق" : "Validated"}</p>
                <p className="text-2xl font-semibold">{validatedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "منشور" : "Published"}</p>
                <p className="text-2xl font-semibold">{publishedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {results && results.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{isRTL ? "تقدم المعالجة" : "Processing Progress"}</span>
              <span className="text-sm text-muted-foreground">
                {isRTL 
                  ? `${publishedCount} من ${results.length} منشور` 
                  : `${publishedCount} of ${results.length} published`}
              </span>
            </div>
            <Progress value={(publishedCount / results.length) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                placeholder={isRTL ? "البحث باسم الطالب أو رقم الفهرس..." : "Search by student name or index number..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pe-9" : "ps-9"}
                data-testid="input-search-results"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isExaminer && (
                <>
                  <Select value={regionFilter} onValueChange={setRegionFilter}>
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
                  <Select value={clusterFilter} onValueChange={setClusterFilter}>
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
                </>
              )}
              <Select value={studentGradeFilter} onValueChange={setStudentGradeFilter}>
                <SelectTrigger className="w-[120px]" data-testid="select-student-grade-filter">
                  <SelectValue placeholder={isRTL ? "الصف" : "Grade"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع الصفوف" : "All Grades"}</SelectItem>
                  <SelectItem value="3">{isRTL ? "الصف 3" : "Grade 3"}</SelectItem>
                  <SelectItem value="6">{isRTL ? "الصف 6" : "Grade 6"}</SelectItem>
                  <SelectItem value="9">{isRTL ? "الصف 9" : "Grade 9"}</SelectItem>
                  <SelectItem value="12">{isRTL ? "الصف 12" : "Grade 12"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder={t.common.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allStatus}</SelectItem>
                  <SelectItem value="pending">{t.common.pending}</SelectItem>
                  <SelectItem value="validated">{isRTL ? "تم التحقق" : "Validated"}</SelectItem>
                  <SelectItem value="published">{isRTL ? "منشور" : "Published"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resultGradeFilter} onValueChange={setResultGradeFilter}>
                <SelectTrigger className="w-[100px]" data-testid="select-result-grade-filter">
                  <SelectValue placeholder={isRTL ? "التقدير" : "Result"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع التقديرات" : "All Grades"}</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="students" data-testid="tab-students">
            <Users className="w-4 h-4 me-2" />
            {isRTL ? "قائمة الطلاب" : "Student List"}
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <FileCheck className="w-4 h-4 me-2" />
            {isRTL ? "النتائج المسجلة" : "Recorded Results"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{isRTL ? "قائمة الطلاب للنتائج" : "Students for Result Entry"}</CardTitle>
                  <CardDescription>
                    {filteredStudents?.length || 0} {isRTL ? "طالب" : "students"}
                    {isExaminer && (isRTL ? " (المعينون لك)" : " (assigned to you)")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <ResultsTableSkeleton />
              ) : filteredStudents && filteredStudents.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRTL ? "رقم الفهرس" : "Index No."}</TableHead>
                        <TableHead>{isRTL ? "اسم الطالب" : "Student Name"}</TableHead>
                        <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                        <TableHead>{isRTL ? "العنقود" : "Cluster"}</TableHead>
                        <TableHead>{isRTL ? "الصف" : "Grade"}</TableHead>
                        <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {student.indexNumber || (isRTL ? "لا يوجد" : "N/A")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {student.firstName} {student.lastName}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{student.school?.name || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{student.cluster?.name || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{isRTL ? `الصف ${student.grade}` : `Grade ${student.grade}`}</Badge>
                          </TableCell>
                          <TableCell className={isRTL ? "text-left" : "text-right"}>
                            <Button variant="outline" size="sm" data-testid={`button-enter-results-${student.id}`}>
                              <Edit className="w-4 h-4 me-2" />
                              {isRTL ? "إدخال النتائج" : "Enter Results"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{isRTL ? "لم يتم العثور على طلاب" : "No students found"}</h3>
                  <p className="text-muted-foreground">
                    {isExaminer 
                      ? (isRTL ? "لا يوجد طلاب معينين لك حالياً" : "No students are currently assigned to you")
                      : (isRTL ? "حاول تعديل الفلاتر" : "Try adjusting your filters")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{isRTL ? "النتائج المسجلة" : "Recorded Results"}</CardTitle>
                  <CardDescription>
                    {filteredResults?.length || 0} {isRTL ? "نتيجة موجودة" : "results found"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 me-2" />
                    {t.nav.analytics}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 me-2" />
                    {t.common.export}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <ResultsTableSkeleton />
              ) : filteredResults && filteredResults.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.students.title}</TableHead>
                        <TableHead>{t.subjects.title}</TableHead>
                        <TableHead>{isRTL ? "الدرجة" : "Score"}</TableHead>
                        <TableHead>{isRTL ? "التقدير" : "Grade"}</TableHead>
                        <TableHead>{t.common.status}</TableHead>
                        <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result) => (
                        <TableRow key={result.id} data-testid={`row-result-${result.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {result.student?.firstName} {result.student?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {result.student?.indexNumber || (isRTL ? "لا يوجد فهرس" : "No Index")}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{result.subject?.name || (isRTL ? "غير معروف" : "Unknown")}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="font-medium">{result.totalScore || 0}</span>
                              <span className="text-muted-foreground">/100</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.grade && (
                              <Badge className={`${gradeColors[result.grade] || ''} text-xs`}>
                                {result.grade}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[result.status || 'pending']} text-xs`}>
                              {getResultStatusLabel(result.status || 'pending', isRTL)}
                            </Badge>
                          </TableCell>
                          <TableCell className={isRTL ? "text-left" : "text-right"}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-actions-${result.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedResult(result);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 me-2" />
                                  {t.common.viewDetails}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {result.status === 'pending' && (
                                  <DropdownMenuItem
                                    onClick={() => validateResultMutation.mutate(result.id)}
                                    className="text-chart-3"
                                  >
                                    <CheckCircle className="w-4 h-4 me-2" />
                                    {isRTL ? "التحقق" : "Validate"}
                                  </DropdownMenuItem>
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
                  <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{isRTL ? "لم يتم العثور على نتائج" : "No results found"}</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? (isRTL ? "حاول تعديل البحث أو الفلاتر" : "Try adjusting your search or filters")
                      : (isRTL ? "قم بتحميل النتائج للبدء" : "Upload results to get started")}
                  </p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 me-2" />
                    {isRTL ? "تحميل النتائج" : "Upload Results"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل النتيجة" : "Result Details"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "معلومات النتيجة الكاملة" : "Complete result information"}
            </DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedResult.student?.firstName} {selectedResult.student?.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedResult.student?.school?.name || (isRTL ? "مدرسة غير معروفة" : "Unknown School")}
                  </p>
                  <Badge className={`${statusColors[selectedResult.status || 'pending']} mt-2`}>
                    {getResultStatusLabel(selectedResult.status || 'pending', isRTL)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="p-4 bg-muted/50 rounded-md">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{isRTL ? "الفصل الأول" : "First Term"}</p>
                      <p className="text-xl font-semibold">{selectedResult.firstTermScore || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{isRTL ? "الامتحان" : "Exam"}</p>
                      <p className="text-xl font-semibold">{selectedResult.examScore || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{isRTL ? "المجموع" : "Total"}</p>
                      <p className="text-xl font-semibold text-primary">{selectedResult.totalScore || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.subjects.title}</p>
                    <p className="font-medium">{selectedResult.subject?.name || (isRTL ? "غير معروف" : "Unknown")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "التقدير النهائي" : "Final Grade"}</p>
                    {selectedResult.grade && (
                      <Badge className={gradeColors[selectedResult.grade]}>
                        {isRTL ? `تقدير ${selectedResult.grade}` : `Grade ${selectedResult.grade}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t.common.close}
            </Button>
            {selectedResult && selectedResult.status === 'pending' && (
              <Button
                onClick={() => {
                  validateResultMutation.mutate(selectedResult.id);
                  setShowDetailsDialog(false);
                }}
              >
                {isRTL ? "التحقق" : "Validate"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تحميل النتائج" : "Upload Results"}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "تحميل ملف CSV يحتوي على نتائج الامتحان لجميع المواد" 
                : "Upload a CSV file containing examination results for all subjects"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {studentGradeFilter === "all" && (
              <div className="flex items-center gap-2 p-3 bg-chart-5/10 rounded-md">
                <AlertCircle className="w-5 h-5 text-chart-5" />
                <p className="text-sm text-chart-5">
                  {isRTL ? "يرجى تحديد الصف قبل تحميل الملف" : "Please select a grade level before uploading"}
                </p>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                studentGradeFilter === "all" ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"
              }`}
              onClick={() => studentGradeFilter !== "all" && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "جاري تحميل النتائج..." : "Uploading results..."}
                  </p>
                </div>
              ) : uploadProgress ? (
                <div className="space-y-4">
                  <Check className="w-10 h-10 text-chart-3 mx-auto" />
                  <div className="space-y-2">
                    <p className="font-medium text-chart-3">
                      {isRTL ? "تم التحميل بنجاح!" : "Upload Complete!"}
                    </p>
                    <div className="flex justify-center gap-4 text-sm">
                      <span className="text-chart-3">{uploadProgress.created} {isRTL ? "جديد" : "created"}</span>
                      <span className="text-chart-2">{uploadProgress.updated} {isRTL ? "محدث" : "updated"}</span>
                      {uploadProgress.errors > 0 && (
                        <span className="text-destructive">{uploadProgress.errors} {isRTL ? "أخطاء" : "errors"}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <FileUp className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {isRTL 
                      ? "اسحب وأفلت ملف CSV هنا، أو انقر للتصفح" 
                      : "Drag and drop your CSV file here, or click to browse"}
                  </p>
                  <Button variant="outline" size="sm" disabled={studentGradeFilter === "all"}>
                    {isRTL ? "اختر ملفًا" : "Choose File"}
                  </Button>
                </>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{isRTL ? "تنسيق CSV المتوقع:" : "Expected CSV format:"}</p>
              <p className="font-mono bg-muted p-2 rounded text-xs overflow-x-auto">
                School Code, School Name, Location, Region, Student Number, Student Name, Subject1, Subject2, ...
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{isRTL ? "هل تحتاج القالب؟" : "Need the template?"}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0"
                onClick={() => {
                  // Generate template matching system structure:
                  // School Code, School Name, Location, Region, Student Number, Student Name, then Subjects
                  const headers = ["School Code", "School Name", "Location", "Region", "Student Number", "Student Name"];
                  
                  // Filter subjects by selected grade level, sorted by name
                  const gradeSubjects = (subjects?.filter(s => s.grade === parseInt(studentGradeFilter)) || [])
                    .sort((a, b) => a.name.localeCompare(b.name));
                  
                  if (gradeSubjects.length > 0) {
                    // Add subjects in order (LTR)
                    gradeSubjects.forEach(s => headers.push(s.name));
                  } else if (subjects && subjects.length > 0) {
                    // Fallback: if no subjects for this grade, show all available subjects
                    subjects.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => headers.push(s.name));
                  } else {
                    // Placeholder if no subjects exist
                    headers.push("Subject 1", "Subject 2", "Subject 3");
                  }
                  
                  // Generate CSV with sample data row
                  const headerLine = headers.join(",");
                  const numSubjects = gradeSubjects.length > 0 ? gradeSubjects.length : (headers.length - 6);
                  const sampleData = "SCH001,School Name,Location,Region,12345,Student Name," + 
                                     Array(numSubjects).fill("80").join(",");
                  const csv = headerLine + "\n" + sampleData;
                  
                  // Download with UTF-8 BOM for proper encoding
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "results_template.csv";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 me-1" />
                {isRTL ? "تحميل القالب" : "Download Template"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setUploadProgress(null); }}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Upload Dialog */}
      <Dialog open={showComprehensiveUploadDialog} onOpenChange={setShowComprehensiveUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? "التحميل الشامل للنتائج" : "Comprehensive Results Upload"}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "قم بتحميل ملف CSV يحتوي على جميع البيانات. سيتم إنشاء المناطق والمجموعات والمدارس والطلاب تلقائياً إذا لم تكن موجودة." 
                : "Upload a CSV file with all data. Regions, clusters, schools, and students will be created automatically if they don't exist."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Grade Selection Warning */}
            {studentGradeFilter === "all" && (
              <div className="flex items-center gap-2 p-3 bg-chart-5/10 rounded-md">
                <AlertCircle className="w-5 h-5 text-chart-5" />
                <p className="text-sm text-chart-5">
                  {isRTL ? "يرجى تحديد الصف من القائمة الرئيسية قبل تحميل الملف" : "Please select a grade level from the main filters before uploading"}
                </p>
              </div>
            )}

            {/* Grade Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{isRTL ? "الصف الدراسي" : "Grade Level"}</label>
                <Select value={studentGradeFilter} onValueChange={setStudentGradeFilter}>
                  <SelectTrigger data-testid="select-comprehensive-grade">
                    <SelectValue placeholder={isRTL ? "اختر الصف" : "Select Grade"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">{isRTL ? "الصف 3" : "Grade 3"}</SelectItem>
                    <SelectItem value="6">{isRTL ? "الصف 6" : "Grade 6"}</SelectItem>
                    <SelectItem value="9">{isRTL ? "الصف 9" : "Grade 9"}</SelectItem>
                    <SelectItem value="12">{isRTL ? "الصف 12" : "Grade 12"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{isRTL ? "سنة الامتحان" : "Exam Year"}</label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {activeExamYear?.name || (isRTL ? "لا توجد سنة نشطة" : "No active year")}
                </div>
              </div>
            </div>

            {/* File Upload Area */}
            <input
              type="file"
              ref={comprehensiveFileInputRef}
              accept=".csv"
              onChange={handleComprehensiveUpload}
              className="hidden"
            />

            {comprehensiveProgress ? (
              <div className="space-y-4 p-4 border rounded-lg">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{comprehensiveProgress.message}</span>
                    <span className="text-sm text-muted-foreground">{comprehensiveProgress.percentage}%</span>
                  </div>
                  <Progress value={comprehensiveProgress.percentage} className="h-2" />
                </div>

                {/* Summary Stats */}
                {comprehensiveProgress.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
                    <div className="text-center p-2 bg-chart-3/10 rounded-md">
                      <p className="text-lg font-bold text-chart-3">{comprehensiveProgress.summary.regionsCreated}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "مناطق جديدة" : "Regions Created"}</p>
                    </div>
                    <div className="text-center p-2 bg-chart-2/10 rounded-md">
                      <p className="text-lg font-bold text-chart-2">{comprehensiveProgress.summary.clustersCreated}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "مجموعات جديدة" : "Clusters Created"}</p>
                    </div>
                    <div className="text-center p-2 bg-primary/10 rounded-md">
                      <p className="text-lg font-bold text-primary">{comprehensiveProgress.summary.schoolsCreated}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "مدارس جديدة" : "Schools Created"}</p>
                    </div>
                    <div className="text-center p-2 bg-chart-4/10 rounded-md">
                      <p className="text-lg font-bold text-chart-4">{comprehensiveProgress.summary.studentsCreated}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "طلاب جدد" : "Students Created"}</p>
                    </div>
                    <div className="text-center p-2 bg-chart-1/10 rounded-md">
                      <p className="text-lg font-bold text-chart-1">{comprehensiveProgress.summary.subjectsCreated}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "مواد جديدة" : "Subjects Created"}</p>
                    </div>
                    <div className="text-center p-2 bg-chart-3/10 rounded-md">
                      <p className="text-lg font-bold text-chart-3">{comprehensiveProgress.summary.resultsCreated}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "نتائج جديدة" : "Results Created"}</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-md">
                      <p className="text-lg font-bold">{comprehensiveProgress.summary.skippedNoMarks}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? "تم تخطيها" : "Skipped (No Marks)"}</p>
                    </div>
                    {comprehensiveProgress.summary.errorsCount > 0 && (
                      <div className="text-center p-2 bg-destructive/10 rounded-md">
                        <p className="text-lg font-bold text-destructive">{comprehensiveProgress.summary.errorsCount}</p>
                        <p className="text-xs text-muted-foreground">{isRTL ? "أخطاء" : "Errors"}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* School Credentials */}
                {comprehensiveProgress.schoolCredentials && comprehensiveProgress.schoolCredentials.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">{isRTL ? "بيانات تسجيل الدخول للمدارس الجديدة" : "New School Login Credentials"}</h4>
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                            <TableHead>{isRTL ? "اسم المستخدم" : "Username"}</TableHead>
                            <TableHead>{isRTL ? "كلمة المرور" : "Password"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comprehensiveProgress.schoolCredentials.map((cred, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{cred.schoolName}</TableCell>
                              <TableCell className="font-mono text-xs">{cred.username}</TableCell>
                              <TableCell className="font-mono text-xs">{cred.password}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        const csv = "School,Region,Cluster,Username,Password\n" +
                          comprehensiveProgress.schoolCredentials!.map(c => 
                            `"${c.schoolName}","${c.region}","${c.cluster}","${c.username}","${c.password}"`
                          ).join("\n");
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "school_credentials.csv";
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 me-2" />
                      {isRTL ? "تحميل بيانات الدخول" : "Download Credentials"}
                    </Button>
                  </div>
                )}

                {/* Errors */}
                {comprehensiveProgress.errors && comprehensiveProgress.errors.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-destructive mb-2">{isRTL ? "الأخطاء" : "Errors"}</h4>
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {comprehensiveProgress.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="p-2 bg-destructive/10 rounded text-destructive">
                          {isRTL ? `الصف ${err.row}: ${err.error}` : `Row ${err.row}: ${err.error}`}
                        </div>
                      ))}
                      {comprehensiveProgress.errors.length > 10 && (
                        <p className="text-muted-foreground">
                          {isRTL ? `و ${comprehensiveProgress.errors.length - 10} أخطاء أخرى...` : `And ${comprehensiveProgress.errors.length - 10} more errors...`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  studentGradeFilter === "all" ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"
                }`}
                onClick={() => studentGradeFilter !== "all" && comprehensiveFileInputRef.current?.click()}
              >
                <FileUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL 
                    ? "اسحب وأفلت ملف CSV هنا، أو انقر للتصفح" 
                    : "Drag and drop your CSV file here, or click to browse"}
                </p>
                <Button variant="outline" size="sm" disabled={studentGradeFilter === "all"}>
                  {isRTL ? "اختر ملف CSV" : "Choose CSV File"}
                </Button>
              </div>
            )}

            {/* CSV Format Guide */}
            <div className="text-xs text-muted-foreground space-y-2 border-t pt-4">
              <p className="font-medium">{isRTL ? "الأعمدة المطلوبة في ملف CSV (بترميز UTF-8):" : "Required CSV columns (UTF-8 encoded):"}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted rounded">
                  <p className="font-medium">{isRTL ? "بيانات الموقع" : "Location Data"}</p>
                  <p className="font-mono text-xs">region, cluster, school</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="font-medium">{isRTL ? "بيانات الطالب" : "Student Data"}</p>
                  <p className="font-mono text-xs">firstName, lastName, gender</p>
                </div>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="font-medium">{isRTL ? "أعمدة المواد (درجات 0-100)" : "Subject Columns (scores 0-100)"}</p>
                <p className="font-mono text-xs">القرآن, الحديث, الفقه, English, Mathematics, ...</p>
              </div>
              <p className="text-chart-5">
                {isRTL 
                  ? "ملاحظة: سيتم تخطي الطلاب بدون درجات والمدارس بدون طلاب"
                  : "Note: Students without marks and schools without students will be skipped"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { 
                setShowComprehensiveUploadDialog(false); 
                setComprehensiveProgress(null); 
              }}
            >
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
