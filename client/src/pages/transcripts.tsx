import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatNumber } from "@/lib/formatters";
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
  Trash2,
  RefreshCw,
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
  finalGrade: string;
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

function GeneratingOverlay({ isRTL, count }: { isRTL: boolean; count: number }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-8 rounded-lg shadow-lg border max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <div className="relative w-20 h-20 mx-auto">
            <Loader2 className="w-20 h-20 text-primary animate-spin" />
            <FileText className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isRTL ? "جاري إنشاء كشوف الدرجات..." : "Generating Transcripts..."}
        </h3>
        <p className="text-muted-foreground mb-4">
          {isRTL 
            ? `يرجى الانتظار، جاري إنشاء ${count} كشف درجات`
            : `Please wait, generating ${count} transcript(s)`}
        </p>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {isRTL 
            ? "قد يستغرق هذا بضع ثوانٍ لكل كشف درجات"
            : "This may take a few seconds per transcript"}
        </p>
      </div>
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
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<EligibleStudent | null>(null);
  const [previewTranscript, setPreviewTranscript] = useState<Transcript | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const allStudentsForBulkOps = useMemo(() => {
    return (eligibleStudents || []).filter(s => {
      const school = schools.find((sch: SchoolType) => sch.id === s.schoolId);
      if (!school) return false;
      if (selectedRegion !== "all" && school.regionId !== parseInt(selectedRegion)) return false;
      if (selectedCluster !== "all" && school.clusterId !== parseInt(selectedCluster)) return false;
      if (selectedSchool !== "all" && s.schoolId !== parseInt(selectedSchool)) return false;
      return true;
    });
  }, [eligibleStudents, schools, selectedRegion, selectedCluster, selectedSchool]);

  const filterCounts = useMemo(() => {
    const regionCounts: Record<number, number> = {};
    const clusterCounts: Record<number, number> = {};
    const schoolCounts: Record<number, number> = {};
    
    const studentsToCount = eligibleStudents || [];
    
    studentsToCount.forEach((student: EligibleStudent) => {
      const school = schools.find((s: SchoolType) => s.id === student.schoolId);
      if (school) {
        if (school.regionId) {
          regionCounts[school.regionId] = (regionCounts[school.regionId] || 0) + 1;
        }
        if (school.clusterId) {
          clusterCounts[school.clusterId] = (clusterCounts[school.clusterId] || 0) + 1;
        }
        schoolCounts[student.schoolId] = (schoolCounts[student.schoolId] || 0) + 1;
      }
    });
    
    return { regionCounts, clusterCounts, schoolCounts, total: studentsToCount.length };
  }, [eligibleStudents, schools]);

  const getStudentTranscript = (studentId: number): Transcript | undefined => {
    const examYearId = selectedExamYear ? parseInt(selectedExamYear) : activeExamYear?.id;
    return allTranscripts?.find(t => t.studentId === studentId && t.examYearId === examYearId);
  };

  const filteredStudents = eligibleStudents?.filter(s => {
    const school = schools.find((sch: SchoolType) => sch.id === s.schoolId);
    if (!school) return false;
    if (selectedRegion !== "all" && school.regionId !== parseInt(selectedRegion)) return false;
    if (selectedCluster !== "all" && school.clusterId !== parseInt(selectedCluster)) return false;
    if (selectedSchool !== "all" && s.schoolId !== parseInt(selectedSchool)) return false;
    return true;
  }).map(s => ({
    ...s,
    hasTranscript: !!getStudentTranscript(s.id)
  })) || [];

  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const summary = {
    total: totalStudents,
    withTranscript: filteredStudents.filter(s => s.hasTranscript).length,
    eligible: filteredStudents.filter(s => !s.hasTranscript).length,
  };

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
      
      if (errors.length > 0) {
        const errorMessages = errors.map((err: any) => `${err.studentName || err.studentId}: ${err.error}`).join('\n');
        toast({
          title: isRTL ? "خطأ في الإنشاء" : "Generation Failed",
          description: isRTL 
            ? `تم إنشاء ${generated} فقط. الأخطاء:\n${errorMessages}`
            : `Only generated ${generated}. Errors:\n${errorMessages}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: isRTL ? "تم إنشاء كشوف الدرجات" : "Transcripts Generated",
          description: isRTL 
            ? `تم إنشاء ${generated} كشف درجات بنجاح`
            : `Successfully generated ${generated} transcript(s)`,
          variant: "default",
        });
      }
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

  const deleteAllTranscriptsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/transcripts/delete-all");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: isRTL ? "تم حذف كشوف الدرجات" : "Transcripts Deleted",
        description: isRTL 
          ? `تم حذف ${data.deletedRecords} كشف درجات و ${data.deletedFiles} ملف`
          : `Deleted ${data.deletedRecords} transcript records and ${data.deletedFiles} files`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts/eligible-g6-students"] });
      setSelectedStudents([]);
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ في الحذف" : "Delete Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importFiqhMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/import-fiqh-marks");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: isRTL ? "تم استيراد درجات الفقه" : "Fiqh Marks Imported",
        description: isRTL 
          ? `تم إدخال ${data.inserted} درجة، تخطي ${data.skipped}، غير متطابق ${data.notMatched}`
          : `Inserted ${data.inserted}, skipped ${data.skipped}, unmatched ${data.notMatched}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts/eligible-g6-students"] });
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ في الاستيراد" : "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredEligibleIds = filteredStudents
        .filter(s => !s.hasTranscript)
        .map(s => s.id);
      setSelectedStudents(allFilteredEligibleIds);
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectPageAll = (checked: boolean) => {
    if (checked) {
      const pageEligibleIds = paginatedStudents
        .filter(s => !s.hasTranscript)
        .map(s => s.id);
      setSelectedStudents(prev => {
        const newSet = new Set([...prev, ...pageEligibleIds]);
        return Array.from(newSet);
      });
    } else {
      const pageIds = new Set(paginatedStudents.map(s => s.id));
      setSelectedStudents(prev => prev.filter(id => !pageIds.has(id)));
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
    const eligibleIds = allStudentsForBulkOps
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

  const handleDownload = async (transcriptId: number, studentId?: number) => {
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}/download`, { credentials: 'include' });
      if (response.status === 404) {
        toast({
          title: isRTL ? "ملف PDF غير موجود" : "PDF File Missing",
          description: isRTL
            ? "ملف PDF غير موجود. سيتم إعادة إنشاؤه الآن..."
            : "PDF file is missing. Regenerating now...",
        });
        if (studentId) {
          generateTranscriptMutation.mutate([studentId]);
        }
        return;
      }
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `transcript_${transcriptId}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: isRTL ? "خطأ في التنزيل" : "Download Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handlePrintAll = () => {
    const transcriptsWithPdf = allStudentsForBulkOps
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

  const handlePrintSelected = () => {
    const selectedTranscripts = selectedStudents
      .map(id => {
        const student = filteredStudents.find(s => s.id === id);
        if (student?.hasTranscript) {
          return getStudentTranscript(id);
        }
        return undefined;
      })
      .filter(t => t !== undefined);

    if (selectedTranscripts.length === 0) {
      toast({
        title: isRTL ? "لا توجد كشوف للطباعة" : "No Transcripts to Print",
        description: isRTL 
          ? "الطلاب المحددون ليس لديهم كشوف درجات بعد. قم بإنشائها أولاً." 
          : "Selected students don't have transcripts yet. Generate them first.",
        variant: "destructive",
      });
      return;
    }

    selectedTranscripts.forEach((t, index) => {
      setTimeout(() => {
        window.open(`/api/transcripts/${t!.id}/download`, '_blank');
      }, index * 500);
    });

    toast({
      title: isRTL ? "جاري الطباعة" : "Printing Selected",
      description: isRTL 
        ? `جاري فتح ${selectedTranscripts.length} كشف درجات للطباعة.`
        : `Opening ${selectedTranscripts.length} transcripts for printing.`,
    });
  };

  const allPageEligibleSelected = paginatedStudents.filter(s => !s.hasTranscript).length > 0 &&
    paginatedStudents.filter(s => !s.hasTranscript).every(s => selectedStudents.includes(s.id));

  const selectedWithTranscripts = selectedStudents.filter(id => {
    const student = filteredStudents.find(s => s.id === id);
    return student?.hasTranscript;
  }).length;

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {generateTranscriptMutation.isPending && (
        <GeneratingOverlay isRTL={isRTL} count={selectedStudents.length || summary.eligible} />
      )}
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
            onClick={() => importFiqhMutation.mutate()}
            disabled={importFiqhMutation.isPending}
            data-testid="button-import-fiqh"
          >
            {importFiqhMutation.isPending ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 me-2" />
            )}
            {isRTL ? "استيراد درجات الفقه" : "Import Fiqh Marks"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteAllTranscriptsMutation.isPending || !allTranscripts || allTranscripts.length === 0}
            data-testid="button-delete-all-transcripts"
          >
            <Trash2 className="w-4 h-4 me-2" />
            {isRTL ? "حذف الكل" : "Delete All"}
          </Button>
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
                  <SelectItem value="all">
                    {isRTL ? "الكل" : "All Regions"} ({formatNumber(filterCounts.total)})
                  </SelectItem>
                  {regions?.map(region => {
                    const count = filterCounts.regionCounts[region.id] || 0;
                    return (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name} ({formatNumber(count)})
                      </SelectItem>
                    );
                  })}
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
                  <SelectItem value="all">
                    {isRTL ? "الكل" : "All Clusters"} ({formatNumber(
                      selectedRegion === "all" 
                        ? filterCounts.total 
                        : Object.entries(filterCounts.clusterCounts)
                            .filter(([clusterId]) => {
                              const cluster = clusters?.find(c => c.id === parseInt(clusterId));
                              return cluster?.regionId === parseInt(selectedRegion);
                            })
                            .reduce((sum, [, count]) => sum + count, 0)
                    )})
                  </SelectItem>
                  {filteredClusters.map(cluster => {
                    const count = filterCounts.clusterCounts[cluster.id] || 0;
                    return (
                      <SelectItem key={cluster.id} value={cluster.id.toString()}>
                        {cluster.name} ({formatNumber(count)})
                      </SelectItem>
                    );
                  })}
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
                  <SelectItem value="all">
                    {isRTL ? "الكل" : "All Schools"} ({formatNumber(
                      filteredSchools.reduce((sum: number, s: SchoolType) => sum + (filterCounts.schoolCounts[s.id] || 0), 0)
                    )})
                  </SelectItem>
                  {filteredSchools.map(school => {
                    const count = filterCounts.schoolCounts[school.id] || 0;
                    return (
                      <SelectItem key={school.id} value={school.id.toString()}>
                        {school.name} ({formatNumber(count)})
                      </SelectItem>
                    );
                  })}
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {isRTL ? `تم تحديد ${selectedStudents.length}` : `${selectedStudents.length} selected`}
                </Badge>
                <Button
                  variant="outline"
                  onClick={handlePrintSelected}
                  disabled={selectedWithTranscripts === 0}
                  size="sm"
                  data-testid="button-print-selected"
                >
                  <Printer className="w-4 h-4 me-2" />
                  {isRTL 
                    ? `طباعة المحدد (${selectedWithTranscripts})` 
                    : `Print Selected (${selectedWithTranscripts})`}
                </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudents([])}
                  data-testid="button-clear-selection"
                >
                  {isRTL ? "إلغاء التحديد" : "Clear"}
                </Button>
              </div>
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
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {isRTL 
                      ? `عرض ${paginatedStudents.length} من ${totalStudents} (الصفحة ${currentPage})`
                      : `Showing ${paginatedStudents.length} of ${totalStudents} (Page ${currentPage})`}
                  </div>
                  {filteredStudents.filter(s => !s.hasTranscript).length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSelectAll(selectedStudents.length < filteredStudents.filter(s => !s.hasTranscript).length)}
                      data-testid="button-select-all-filtered"
                    >
                      {selectedStudents.length >= filteredStudents.filter(s => !s.hasTranscript).length
                        ? (isRTL ? "إلغاء تحديد الكل" : "Deselect All")
                        : (isRTL ? `تحديد الكل (${filteredStudents.filter(s => !s.hasTranscript).length})` : `Select All (${filteredStudents.filter(s => !s.hasTranscript).length})`)}
                    </Button>
                  )}
                </div>
                <Select value={pageSize.toString()} onValueChange={(val) => {
                  setPageSize(parseInt(val));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{isRTL ? "10 صفوف" : "10 Items"}</SelectItem>
                    <SelectItem value="50">{isRTL ? "50 صفوف" : "50 Items"}</SelectItem>
                    <SelectItem value="100">{isRTL ? "100 صفوف" : "100 Items"}</SelectItem>
                    <SelectItem value="500">{isRTL ? "500 صفوف" : "500 Items"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allPageEligibleSelected}
                          onCheckedChange={handleSelectPageAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>{isRTL ? "الطالب" : "Student"}</TableHead>
                      <TableHead>{isRTL ? "رقم الفهرس" : "Index"}</TableHead>
                      <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                      <TableHead>{isRTL ? "النتيجة النهائية" : "Final Result"}</TableHead>
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
                            <Badge variant={student.finalGrade === 'راسب' ? 'destructive' : 'default'}>
                              {student.finalGrade}
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
                                    onClick={() => handleDownload(transcript.id, student.id)}
                                    data-testid={`button-download-${student.id}`}
                                    title={isRTL ? "تنزيل" : "Download"}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => generateTranscriptMutation.mutate([student.id])}
                                    disabled={generateTranscriptMutation.isPending}
                                    data-testid={`button-regenerate-${student.id}`}
                                    title={isRTL ? "إعادة إنشاء PDF" : "Regenerate PDF"}
                                  >
                                    {generateTranscriptMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4" />
                                    )}
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
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
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
                  onClick={() => {
                    setCurrentPage(p => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
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
              <Button onClick={() => handleDownload(previewTranscript.id, previewStudent?.id)}>
                <Download className="w-4 h-4 me-2" />
                {isRTL ? "تنزيل PDF" : "Download PDF"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {isRTL ? "تأكيد حذف جميع كشوف الدرجات" : "Confirm Delete All Transcripts"}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "سيتم حذف جميع كشوف الدرجات المُنشأة وملفات PDF المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟" 
                : "This will delete all generated transcripts and their associated PDF files. This action cannot be undone. Are you sure?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteAllTranscriptsMutation.mutate()}
              disabled={deleteAllTranscriptsMutation.isPending}
              data-testid="button-confirm-delete-all"
            >
              {deleteAllTranscriptsMutation.isPending ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 me-2" />
              )}
              {isRTL ? "نعم، احذف الكل" : "Yes, Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
