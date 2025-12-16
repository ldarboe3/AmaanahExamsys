import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  Loader2,
  School,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExamYear } from "@shared/schema";

interface PreviewResult {
  row: number;
  firstName: string;
  lastName: string;
  middleName: string;
  schoolName: string;
  matchedSchoolName?: string;
  matchedSchoolId?: number;
  matchedStudentId?: number;
  matchedStudentName?: string;
  indexNumber?: string;
  status: 'matched' | 'unmatched_school' | 'unmatched_student' | 'error';
  message: string;
  scores: { subjectId: number; subjectName: string; score: number | null }[];
}

interface PreviewResponse {
  success: boolean;
  preview: PreviewResult[];
  summary: {
    total: number;
    matched: number;
    unmatchedSchools: number;
    unmatchedStudents: number;
    errors: number;
    canProceed: boolean;
  };
  subjectColumns: { subjectId: number; subjectName: string }[];
}

export default function ResultsUpload() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'previewing' | 'preview_complete' | 'confirming' | 'confirmed'>('idle');

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData(null);
      setUploadPhase('idle');
    }
  };

  const handlePreview = async () => {
    if (!selectedFile || !selectedExamYear || !selectedGrade) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "يرجى تحديد الملف والسنة والصف" : "Please select file, exam year, and grade",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadPhase('previewing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('examYearId', selectedExamYear);
      formData.append('grade', selectedGrade);

      const response = await fetch('/api/bulk-upload/results/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Preview failed');
      }

      const data: PreviewResponse = await response.json();
      setPreviewData(data);
      setUploadPhase('preview_complete');

      toast({
        title: isRTL ? "تم تحليل الملف" : "File Analyzed",
        description: isRTL 
          ? `تم مطابقة ${data.summary.matched} من ${data.summary.total} سجل`
          : `Matched ${data.summary.matched} of ${data.summary.total} records`,
      });
    } catch (error: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
      setUploadPhase('idle');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData || previewData.summary.matched === 0) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "لا توجد سجلات متطابقة للتحميل" : "No matched records to upload",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    setUploadPhase('confirming');

    try {
      const response = await fetch('/api/bulk-upload/results/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examYearId: selectedExamYear,
          grade: selectedGrade,
          results: previewData.preview.filter(r => r.status === 'matched'),
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Confirm failed');
      }

      const data = await response.json();
      setUploadPhase('confirmed');

      toast({
        title: isRTL ? "تم التحميل بنجاح" : "Upload Successful",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
      setUploadPhase('preview_complete');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadUnmatched = async () => {
    if (!previewData) return;

    const unmatchedRecords = previewData.preview.filter(
      r => r.status === 'unmatched_school' || r.status === 'unmatched_student' || r.status === 'error'
    );

    if (unmatchedRecords.length === 0) {
      toast({
        title: isRTL ? "لا توجد سجلات" : "No Records",
        description: isRTL ? "جميع السجلات متطابقة" : "All records are matched",
      });
      return;
    }

    try {
      const response = await fetch('/api/bulk-upload/results/download-unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unmatchedRecords }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unmatched-results-records.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: isRTL ? "تم التنزيل" : "Downloaded",
        description: isRTL ? "تم تنزيل قائمة السجلات غير المتطابقة" : "Unmatched records list downloaded",
      });
    } catch (error: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setUploadPhase('idle');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="w-3 h-3 mr-1" /> {isRTL ? "متطابق" : "Matched"}</Badge>;
      case 'unmatched_school':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><School className="w-3 h-3 mr-1" /> {isRTL ? "مدرسة غير موجودة" : "School Not Found"}</Badge>;
      case 'unmatched_student':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Users className="w-3 h-3 mr-1" /> {isRTL ? "طالب غير موجود" : "Student Not Found"}</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><X className="w-3 h-3 mr-1" /> {isRTL ? "خطأ" : "Error"}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "تحميل النتائج" : "Results Upload"}</h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? "تحميل النتائج للطلاب المسجلين فقط - لن يتم إنشاء سجلات جديدة"
              : "Upload results for existing students only - no new records will be created"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {isRTL ? "تحميل ملف النتائج" : "Upload Results File"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "سيتم مطابقة المدارس والطلاب الموجودين فقط. السجلات غير المتطابقة ستكون متاحة للتنزيل للمراجعة."
              : "Only existing schools and students will be matched. Unmatched records will be available to download for verification."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {isRTL ? "السنة الدراسية" : "Exam Year"}
              </label>
              <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
                <SelectTrigger data-testid="select-exam-year">
                  <SelectValue placeholder={isRTL ? "اختر السنة" : "Select year"} />
                </SelectTrigger>
                <SelectContent>
                  {examYears?.map((year) => (
                    <SelectItem key={year.id} value={String(year.id)}>
                      {year.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {isRTL ? "الصف" : "Grade"}
              </label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger data-testid="select-grade">
                  <SelectValue placeholder={isRTL ? "اختر الصف" : "Select grade"} />
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
              <label className="text-sm font-medium mb-2 block">
                {isRTL ? "الملف" : "File"}
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                data-testid="input-file"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={!selectedFile || !selectedExamYear || !selectedGrade || isUploading}
              data-testid="button-preview"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRTL ? "جاري التحليل..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {isRTL ? "تحليل الملف" : "Analyze File"}
                </>
              )}
            </Button>

            {uploadPhase !== 'idle' && (
              <Button variant="outline" onClick={handleReset} data-testid="button-reset">
                {isRTL ? "إعادة تعيين" : "Reset"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {previewData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "ملخص التحليل" : "Analysis Summary"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{previewData.summary.total}</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? "إجمالي السجلات" : "Total Records"}</div>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 text-center">
                  <div className="text-2xl font-bold text-green-600">{previewData.summary.matched}</div>
                  <div className="text-sm text-green-600">{isRTL ? "متطابق" : "Matched"}</div>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 text-center">
                  <div className="text-2xl font-bold text-red-600">{previewData.summary.unmatchedSchools}</div>
                  <div className="text-sm text-red-600">{isRTL ? "مدارس غير موجودة" : "Schools Not Found"}</div>
                </div>
                <div className="p-4 rounded-lg bg-amber-500/10 text-center">
                  <div className="text-2xl font-bold text-amber-600">{previewData.summary.unmatchedStudents}</div>
                  <div className="text-sm text-amber-600">{isRTL ? "طلاب غير موجودين" : "Students Not Found"}</div>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 text-center">
                  <div className="text-2xl font-bold text-red-600">{previewData.summary.errors}</div>
                  <div className="text-sm text-red-600">{isRTL ? "أخطاء" : "Errors"}</div>
                </div>
              </div>

              {previewData.summary.matched > 0 && (
                <div className="mt-4">
                  <Progress 
                    value={(previewData.summary.matched / previewData.summary.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round((previewData.summary.matched / previewData.summary.total) * 100)}% {isRTL ? "معدل المطابقة" : "match rate"}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {previewData.summary.matched > 0 && uploadPhase === 'preview_complete' && (
                  <Button onClick={handleConfirm} disabled={isConfirming} data-testid="button-confirm">
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isRTL ? "جاري التحميل..." : "Uploading..."}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {isRTL ? `تحميل ${previewData.summary.matched} نتيجة` : `Upload ${previewData.summary.matched} Results`}
                      </>
                    )}
                  </Button>
                )}

                {(previewData.summary.unmatchedSchools > 0 || previewData.summary.unmatchedStudents > 0 || previewData.summary.errors > 0) && (
                  <Button variant="outline" onClick={handleDownloadUnmatched} data-testid="button-download-unmatched">
                    <Download className="w-4 h-4 mr-2" />
                    {isRTL ? "تنزيل غير المتطابقين" : "Download Unmatched"}
                  </Button>
                )}
              </div>

              {uploadPhase === 'confirmed' && (
                <div className="mt-4 p-4 bg-green-500/10 rounded-lg flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span>{isRTL ? "تم تحميل النتائج ونشرها بنجاح" : "Results uploaded and published successfully"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{isRTL ? "تفاصيل السجلات" : "Record Details"}</span>
                {previewData.subjectColumns.length > 0 && (
                  <Badge variant="secondary">
                    {previewData.subjectColumns.length} {isRTL ? "مواد" : "subjects"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{isRTL ? "الصف" : "Row"}</TableHead>
                      <TableHead>{isRTL ? "اسم الطالب" : "Student Name"}</TableHead>
                      <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                      <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isRTL ? "الملاحظة" : "Note"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.preview.slice(0, 100).map((result, idx) => (
                      <TableRow key={idx} className={result.status !== 'matched' ? 'bg-red-500/5' : ''}>
                        <TableCell className="font-mono text-sm">{result.row}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {result.firstName} {result.middleName} {result.lastName}
                            </span>
                            {result.matchedStudentName && result.status === 'matched' && (
                              <div className="text-xs text-muted-foreground">
                                {isRTL ? "متطابق مع:" : "Matched to:"} {result.matchedStudentName}
                                {result.indexNumber && ` (${result.indexNumber})`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span>{result.schoolName}</span>
                            {result.matchedSchoolName && result.schoolName !== result.matchedSchoolName && (
                              <div className="text-xs text-muted-foreground">
                                {isRTL ? "متطابق مع:" : "Matched to:"} {result.matchedSchoolName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {result.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.preview.length > 100 && (
                  <div className="text-center py-4 text-muted-foreground">
                    {isRTL 
                      ? `عرض 100 من ${previewData.preview.length} سجل`
                      : `Showing 100 of ${previewData.preview.length} records`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!previewData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isRTL ? "ملاحظة هامة" : "Important Note"}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {isRTL 
                ? "هذه الصفحة مخصصة لتحميل النتائج للطلاب والمدارس المسجلين مسبقاً فقط. لن يتم إنشاء أي سجلات جديدة. استخدم صفحة تسجيل الطلاب أولاً لإنشاء المدارس والطلاب."
                : "This page is for uploading results to existing students and schools only. No new records will be created. Use the Student Registration page first to create schools and students."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
