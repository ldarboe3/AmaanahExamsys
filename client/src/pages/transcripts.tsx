import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  Printer,
  Download,
  User,
  School,
  MapPin,
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  GraduationCap,
  Users,
  AlertCircle,
  Award,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, Cluster, School as SchoolType, ExamYear, Transcript } from "@shared/schema";

interface EligibleStudent {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  indexNumber: string | null;
  gender: string | null;
  schoolId: number;
  schoolName: string;
  resultsCount: number;
  totalScore: number;
  percentage: string;
  hasTranscript?: boolean;
}

function TranscriptsTableSkeleton() {
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

export default function Transcripts() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<EligibleStudent | null>(null);
  const [previewTranscript, setPreviewTranscript] = useState<Transcript | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const { data: allTranscripts } = useQuery<Transcript[]>({
    queryKey: ["/api/transcripts"],
  });

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

  // Fetch eligible Grade 6 students with published results
  const { data: eligibleStudents, isLoading: studentsLoading } = useQuery<EligibleStudent[]>({
    queryKey: ["/api/transcripts/eligible-g6-students", selectedExamYear],
    queryFn: async () => {
      const url = selectedExamYear 
        ? `/api/transcripts/eligible-g6-students?examYearId=${selectedExamYear}`
        : '/api/transcripts/eligible-g6-students';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch eligible students');
      return response.json();
    },
    enabled: !!selectedExamYear,
  });

  // Check if student has a transcript
  const getStudentTranscript = (studentId: number): Transcript | undefined => {
    const examYearId = selectedExamYear ? parseInt(selectedExamYear) : activeExamYear?.id;
    return allTranscripts?.find(t => t.studentId === studentId && t.examYearId === examYearId);
  };

  // Filter students by school
  const filteredStudents = eligibleStudents?.filter(s => {
    if (selectedSchool !== "all" && s.schoolId !== parseInt(selectedSchool)) return false;
    return true;
  }).map(s => ({
    ...s,
    hasTranscript: !!getStudentTranscript(s.id)
  })) || [];

  // Pagination
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary stats
  const summary = {
    total: totalStudents,
    withTranscript: filteredStudents.filter(s => s.hasTranscript).length,
    eligible: filteredStudents.filter(s => !s.hasTranscript).length,
  };

  // Generate transcripts mutation
  const generateTranscriptMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      const response = await apiRequest("POST", "/api/transcripts/generate-g6-arabic", { 
        studentIds,
        examYearId: selectedExamYear ? parseInt(selectedExamYear) : activeExamYear?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      const generated = data.generated || 0;
      const errors = data.errors || [];
      
      toast({
        title: isRTL ? "تم إنشاء كشوف الدرجات" : "Transcripts Generated",
        description: isRTL 
          ? `تم إنشاء ${generated} كشف درجات بنجاح${errors.length > 0 ? `. ${errors.length} فشل.` : ''}`
          : `Successfully generated ${generated} transcript(s)${errors.length > 0 ? `. ${errors.length} failed.` : ''}`,
        variant: errors.length > generated ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts/eligible-g6-students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts"] });
      setSelectedStudents([]);
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ في الإنشاء" : "Generation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all students without transcripts on current page
      const eligibleIds = paginatedStudents
        .filter(s => !s.hasTranscript)
        .map(s => s.id);
      setSelectedStudents(eligibleIds);
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

  const handleGenerateAll = () => {
    const eligibleIds = filteredStudents
      .filter(s => !s.hasTranscript)
      .map(s => s.id);
    if (eligibleIds.length > 0) {
      generateTranscriptMutation.mutate(eligibleIds);
    } else {
      toast({
        title: isRTL ? "لا توجد طلاب مؤهلين" : "No Eligible Students",
        description: isRTL 
          ? "جميع الطلاب لديهم كشوف درجات بالفعل." 
          : "All students already have transcripts.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSelected = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: isRTL ? "لا يوجد اختيار" : "No Selection",
        description: isRTL ? "يرجى اختيار طالب واحد على الأقل." : "Please select at least one student.",
        variant: "destructive",
      });
      return;
    }
    generateTranscriptMutation.mutate(selectedStudents);
  };

  const handlePreview = async (student: EligibleStudent) => {
    setPreviewStudent(student);
    setShowPreviewDialog(true);
    setPreviewLoading(true);
    
    const transcript = getStudentTranscript(student.id);
    setPreviewTranscript(transcript || null);
    setPreviewLoading(false);
  };

  const handleDownload = (transcriptId: number) => {
    window.open(`/api/transcripts/${transcriptId}/download`, '_blank');
  };

  const handlePrintAll = () => {
    const transcriptsWithPdf = filteredStudents
      .filter(s => s.hasTranscript)
      .map(s => getStudentTranscript(s.id))
      .filter(t => t !== undefined);
    
    if (transcriptsWithPdf.length === 0) {
      toast({
        title: isRTL ? "لا توجد كشوف للطباعة" : "No Transcripts to Print",
        description: isRTL 
          ? "يرجى إنشاء كشوف الدرجات أولاً." 
          : "Please generate transcripts first.",
        variant: "destructive",
      });
      return;
    }
    
    // Open all PDFs in new tabs for printing
    transcriptsWithPdf.forEach((t, index) => {
      setTimeout(() => {
        window.open(`/api/transcripts/${t!.id}/download`, '_blank');
      }, index * 500);
    });
    
    toast({
      title: isRTL ? "جاري الطباعة" : "Printing",
      description: isRTL 
        ? `جاري فتح ${transcriptsWithPdf.length} كشف درجات للطباعة.`
        : `Opening ${transcriptsWithPdf.length} transcripts for printing.`,
    });
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            {isRTL ? "كشوف درجات الصف السادس" : "Grade 6 Arabic Transcripts"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL 
              ? "إنشاء كشوف الدرجات العربية للطلاب الذين لديهم نتائج منشورة" 
              : "Generate Arabic transcripts for students with published results"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrintAll}
            disabled={summary.withTranscript === 0}
            data-testid="button-print-all"
          >
            <Printer className="w-4 h-4 me-2" />
            {isRTL 
              ? `طباعة الكل (${summary.withTranscript})` 
              : `Print All (${summary.withTranscript})`}
          </Button>
          <Button
            onClick={handleGenerateAll}
            disabled={generateTranscriptMutation.isPending || summary.eligible === 0}
            data-testid="button-generate-all"
          >
            {generateTranscriptMutation.isPending ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Award className="w-4 h-4 me-2" />
            )}
            {isRTL 
              ? `إنشاء الكل (${summary.eligible})` 
              : `Generate All (${summary.eligible})`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{isRTL ? "تصفية الطلاب" : "Filter Students"}</CardTitle>
          <CardDescription>
            {isRTL ? "حدد السنة الامتحانية والمنطقة والمدرسة لعرض الطلاب المؤهلين" : "Select exam year, region, and school to view eligible students"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Award className="w-4 h-4 text-muted-foreground" />
                {isRTL ? "السنة الامتحانية" : "Exam Year"}
              </Label>
              <Select value={selectedExamYear} onValueChange={(value) => {
                setSelectedExamYear(value);
                setCurrentPage(1);
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
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {t.schools.region}
              </Label>
              <Select value={selectedRegion} onValueChange={(value) => {
                setSelectedRegion(value);
                setSelectedCluster("all");
                setSelectedSchool("all");
                setCurrentPage(1);
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
                  setCurrentPage(1);
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
                onValueChange={(value) => {
                  setSelectedSchool(value);
                  setCurrentPage(1);
                }}
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
          </div>

          {summary.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-semibold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-chart-3">{summary.eligible}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "بدون كشف" : "Needs Transcript"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-chart-2">{summary.withTranscript}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "لديه كشف" : "Has Transcript"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {isRTL ? "قائمة الطلاب المؤهلين" : "Eligible Students"}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? "طلاب الصف السادس الذين لديهم نتائج منشورة" 
                  : "Grade 6 students with published results"}
              </CardDescription>
            </div>
            {selectedStudents.length > 0 && (
              <Button
                onClick={handleGenerateSelected}
                disabled={generateTranscriptMutation.isPending}
                size="sm"
                data-testid="button-generate-selected"
              >
                {generateTranscriptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 me-2" />
                )}
                {isRTL 
                  ? `إنشاء المحدد (${selectedStudents.length})` 
                  : `Generate Selected (${selectedStudents.length})`}
              </Button>
            )}
          </div>
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
          ) : studentsLoading ? (
            <TranscriptsTableSkeleton />
          ) : paginatedStudents.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-muted-foreground">
                  {isRTL 
                    ? `عرض ${paginatedStudents.length} من ${totalStudents} (الصفحة ${currentPage})`
                    : `Showing ${paginatedStudents.length} of ${totalStudents} (Page ${currentPage})`}
                </div>
                <Select value={pageSize.toString()} onValueChange={(val) => {
                  setPageSize(parseInt(val));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{isRTL ? "10 صفات" : "10 Items"}</SelectItem>
                    <SelectItem value="50">{isRTL ? "50 صفات" : "50 Items"}</SelectItem>
                    <SelectItem value="100">{isRTL ? "100 صفات" : "100 Items"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedStudents.filter(s => !s.hasTranscript).length > 0 && 
                            paginatedStudents.filter(s => !s.hasTranscript).every(s => selectedStudents.includes(s.id))}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>{isRTL ? "الطالب" : "Student"}</TableHead>
                      <TableHead>{isRTL ? "رقم الفهرس" : "Index"}</TableHead>
                      <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                      <TableHead>{isRTL ? "النسبة" : "Percentage"}</TableHead>
                      <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                      <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => {
                      const transcript = getStudentTranscript(student.id);
                      return (
                        <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                              disabled={student.hasTranscript}
                              data-testid={`checkbox-student-${student.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{student.firstName} {student.middleName || ''} {student.lastName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {student.gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : 
                                   student.gender === 'female' ? (isRTL ? 'أنثى' : 'Female') : '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {student.indexNumber || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{student.schoolName}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {parseFloat(student.percentage).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {student.hasTranscript ? (
                              <Badge className="bg-chart-3/10 text-chart-3">
                                <CheckCircle2 className="w-3 h-3 me-1" />
                                {isRTL ? "لديه كشف" : "Has Transcript"}
                              </Badge>
                            ) : (
                              <Badge className="bg-chart-2/10 text-chart-2">
                                <AlertCircle className="w-3 h-3 me-1" />
                                {isRTL ? "مؤهل" : "Eligible"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={isRTL ? "text-left" : "text-right"}>
                            <div className={`flex items-center gap-2 ${isRTL ? "justify-start" : "justify-end"}`}>
                              {student.hasTranscript && transcript && (
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
                                    onClick={() => handleDownload(transcript.id)}
                                    data-testid={`button-download-${student.id}`}
                                    title={isRTL ? "تنزيل" : "Download"}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {!student.hasTranscript && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generateTranscriptMutation.mutate([student.id])}
                                  disabled={generateTranscriptMutation.isPending}
                                  data-testid={`button-generate-${student.id}`}
                                  title={isRTL ? "إنشاء" : "Generate"}
                                >
                                  {generateTranscriptMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
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
                  {isRTL ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= totalPages}
                  data-testid="button-next-page"
                >
                  {isRTL ? "التالي" : "Next"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{isRTL ? "لا يوجد طلاب مؤهلين" : "No Eligible Students"}</h3>
              <p className="text-muted-foreground">
                {isRTL 
                  ? "لا يوجد طلاب صف سادس لديهم نتائج منشورة" 
                  : "No Grade 6 students with published results found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {isRTL ? "معاينة كشف الدرجات" : "Transcript Preview"}
            </DialogTitle>
            <DialogDescription>
              {previewStudent && (
                <span>
                  {previewStudent.firstName} {previewStudent.middleName || ''} {previewStudent.lastName}
                  {' - '}
                  {isRTL ? "النسبة:" : "Percentage:"} {parseFloat(previewStudent.percentage).toFixed(1)}%
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewTranscript ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "رقم الكشف" : "Transcript Number"}</p>
                  <p className="font-mono font-medium">{previewTranscript.transcriptNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "تاريخ الإصدار" : "Issue Date"}</p>
                  <p className="font-medium">
                    {previewTranscript.issuedDate 
                      ? new Date(previewTranscript.issuedDate).toLocaleDateString() 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الصف" : "Grade"}</p>
                  <p className="font-medium">{previewTranscript.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "عدد الطباعات" : "Print Count"}</p>
                  <p className="font-medium">{previewTranscript.printCount || 0}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {isRTL ? "اضغط على زر التنزيل لعرض كشف الدرجات الكامل" : "Click download to view the full transcript PDF"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {isRTL ? "لم يتم العثور على كشف الدرجات" : "Transcript not found"}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t.common.cancel}
            </Button>
            {previewTranscript && (
              <Button onClick={() => handleDownload(previewTranscript.id)}>
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
