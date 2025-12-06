import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  Printer,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, Cluster, School as SchoolType, Student, ExamYear, Certificate } from "@shared/schema";

interface StudentWithCertificate extends Student {
  school?: SchoolType;
  certificate?: Certificate;
}

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
          <Skeleton className="w-6 h-6" />
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

export default function Certificates() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<StudentWithCertificate | null>(null);
  const [activeTab, setActiveTab] = useState<string>("standard");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EligibleStudent | null>(null);
  const [editForm, setEditForm] = useState({
    gender: '' as string,
    dateOfBirth: '' as string,
    placeOfBirth: '' as string,
  });
  const [detectedGender, setDetectedGender] = useState<GenderDetectionResult | null>(null);

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
    enabled: !!selectedRegion,
  });

  const { data: schoolsResponse } = useQuery<{ data: SchoolType[]; total: number }>({
    queryKey: ["/api/schools"],
  });
  const schools = schoolsResponse?.data || [];

  const { data: studentsResponse, isLoading: studentsLoading } = useQuery<{ data: StudentWithCertificate[]; total: number }>({
    queryKey: [`/api/students?schoolId=${selectedSchool}`],
    enabled: !!selectedSchool,
  });
  const students = studentsResponse?.data || [];

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: allCertificates } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
  });

  const activeExamYear = examYears?.find(ey => ey.isActive);
  const currentExamYear = selectedExamYear ? examYears?.find(ey => ey.id === parseInt(selectedExamYear)) : activeExamYear;

  const getStudentCertificate = (studentId: number): Certificate | undefined => {
    return allCertificates?.find(c => c.studentId === studentId && c.examYearId === currentExamYear?.id);
  };

  // All grades are now supported with grade-specific templates and fallbacks
  // Filter students into eligible (grades 1-12) and non-eligible groups
  const studentsList = Array.isArray(students) ? students : [];
  const eligibleStudents = studentsList.filter(s => s.grade >= 1 && s.grade <= 12) || [];
  const nonEligibleStudents = studentsList.filter(s => s.grade < 1 || s.grade > 12) || [];

  const filteredClusters = clusters?.filter(c => c.regionId === parseInt(selectedRegion)) || [];
  const filteredSchools = schools.filter(s => {
    if (selectedCluster) return s.clusterId === parseInt(selectedCluster);
    if (selectedRegion) return s.regionId === parseInt(selectedRegion);
    return true;
  });

  const generateCertificateMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      return apiRequest("POST", "/api/certificates/generate", { studentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students?schoolId=${selectedSchool}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      toast({
        title: isRTL ? "تم إنشاء الشهادات" : "Certificates Generated",
        description: isRTL 
          ? `تم إنشاء ${selectedStudents.length} شهادة بنجاح.`
          : `${selectedStudents.length} certificate(s) generated successfully.`,
      });
      setSelectedStudents([]);
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل إنشاء الشهادات. يرجى المحاولة مرة أخرى." : "Failed to generate certificates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/certificates/generate-school", { schoolId: parseInt(selectedSchool) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students?schoolId=${selectedSchool}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      toast({
        title: isRTL ? "تم إنشاء جميع الشهادات" : "All Certificates Generated",
        description: isRTL ? "تم إنشاء شهادات جميع الطلاب لهذه المدرسة." : "All student certificates for this school have been generated.",
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل إنشاء الشهادات. يرجى المحاولة مرة أخرى." : "Failed to generate certificates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: eligibleStudentsData, isLoading: eligibleLoading, refetch: refetchEligible } = useQuery<{
    examYear: ExamYear;
    students: EligibleStudent[];
    summary: {
      total: number;
      eligible: number;
      withCertificate: number;
      missingData: number;
      noResults: number;
      failed: number;
    };
  }>({
    queryKey: ["/api/certificates/eligible-students", selectedExamYear, selectedSchool, selectedGrade],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedExamYear) params.append('examYearId', selectedExamYear);
      if (selectedSchool) params.append('schoolId', selectedSchool);
      if (selectedGrade) params.append('grade', selectedGrade);
      const response = await fetch(`/api/certificates/eligible-students?${params}`);
      if (!response.ok) throw new Error('Failed to fetch eligible students');
      return response.json();
    },
    enabled: activeTab === 'arabic',
  });

  const generatePrimaryMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      const response = await apiRequest("POST", "/api/certificates/generate-primary", { 
        studentIds,
        examYearId: selectedExamYear ? parseInt(selectedExamYear) : undefined
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/eligible-students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      refetchEligible();
      toast({
        title: isRTL ? "تم إنشاء الشهادات العربية" : "Arabic Certificates Generated",
        description: isRTL 
          ? `تم إنشاء ${data.generated} شهادة بنجاح.${data.errors?.length ? ` ${data.errors.length} خطأ.` : ''}`
          : `${data.generated} certificate(s) generated.${data.errors?.length ? ` ${data.errors.length} error(s).` : ''}`,
      });
      setSelectedStudents([]);
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل إنشاء الشهادات العربية." : "Failed to generate Arabic certificates.",
        variant: "destructive",
      });
    },
  });

  const detectGenderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/students/detect-gender", { names: name });
      return response as GenderDetectionResult;
    },
    onSuccess: (data: GenderDetectionResult) => {
      setDetectedGender(data);
      if (data.gender !== 'unknown') {
        setEditForm(prev => ({ ...prev, gender: data.gender }));
      }
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ studentId, data }: { studentId: number; data: any }) => {
      return apiRequest("PATCH", `/api/students/${studentId}/certificate-info`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/eligible-students"] });
      refetchEligible();
      setShowEditDialog(false);
      setEditingStudent(null);
      toast({
        title: isRTL ? "تم تحديث بيانات الطالب" : "Student Data Updated",
        description: isRTL ? "تم تحديث بيانات الطالب بنجاح." : "Student data has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل تحديث بيانات الطالب." : "Failed to update student data.",
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
    setDetectedGender(null);
    setShowEditDialog(true);
    
    const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    detectGenderMutation.mutate(fullName);
  };

  const handleSaveStudentInfo = () => {
    if (!editingStudent) return;
    
    const updateData: any = {};
    if (editForm.gender) updateData.gender = editForm.gender;
    if (editForm.dateOfBirth) updateData.dateOfBirth = editForm.dateOfBirth;
    if (editForm.placeOfBirth) updateData.placeOfBirth = editForm.placeOfBirth;
    
    if (Object.keys(updateData).length === 0) {
      toast({
        title: isRTL ? "لا توجد تغييرات" : "No Changes",
        description: isRTL ? "يرجى إدخال بيانات للتحديث." : "Please enter data to update.",
        variant: "destructive",
      });
      return;
    }
    
    updateStudentMutation.mutate({ studentId: editingStudent.id, data: updateData });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && eligibleStudents.length > 0) {
      setSelectedStudents(eligibleStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handlePreview = (student: StudentWithCertificate) => {
    setPreviewStudent(student);
    setShowPreviewDialog(true);
  };

  const handleDownloadCertificate = (certificateId: number) => {
    window.open(`/api/certificates/${certificateId}/download`, '_blank');
  };

  const handlePrintSelected = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: isRTL ? "لا يوجد اختيار" : "No Selection",
        description: isRTL ? "يرجى اختيار طالب واحد على الأقل لإنشاء الشهادات." : "Please select at least one student to generate certificates.",
        variant: "destructive",
      });
      return;
    }
    generateCertificateMutation.mutate(selectedStudents);
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.certificates.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إنشاء وطباعة شهادات إنجاز الطلاب" : "Generate and print student achievement certificates"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="standard" className="flex items-center gap-2" data-testid="tab-standard">
            <Award className="w-4 h-4" />
            {isRTL ? "الشهادات القياسية" : "Standard Certificates"}
          </TabsTrigger>
          <TabsTrigger value="arabic" className="flex items-center gap-2" data-testid="tab-arabic">
            <FileCheck2 className="w-4 h-4" />
            {isRTL ? "الشهادات العربية" : "Arabic Certificates"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handlePrintSelected}
              disabled={selectedStudents.length === 0 || generateCertificateMutation.isPending}
              data-testid="button-generate-selected"
            >
              <Printer className="w-4 h-4 me-2" />
              {isRTL ? `إنشاء المحدد (${selectedStudents.length})` : `Generate Selected (${selectedStudents.length})`}
            </Button>
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={!selectedSchool || generateAllMutation.isPending}
              data-testid="button-generate-all"
            >
              <Download className="w-4 h-4 me-2" />
              {isRTL ? "إنشاء الكل للمدرسة" : "Generate All for School"}
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{isRTL ? "تصفية الطلاب" : "Filter Students"}</CardTitle>
              <CardDescription>
                {isRTL ? "حدد المنطقة والمجموعة والمدرسة لعرض الطلاب" : "Select region, cluster, and school to view students"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    {isRTL ? "السنة الامتحانية" : "Exam Year"}
                  </label>
                  <Select value={selectedExamYear} onValueChange={(value) => {
                    setSelectedExamYear(value);
                    setSelectedStudents([]);
                  }}>
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
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {t.schools.region}
                  </label>
                  <Select value={selectedRegion} onValueChange={(value) => {
                    setSelectedRegion(value);
                    setSelectedCluster("");
                    setSelectedSchool("");
                    setSelectedStudents([]);
                  }}>
                    <SelectTrigger data-testid="select-region">
                      <SelectValue placeholder={isRTL ? "اختر المنطقة" : "Select Region"} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map(region => (
                        <SelectItem key={region.id} value={region.id.toString()}>
                          {region.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                {t.schools.cluster}
              </label>
              <Select 
                value={selectedCluster} 
                onValueChange={(value) => {
                  setSelectedCluster(value);
                  setSelectedSchool("");
                  setSelectedStudents([]);
                }}
                disabled={!selectedRegion}
              >
                <SelectTrigger data-testid="select-cluster">
                  <SelectValue placeholder={isRTL ? "اختر المجموعة" : "Select Cluster"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredClusters.map(cluster => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <School className="w-4 h-4 text-muted-foreground" />
                {t.schools.title}
              </label>
              <Select 
                value={selectedSchool} 
                onValueChange={(value) => {
                  setSelectedSchool(value);
                  setSelectedStudents([]);
                }}
                disabled={!selectedRegion}
              >
                <SelectTrigger data-testid="select-school">
                  <SelectValue placeholder={isRTL ? "اختر المدرسة" : "Select School"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSchools.map(school => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الطلاب المؤهلون" : "Eligible Students"}</p>
                <p className="text-2xl font-semibold">{eligibleStudents.length}</p>
                {nonEligibleStudents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ({nonEligibleStudents.length} {isRTL ? "غير مؤهل" : "not eligible"})
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "المحدد" : "Selected"}</p>
                <p className="text-2xl font-semibold text-chart-2">{selectedStudents.length}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.examYears.title}</p>
                <p className="text-lg font-semibold">{activeExamYear?.name || (isRTL ? "غير متوفر" : "N/A")}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.schools.title}</p>
                <p className="text-sm font-medium truncate max-w-[120px]">
                  {filteredSchools.find(s => s.id.toString() === selectedSchool)?.name || (isRTL ? "لا يوجد" : "None")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <School className="w-5 h-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-lg">{isRTL ? "قائمة الطلاب" : "Student List"}</CardTitle>
              <CardDescription>
                {selectedSchool 
                  ? (isRTL ? `${students?.length || 0} طالب موجود` : `${students?.length || 0} students found`) 
                  : (isRTL ? "اختر مدرسة لعرض الطلاب" : "Select a school to view students")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSchool ? (
            <div className="text-center py-12">
              <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{isRTL ? "لم يتم اختيار مدرسة" : "No School Selected"}</h3>
              <p className="text-muted-foreground">
                {isRTL ? "يرجى اختيار منطقة ومجموعة ومدرسة لعرض الطلاب" : "Please select a region, cluster, and school to view students"}
              </p>
            </div>
          ) : studentsLoading ? (
            <CertificatesTableSkeleton />
          ) : eligibleStudents.length > 0 || nonEligibleStudents.length > 0 ? (
            <div className="space-y-4">
              {nonEligibleStudents.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                  <span className="text-sm text-amber-800 dark:text-amber-400">
                    {isRTL 
                      ? `${nonEligibleStudents.length} طالب في صفوف غير 6 أو 9 أو 12 غير مؤهلين للحصول على شهادات`
                      : `${nonEligibleStudents.length} student(s) in grades other than 6, 9, or 12 are not eligible for certificates`}
                  </span>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={eligibleStudents.length > 0 && selectedStudents.length === eligibleStudents.length}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>{t.students.title}</TableHead>
                      <TableHead>{isRTL ? "رقم الفهرس" : "Index Number"}</TableHead>
                      <TableHead>{isRTL ? "الصف" : "Grade"}</TableHead>
                      <TableHead>{isRTL ? "الجنس" : "Gender"}</TableHead>
                      <TableHead>{isRTL ? "حالة الشهادة" : "Certificate Status"}</TableHead>
                      <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleStudents.map((student) => {
                      const certificate = getStudentCertificate(student.id);
                      return (
                        <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                              data-testid={`checkbox-student-${student.id}`}
                            />
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
                                <p className="text-sm text-muted-foreground">
                                  {student.dateOfBirth 
                                    ? new Date(student.dateOfBirth).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') 
                                    : (isRTL ? "غير متوفر" : "N/A")}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {student.indexNumber || (isRTL ? "قيد الانتظار" : "Pending")}
                            </code>
                          </TableCell>
                          <TableCell>{isRTL ? `الصف ${student.grade}` : `Grade ${student.grade}`}</TableCell>
                          <TableCell className="capitalize">{student.gender === 'male' ? (isRTL ? 'ذكر' : 'male') : (isRTL ? 'أنثى' : 'female')}</TableCell>
                          <TableCell>
                            {certificate ? (
                              <Badge variant="default" className="bg-chart-3/10 text-chart-3">
                                {isRTL ? "تم الإنشاء" : "Generated"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {t.common.pending}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={isRTL ? "text-left" : "text-right"}>
                            <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : "justify-end"}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(student)}
                                data-testid={`button-preview-${student.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {certificate && certificate.pdfUrl ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadCertificate(certificate.id)}
                                  data-testid={`button-download-${student.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generateCertificateMutation.mutate([student.id])}
                                  disabled={generateCertificateMutation.isPending}
                                  data-testid={`button-generate-${student.id}`}
                                >
                                  {generateCertificateMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Award className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{isRTL ? "لم يتم العثور على طلاب" : "No Students Found"}</h3>
              <p className="text-muted-foreground">
                {isRTL ? "هذه المدرسة ليس بها طلاب مسجلين" : "This school has no registered students"}
              </p>
            </div>
          )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="arabic" className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-primary" />
                  {isRTL ? "شهادة إتمام المرحلة الابتدائية" : "Primary Certificate Generation"}
                </CardTitle>
                <CardDescription>
                  {isRTL 
                    ? "إنشاء شهادات عربية رسمية مع كشف تلقائي للجنس من الأسماء" 
                    : "Generate official Arabic certificates with automatic gender detection from names"}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  const eligibleIds = eligibleStudentsData?.students
                    ?.filter(s => s.isEligible)
                    .map(s => s.id) || [];
                  if (eligibleIds.length > 0) {
                    generatePrimaryMutation.mutate(eligibleIds);
                  } else {
                    toast({
                      title: isRTL ? "لا توجد طلاب مؤهلين" : "No Eligible Students",
                      description: isRTL ? "يجب أن يكون لدى الطلاب بيانات كاملة ونتائج منشورة." : "Students must have complete data and published results.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={generatePrimaryMutation.isPending || !eligibleStudentsData?.summary?.eligible}
                data-testid="button-generate-arabic-all"
              >
                {generatePrimaryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <Award className="w-4 h-4 me-2" />
                )}
                {isRTL 
                  ? `إنشاء الشهادات العربية (${eligibleStudentsData?.summary?.eligible || 0})` 
                  : `Generate Arabic Certs (${eligibleStudentsData?.summary?.eligible || 0})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  {isRTL ? "السنة الامتحانية" : "Exam Year"}
                </Label>
                <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
                  <SelectTrigger data-testid="select-arabic-exam-year">
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
                  <School className="w-4 h-4 text-muted-foreground" />
                  {isRTL ? "المدرسة" : "School"}
                </Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger data-testid="select-arabic-school">
                    <SelectValue placeholder={isRTL ? "الكل" : "All Schools"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? "الكل" : "All Schools"}</SelectItem>
                    {schools.map(school => (
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
                  <SelectTrigger data-testid="select-arabic-grade">
                    <SelectValue placeholder={isRTL ? "الكل" : "All Grades"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? "الكل" : "All Grades"}</SelectItem>
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

            {eligibleLoading ? (
              <CertificatesTableSkeleton />
            ) : eligibleStudentsData?.students && eligibleStudentsData.students.length > 0 ? (
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
                      <TableRow key={student.id} data-testid={`row-arabic-student-${student.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{student.firstName} {student.lastName}</p>
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
                          ) : !student.passed ? (
                            <Badge variant="destructive">
                              {isRTL ? "راسب" : "Failed"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {isRTL ? "بلا نتائج" : "No Results"}
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
                                data-testid={`button-generate-arabic-${student.id}`}
                              >
                                {generatePrimaryMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Award className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {student.hasCertificate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-view-cert-${student.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{isRTL ? "لا توجد طلاب" : "No Students Found"}</h3>
                <p className="text-muted-foreground">
                  {isRTL ? "اختر سنة امتحانية لعرض الطلاب المؤهلين" : "Select an exam year to view eligible students"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isRTL ? "معاينة الشهادة" : "Certificate Preview"}</DialogTitle>
          <DialogDescription>
            {isRTL 
              ? `معاينة شهادة ${previewStudent?.firstName} ${previewStudent?.lastName}`
              : `Preview certificate for ${previewStudent?.firstName} ${previewStudent?.lastName}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-primary/20 rounded-lg p-8 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Award className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-2xl font-serif font-semibold">
                {isRTL ? "شهادة إنجاز" : "Certificate of Achievement"}
              </h2>
              <p className="text-muted-foreground">{isRTL ? "نشهد بأن" : "This is to certify that"}</p>
              <h3 className="text-xl font-semibold text-primary">
                {previewStudent?.firstName} {previewStudent?.lastName}
              </h3>
              <p className="text-muted-foreground">
                {isRTL ? "رقم الفهرس:" : "Index Number:"} {previewStudent?.indexNumber || (isRTL ? "غير متوفر" : "N/A")}
              </p>
              <p className="text-muted-foreground">{isRTL ? "من" : "of"}</p>
              <p className="font-medium">
                {filteredSchools.find(s => s.id.toString() === selectedSchool)?.name || (isRTL ? "مدرسة غير معروفة" : "Unknown School")}
              </p>
              <p className="text-muted-foreground">
                {isRTL 
                  ? `قد أكمل بنجاح امتحانات ${activeExamYear?.name || "العام الدراسي"}`
                  : `has successfully completed the ${activeExamYear?.name || "Academic Year"} examinations`}
              </p>
              <p className="text-lg font-semibold">
                {isRTL ? "مستوى الصف:" : "Grade Level:"}{" "}
                <span className="text-chart-3">
                  {isRTL ? `الصف ${previewStudent?.grade}` : `Grade ${previewStudent?.grade}`}
                </span>
              </p>
              <div className="pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "سيتم إصدار الشهادة عند الإنشاء" : "Certificate will be issued upon generation"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
            {t.common.close}
          </Button>
          <Button onClick={() => {
            if (previewStudent) {
              generateCertificateMutation.mutate([previewStudent.id]);
            }
            setShowPreviewDialog(false);
          }}>
            <Award className="w-4 h-4 me-2" />
            {isRTL ? "إنشاء الشهادة" : "Generate Certificate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
    </div>
  );
}
