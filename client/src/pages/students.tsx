import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// School type to grade range mapping
// Note: ECD students typically don't have numeric grades, so we use a special marker
const SCHOOL_TYPE_GRADES: Record<string, { min: number | null; max: number | null; label: { en: string; ar: string } }> = {
  LBS: { min: 1, max: 6, label: { en: "Lower Basic School (1-6)", ar: "ابتدائي (1-6)" } },
  UBS: { min: 7, max: 9, label: { en: "Upper Basic School (7-9)", ar: "إعدادي (7-9)" } },
  BCS: { min: 1, max: 9, label: { en: "Basic Cycle School (1-9)", ar: "ابتدائي وإعدادي (1-9)" } },
  SSS: { min: 10, max: 12, label: { en: "Senior Secondary School (10-12)", ar: "ثانوي (10-12)" } },
  QM: { min: 1, max: 12, label: { en: "Quranic Memorization (All Grades)", ar: "تحفيظ القرآن الكريم (جميع الصفوف)" } },
  ECD: { min: null, max: null, label: { en: "Early Childhood Development (Pre-K)", ar: "روضة" } },
};

// Get grades for a school type tab filter
const getGradesForSchoolType = (schoolType: string): number[] => {
  const config = SCHOOL_TYPE_GRADES[schoolType];
  if (!config || config.min === null || config.max === null) return [];
  const grades: number[] = [];
  for (let g = config.min; g <= config.max; g++) {
    grades.push(g);
  }
  return grades;
};

