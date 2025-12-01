import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudentResult, Student, Subject } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  validated: "bg-chart-2/10 text-chart-2",
  published: "bg-chart-3/10 text-chart-3",
};

const gradeColors: Record<string, string> = {
  'A': "bg-chart-3/10 text-chart-3",
  'B': "bg-chart-2/10 text-chart-2",
  'C': "bg-chart-4/10 text-chart-4",
  'D': "bg-chart-5/10 text-chart-5",
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
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<ResultWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { data: results, isLoading } = useQuery<ResultWithRelations[]>({
    queryKey: ["/api/results", statusFilter, gradeFilter],
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
      return apiRequest("POST", `/api/results/publish-all`);
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

  const filteredResults = results?.filter((result) => {
    const studentName = `${result.student?.firstName} ${result.student?.lastName}`.toLowerCase();
    const matchesSearch =
      studentName.includes(searchQuery.toLowerCase()) ||
      result.student?.indexNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = results?.filter(r => r.status === 'pending').length || 0;
  const validatedCount = results?.filter(r => r.status === 'validated').length || 0;
  const publishedCount = results?.filter(r => r.status === 'published').length || 0;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.results.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "تحميل وتحقق ونشر نتائج الامتحانات" : "Upload, validate, and publish examination results"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-results">
            <Upload className="w-4 h-4 me-2" />
            {isRTL ? "تحميل النتائج" : "Upload Results"}
          </Button>
          <Button variant="outline" data-testid="button-download-template">
            <FileSpreadsheet className="w-4 h-4 me-2" />
            {isRTL ? "القالب" : "Template"}
          </Button>
          {validatedCount > 0 && (
            <Button onClick={() => publishAllMutation.mutate()} data-testid="button-publish-all">
              <Send className="w-4 h-4 me-2" />
              {isRTL ? `نشر (${validatedCount})` : `Publish (${validatedCount})`}
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
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي النتائج" : "Total Results"}</p>
                <p className="text-2xl font-semibold">{results?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary" />
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

      {/* Processing Progress */}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
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
            <div className="flex gap-2">
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
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-grade-filter">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-lg">{isRTL ? "قائمة النتائج" : "Results List"}</CardTitle>
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
          {isLoading ? (
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

      {/* Result Details Dialog */}
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

      {/* Upload Results Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تحميل النتائج" : "Upload Results"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "تحميل ملف CSV يحتوي على نتائج الامتحان" : "Upload a CSV file containing examination results"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {isRTL 
                  ? "اسحب وأفلت ملف CSV هنا، أو انقر للتصفح" 
                  : "Drag and drop your CSV file here, or click to browse"}
              </p>
              <Button variant="outline" size="sm">
                {isRTL ? "اختر ملفًا" : "Choose File"}
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{isRTL ? "هل تحتاج القالب؟" : "Need the template?"}</span>
              <Button variant="ghost" size="sm" className="h-auto p-0">
                <Download className="w-4 h-4 me-1" />
                {isRTL ? "تحميل القالب" : "Download Template"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button disabled>
              {isRTL ? "تحميل والتحقق" : "Upload & Validate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
