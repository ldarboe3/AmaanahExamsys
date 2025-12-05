import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

// Grade colors for visual distinction
const GRADE_COLORS: Record<number, { bg: string; icon: string; border: string }> = {
  3: { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/30" },
  6: { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/30" },
  9: { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/30" },
  12: { bg: "bg-purple-500/10", icon: "text-purple-500", border: "border-purple-500/30" },
};

const getGradeColors = (grade: number) => {
  return GRADE_COLORS[grade] || { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/30" };
};

const getGradeLabel = (grade: number, isRTL: boolean) => {
  return isRTL ? `الصف ${grade}` : `Grade ${grade}`;
};

interface ResultWithRelations extends StudentResult {
  student?: Student & { school?: { id: number; name: string }; cluster?: { id: number; name: string }; region?: { id: number; name: string } };
  subject?: Subject;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch exam years
  const { data: examYears, isLoading: examYearsLoading } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  // Fetch regions, clusters, schools
  const { data: regions } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });
  const { data: schoolsList } = useQuery<School[]>({ queryKey: ["/api/schools"] });
  const schools = Array.isArray(schoolsList) ? schoolsList : [];

  // Fetch results for the selected exam year and grade
  const resultsUrl = useMemo(() => {
    if (!selectedExamYear || !selectedGrade) return null;
    const params = new URLSearchParams();
    params.set("examYearId", selectedExamYear.toString());
    params.set("grade", selectedGrade.toString());
    return `/api/results?${params.toString()}`;
  }, [selectedExamYear, selectedGrade]);

  const { data: results, isLoading: resultsLoading } = useQuery<ResultWithRelations[]>({
    queryKey: [resultsUrl || ""],
    enabled: !!resultsUrl,
  });

  // Filter schools by region and cluster
  const filteredSchools = useMemo(() => {
    return schools.filter((school: School) => {
      if (regionFilter !== "all" && school.regionId !== parseInt(regionFilter)) return false;
      if (clusterFilter !== "all" && school.clusterId !== parseInt(clusterFilter)) return false;
      return true;
    });
  }, [schools, regionFilter, clusterFilter]);

  // Get unique grades from results
  const uniqueGrades = useMemo(() => {
    if (!examYears) return [];
    const selectedYear = examYears.find(y => y.id === selectedExamYear);
    // For now, support all grades 3, 6, 9, 12
    return [3, 6, 9, 12];
  }, [examYears, selectedExamYear]);

  // Filter results by search and location filters
  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter((result) => {
      const studentName = `${result.student?.firstName || ''} ${result.student?.lastName || ''}`.toLowerCase();
      const matchesSearch = studentName.includes(searchQuery.toLowerCase()) || 
        (result.student?.indexNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRegion = regionFilter === "all" || result.student?.region?.id === parseInt(regionFilter);
      const matchesCluster = clusterFilter === "all" || result.student?.cluster?.id === parseInt(clusterFilter);
      const matchesSchool = schoolFilter === "all" || result.student?.school?.id === parseInt(schoolFilter);
      return matchesSearch && matchesRegion && matchesCluster && matchesSchool;
    });
  }, [results, searchQuery, regionFilter, clusterFilter, schoolFilter]);

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; examYearId: number; grade: number }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('examYearId', String(data.examYearId));
      formData.append('grade', String(data.grade));
      
      const response = await fetch('/api/results/comprehensive-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data: any) => {
      const summary = data.summary || {};
      setUploadProgress({ 
        created: (summary.studentsCreated || 0) + (summary.resultsCreated || 0), 
        updated: 0, 
        errors: summary.errorsCount || 0
      });
      queryClient.invalidateQueries({ queryKey: [resultsUrl] });
      toast({
        title: isRTL ? "تم تحميل النتائج" : "Results Uploaded Successfully",
        description: isRTL 
          ? `تم إنشاء ${summary.studentsCreated || 0} طالب و${summary.resultsCreated || 0} نتيجة` 
          : `Created ${summary.studentsCreated || 0} students and ${summary.resultsCreated || 0} results`,
      });
      setShowUploadDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تحميل النتائج" : "Failed to upload results"),
        variant: "destructive",
      });
    },
  });

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
                  <p className="text-sm text-muted-foreground mb-4">
                    {year.examStartDate && year.examEndDate ? (
                      <>
                        {new Date(year.examStartDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} - {new Date(year.examEndDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </>
                    ) : (
                      isRTL ? "لا توجد تواريخ" : "No dates set"
                    )}
                  </p>
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
              <p className="text-muted-foreground">
                {isRTL ? "لم يتم إنشاء أي سنوات امتحانية بعد" : "No examination years have been created yet"}
              </p>
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

  // LEVEL 3: Results List View
  const renderResultsList = () => {
    const currentYear = examYears?.find(y => y.id === selectedExamYear);
    
    return (
      <div className="space-y-6">
        {/* Header with back button */}
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
              {currentYear?.name} - {isRTL ? "عرض النتائج" : "View Results"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الطلاب" : "Students"}</p>
                  <p className="text-2xl font-semibold">{filteredResults.length}</p>
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
                  <p className="text-sm text-muted-foreground">{isRTL ? "معلق" : "Pending"}</p>
                  <p className="text-2xl font-semibold">{filteredResults.filter(r => r.status === 'pending').length}</p>
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
                  <p className="text-sm text-muted-foreground">{isRTL ? "منشور" : "Published"}</p>
                  <p className="text-2xl font-semibold">{filteredResults.filter(r => r.status === 'published').length}</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-chart-3" />
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
          <Button variant="outline" data-testid="button-download-template">
            <FileSpreadsheet className="w-4 h-4 me-2" />
            {isRTL ? "القالب" : "Template"}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={isRTL ? "البحث باسم الطالب أو رقم الفهرس..." : "Search by student name or index number..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{isRTL ? "قائمة النتائج" : "Results List"}</CardTitle>
            <CardDescription>
              {filteredResults.length} {isRTL ? "نتيجة" : "results"} {isRTL ? "وجدت" : "found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultsLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredResults.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "الطالب" : "Student"}</TableHead>
                      <TableHead>{isRTL ? "رقم الفهرس" : "Index #"}</TableHead>
                      <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                      <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.id} data-testid={`row-result-${result.id}`}>
                        <TableCell className="font-medium">
                          {result.student?.firstName} {result.student?.lastName}
                        </TableCell>
                        <TableCell>{result.student?.indexNumber || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {result.student?.school?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-chart-3/10 text-chart-3">
                            {result.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        renderResultsList()
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تحميل النتائج" : "Upload Results"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "قم بتحميل ملف CSV يحتوي على النتائج" : "Upload a CSV file containing results"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              type="file" 
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && selectedExamYear && selectedGrade) {
                  setIsUploading(true);
                  uploadMutation.mutate({
                    file,
                    examYearId: selectedExamYear,
                    grade: selectedGrade,
                  });
                }
              }}
              data-testid="input-results-file"
            />
            {uploadProgress && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium mb-2">
                  {isRTL ? "النتائج:" : "Results:"}
                </p>
                <p className="text-sm">{isRTL ? "مُنشأ" : "Created"}: {uploadProgress.created}</p>
                <p className="text-sm">{isRTL ? "أخطاء" : "Errors"}: {uploadProgress.errors}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