// Check if school type tab filters by "no grade" (like ECD)
const isNoGradeFilter = (schoolType: string): boolean => {
  const config = SCHOOL_TYPE_GRADES[schoolType];
  return config?.min === null && config?.max === null;
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

export default function Students() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [schoolTypeTab, setSchoolTypeTab] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Compute effective grade filter - ignore gradeFilter when a tab is active
  const effectiveGradeFilter = schoolTypeTab === "all" ? gradeFilter : "all";
  
  // Memoize student query URL to ensure deterministic cache keys
  const studentsUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    
    // Status filter
    if (statusFilter !== "all") {
      queryParams.set("status", statusFilter);
    }
    
    // Region and cluster filters
    if (regionFilter !== "all") {
      queryParams.set("regionId", regionFilter);
    }
    if (clusterFilter !== "all") {
      queryParams.set("clusterId", clusterFilter);
    }
    if (schoolFilter !== "all") {
      queryParams.set("schoolId", schoolFilter);
    }
    
    // Grade filtering - mutually exclusive options (tab takes precedence)
    if (schoolTypeTab === "ECD") {
      // ECD tab filters for students without grades
      queryParams.set("noGrade", "true");
    } else if (schoolTypeTab !== "all") {
      // School type tab - use grade range
      const grades = getGradesForSchoolType(schoolTypeTab);
      if (grades.length > 0) {
        queryParams.set("gradeMin", grades[0].toString());
        queryParams.set("gradeMax", grades[grades.length - 1].toString());
      }
    } else if (effectiveGradeFilter !== "all") {
      // Explicit grade filter only when "All" tab is selected
      queryParams.set("grade", effectiveGradeFilter);
    }
    
    const queryString = queryParams.toString();
    return queryString ? `/api/students?${queryString}` : "/api/students";
  }, [statusFilter, regionFilter, clusterFilter, schoolFilter, schoolTypeTab, effectiveGradeFilter]);

  const { data: students, isLoading } = useQuery<StudentWithRelations[]>({
    queryKey: [studentsUrl],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

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

  // Schools are already filtered by API call, use them directly as options
  const schoolsForFilter = schools;

  // Helper to invalidate all student queries (including filtered variants)
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

  // Local filtering for search only - grade range filtering is handled by API
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

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.students.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة تسجيلات الطلاب والتحقق منها" : "Manage student registrations and validations"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-csv">
            <Upload className="w-4 h-4 me-2" />
            {t.common.uploadCSV}
          </Button>
          <Button variant="outline" data-testid="button-download-template">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.dashboard.totalStudents}</p>
                <p className="text-2xl font-semibold">{students?.length || 0}</p>
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

      {/* School Type / Grade Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {isRTL ? "تصفية حسب نوع المدرسة / الصفوف" : "Filter by School Type / Grades"}
            </span>
          </div>
          <Tabs value={schoolTypeTab} onValueChange={(value) => {
            setSchoolTypeTab(value);
            // Always reset explicit grade filter when switching tabs to avoid conflicts
            setGradeFilter("all");
          }} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger 
                value="all" 
                className="text-xs sm:text-sm px-3 py-1.5"
                data-testid="tab-all-grades"
              >
                {isRTL ? "الكل" : "All"}
              </TabsTrigger>
              <TabsTrigger 
                value="LBS" 
                className="text-xs sm:text-sm px-3 py-1.5"
                data-testid="tab-lbs"
              >
                {isRTL ? SCHOOL_TYPE_GRADES.LBS.label.ar : SCHOOL_TYPE_GRADES.LBS.label.en}
              </TabsTrigger>
              <TabsTrigger 
                value="UBS" 
                className="text-xs sm:text-sm px-3 py-1.5"
                data-testid="tab-ubs"
              >
                {isRTL ? SCHOOL_TYPE_GRADES.UBS.label.ar : SCHOOL_TYPE_GRADES.UBS.label.en}
              </TabsTrigger>
              <TabsTrigger 
                value="SSS" 
                className="text-xs sm:text-sm px-3 py-1.5"
                data-testid="tab-sss"
              >
                {isRTL ? SCHOOL_TYPE_GRADES.SSS.label.ar : SCHOOL_TYPE_GRADES.SSS.label.en}
              </TabsTrigger>
              <TabsTrigger 
                value="QM" 
                className="text-xs sm:text-sm px-3 py-1.5"
                data-testid="tab-qm"
              >
                {isRTL ? SCHOOL_TYPE_GRADES.QM.label.ar : SCHOOL_TYPE_GRADES.QM.label.en}
              </TabsTrigger>
              <TabsTrigger 
                value="ECD" 
                className="text-xs sm:text-sm px-3 py-1.5"
                data-testid="tab-ecd"
              >
                {isRTL ? SCHOOL_TYPE_GRADES.ECD.label.ar : SCHOOL_TYPE_GRADES.ECD.label.en}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

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
              <Select 
                value={gradeFilter} 
                onValueChange={setGradeFilter}
                disabled={schoolTypeTab !== "all"}
              >
                <SelectTrigger className="w-[130px]" data-testid="select-grade-filter">
                  <SelectValue placeholder={schoolTypeTab !== "all" ? (isRTL ? "محدد بالتبويب" : "Set by Tab") : t.common.grade} />
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
          <div className="flex items-center justify-between">
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
                    <TableHead>{t.common.grade}</TableHead>
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
                        <Badge variant="secondary" className="text-xs">
                          {getGradeLabel(student.grade, isRTL)}
                        </Badge>
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
            <DialogTitle>{isRTL ? "رفع قائمة الطلاب" : "Upload Student List"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "قم برفع ملف CSV يحتوي على معلومات الطلاب" : "Upload a CSV file containing student information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {isRTL ? "اسحب وأفلت ملف CSV هنا، أو انقر للتصفح" : "Drag and drop your CSV file here, or click to browse"}
              </p>
              <Button variant="outline" size="sm">
                {isRTL ? "اختر ملف" : "Choose File"}
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{isRTL ? "هل تحتاج إلى القالب؟" : "Need the template?"}</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-primary underline-offset-4 hover:underline">
                <Download className="w-4 h-4 me-1" />
                {isRTL ? "تحميل قالب CSV" : "Download CSV Template"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button disabled>
              {isRTL ? "رفع والتحقق" : "Upload & Validate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
