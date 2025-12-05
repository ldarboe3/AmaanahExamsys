import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  Printer,
  Download,
  User,
  School,
  MapPin,
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, Cluster, School as SchoolType, Student, ExamYear, Certificate } from "@shared/schema";

interface StudentWithCertificate extends Student {
  school?: SchoolType;
  certificate?: Certificate;
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
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<StudentWithCertificate | null>(null);

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
        <div className="flex gap-2">
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
    </div>
  );
}
