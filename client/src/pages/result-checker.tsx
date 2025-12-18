import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import QRCode from "qrcode";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  FileCheck, 
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  User,
  School,
  Calendar,
  Award,
  BookOpen,
  BarChart3,
  FileText,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExamYear {
  id: number;
  name: string;
  year: number;
  isActive: boolean;
}

interface ResultData {
  student: {
    id: number;
    indexNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    fullNameAr?: string;
    schoolEn: string;
    schoolAr: string;
    grade: number;
    levelEn: string;
    levelAr: string;
    examYear: string;
    examYearId: number;
    gender: string;
  };
  results: Array<{
    subjectEn: string;
    subjectAr: string;
    score: number;
    maxScore: number;
    grade: string;
    status: string;
    statusAr: string;
  }>;
  summary: {
    totalScore: number;
    maxPossibleScore: number;
    averageScore: number;
    subjectCount: number;
    passedCount: number;
    failedCount: number;
  };
  overallStatus: string;
  overallStatusAr: string;
  hasTranscript: boolean;
  transcriptId: number | null;
}

export default function ResultChecker() {
  const { toast } = useToast();
  const { t, language, isRTL } = useLanguage();
  const [indexNumber, setIndexNumber] = useState("");
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [searchParams, setSearchParams] = useState<{
    indexNumber: string;
    examYearId?: string;
    grade?: string;
  } | null>(null);
  const [generatingTranscript, setGeneratingTranscript] = useState(false);

  // Fetch exam years
  const { data: examYears = [] } = useQuery<ExamYear[]>({
    queryKey: ['/api/public/exam-years'],
  });

  // Build search query URL
  const buildSearchUrl = () => {
    if (!searchParams) return '';
    let url = `/api/public/results/search?indexNumber=${encodeURIComponent(searchParams.indexNumber)}`;
    if (searchParams.examYearId) {
      url += `&examYearId=${searchParams.examYearId}`;
    }
    if (searchParams.grade) {
      url += `&grade=${searchParams.grade}`;
    }
    return url;
  };

  const { data: resultData, isLoading, error, refetch } = useQuery<ResultData>({
    queryKey: ['/api/public/results/search', searchParams],
    queryFn: async () => {
      if (!searchParams?.indexNumber) return null;
      const url = buildSearchUrl();
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch results');
      }
      return response.json();
    },
    enabled: !!searchParams?.indexNumber,
  });

  // Transcript generation mutation
  const generateTranscriptMutation = useMutation({
    mutationFn: async () => {
      if (!resultData?.student) throw new Error("No student data");
      return apiRequest('POST', '/api/public/transcripts/generate', {
        indexNumber: resultData.student.indexNumber,
        examYearId: resultData.student.examYearId,
        grade: resultData.student.grade,
      });
    },
    onSuccess: () => {
      toast({
        title: language === 'ar' ? 'تم إنشاء الشهادة' : 'Transcript Generated',
        description: language === 'ar' ? 'يمكنك الآن تنزيل الشهادة' : 'You can now download your transcript',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexNumber.trim()) {
      toast({
        title: t.resultChecker.indexNumberRequired,
        description: t.resultChecker.pleaseEnterIndexNumber,
        variant: "destructive",
      });
      return;
    }
    setSearchParams({
      indexNumber: indexNumber.trim(),
      examYearId: selectedExamYear || undefined,
      grade: selectedGrade || undefined,
    });
  };

  const handleDownloadTranscript = () => {
    if (resultData?.student?.indexNumber) {
      const link = document.createElement('a');
      link.href = `/api/public/transcripts/${resultData.student.indexNumber}/download`;
      link.download = `transcript-${resultData.student.indexNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrintTranscript = async () => {
    try {
      if (!resultData) return;
      
      // Generate verification token (timestamp + index number)
      const verificationToken = `${new Date().getTime()}-${resultData.student.indexNumber}`;
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(verificationToken, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 200,
        margin: 2,
      });
      
      // Format date
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Build result rows HTML
      const resultRowsHtml = resultData.results.map(result => `
        <tr>
          <td style="padding: 4px 5px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${getSubjectName(result)}</td>
          <td style="padding: 4px 5px; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 11px;">${result.score}/${result.maxScore}</td>
          <td style="padding: 4px 5px; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: ${result.score < 50 ? '#dc2626' : '#059669'}; font-size: 11px;">${result.grade}</td>
          <td style="padding: 4px 5px; text-align: center; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: ${result.score < 50 ? '#dc2626' : '#059669'};">${language === 'ar' ? getGradeStatusByScore(result.score).ar : getGradeStatusByScore(result.score).en}</td>
        </tr>
      `).join('');
      
      // Create HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Verified Result - ${resultData.student.indexNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
            .org-header { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; }
            .header-text-en { flex: 1; text-align: left; }
            .header-logo { flex: 0; text-align: center; margin: 0 10px; }
            .header-logo img { height: 70px; width: auto; }
            .header-text-ar { flex: 1; text-align: right; direction: rtl; }
            .header-text-en p, .header-text-ar p { margin: 2px 0; line-height: 1.2; }
            .header-text-en .title { font-weight: bold; font-size: 11px; }
            .header-text-ar .title { font-weight: bold; font-size: 11px; }
            .header-text-en .subtitle { font-size: 10px; color: #6b7280; }
            .header-text-ar .subtitle { font-size: 10px; color: #6b7280; }
            .main-content { padding: 15px 20px; }
            .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 10px; }
            .header-title { font-size: 18px; font-weight: bold; color: #059669; margin: 0; }
            .header-subtitle { font-size: 12px; color: #6b7280; margin: 3px 0 0 0; }
            .verification-badge { display: inline-block; background: #ecfdf5; border: 1px solid #059669; color: #047857; padding: 4px 10px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
            .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
            .info-item { }
            .info-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
            .info-value { font-size: 12px; color: #111827; font-weight: 500; }
            .results-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .results-table th { background: #f3f4f6; padding: 6px; text-align: left; font-weight: 600; color: #374151; font-size: 11px; }
            .results-table td { padding: 5px 6px; font-size: 11px; }
            h3 { margin: 8px 0 5px 0; color: #111827; font-size: 12px; }
            .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; padding: 10px; background: #f0fdf4; border-radius: 4px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 10px; color: #6b7280; font-weight: 600; }
            .summary-value { font-size: 14px; font-weight: bold; color: #059669; margin-top: 2px; }
            .barcode-section { text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px; }
            .barcode-section p { font-size: 10px; color: #6b7280; margin: 0 0 5px 0; }
            .barcode-image { max-width: 150px; height: auto; }
            .footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
            .timestamp { font-size: 9px; color: #9ca3af; text-align: center; margin-top: 5px; }
            @media print { body { background: white; margin: 0; padding: 0; } .container { box-shadow: none; border-radius: 0; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="org-header">
              <div class="header-text-en">
                <p class="title">The General Secretariat for</p>
                <p class="title">Islamic/Arabic Education in</p>
                <p class="title">The Gambia</p>
                <p class="subtitle">Examination affairs unit</p>
              </div>
              <div class="header-logo">
                <img src="${amaanahLogo}" alt="Amaanah Logo">
              </div>
              <div class="header-text-ar">
                <p class="title">الأمانة العامة للتعليم الإسلامي</p>
                <p class="title">والعربي</p>
                <p class="title">في غامبيا</p>
                <p class="subtitle">قسم الامتحانات</p>
              </div>
            </div>
            <div class="main-content">
            <div class="header">
              <div class="verification-badge">✓ VERIFIED RESULT</div>
              <h1 class="header-title">Examination Result</h1>
              <p class="header-subtitle">Amaanah Verified Online Result</p>
            </div>
            
            <div class="student-info">
              <div class="info-item">
                <div class="info-label">Student Name</div>
                <div class="info-value">${resultData.student.fullName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Index Number</div>
                <div class="info-value" style="font-family: monospace;">${resultData.student.indexNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">School</div>
                <div class="info-value">${language === 'ar' ? resultData.student.schoolAr : resultData.student.schoolEn}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Grade / Level</div>
                <div class="info-value">Grade ${resultData.student.grade}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Examination Year</div>
                <div class="info-value">${resultData.student.examYear}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Print Date</div>
                <div class="info-value">${currentDate}</div>
              </div>
            </div>
            
            <h3 style="margin: 20px 0 15px 0; color: #111827;">Subject Results</h3>
            <table class="results-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${resultRowsHtml}
              </tbody>
            </table>
            
            <div class="summary">
              <div class="summary-item">
                <div class="summary-label">Total Score</div>
                <div class="summary-value">${resultData.summary.totalScore}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Average Score</div>
                <div class="summary-value">${resultData.summary.averageScore.toFixed(1)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Passed Subjects</div>
                <div class="summary-value">${resultData.summary.passedCount}/${resultData.summary.subjectCount}</div>
              </div>
            </div>
            
            <div class="barcode-section">
              <p>VERIFICATION CODE</p>
              <img src="${qrDataUrl}" alt="Verification QR Code" class="barcode-image">
              <p style="font-size: 10px; color: #9ca3af; word-break: break-all; margin-top: 10px;">${verificationToken}</p>
            </div>
            
            <div class="footer">
              <p>This is a verified online result document. For official transcripts, please use the official Amaanah transcript service.</p>
              <p>© 2024 AMAANAH - General Secretariat for Islamic & Arabic Education</p>
            </div>
            
            <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Create and print
      const printWindow = window.open('', '', 'height=800,width=900');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerateTranscript = async () => {
    setGeneratingTranscript(true);
    try {
      await generateTranscriptMutation.mutateAsync();
    } finally {
      setGeneratingTranscript(false);
    }
  };

  const handleReset = () => {
    setSearchParams(null);
    setIndexNumber("");
    setSelectedExamYear("");
    setSelectedGrade("");
  };

  const getGradeColor = (grade: string) => {
    switch (grade.toUpperCase()) {
      case 'A': case 'A+': return 'text-green-600 dark:text-green-400';
      case 'B': case 'B+': return 'text-blue-600 dark:text-blue-400';
      case 'C': case 'C+': return 'text-yellow-600 dark:text-yellow-400';
      case 'D': case 'D+': return 'text-orange-600 dark:text-orange-400';
      case 'E': case 'F': return 'text-red-600 dark:text-red-400';
      default: return 'text-foreground';
    }
  };

  const getSubjectName = (result: ResultData['results'][0]) => {
    return language === 'ar' ? result.subjectAr : result.subjectEn;
  };

  const getStatusText = (result: ResultData['results'][0]) => {
    return language === 'ar' ? result.statusAr : result.status;
  };

  // Get grade status based on score - any score below 50 is Failed
  const getGradeStatusByScore = (score: number) => {
    if (score >= 90) return { en: 'Excellent', ar: 'ممتاز' };
    if (score >= 80) return { en: 'Very Good', ar: 'جداً جيد' };
    if (score >= 70) return { en: 'Good', ar: 'جيد' };
    if (score >= 60) return { en: 'Acceptable', ar: 'مقبول' };
    if (score >= 50) return { en: 'Pass', ar: 'ناجح' };
    return { en: 'Failed', ar: 'راسب' };
  };

  const getGradeStatus = (grade: string) => {
    const normalizedGrade = grade.toUpperCase();
    
    const statusMap: Record<string, { en: string; ar: string }> = {
      'A+': { en: 'Excellent', ar: 'ممتاز' },
      'A': { en: 'Very Good', ar: 'جداً جيد' },
      'B+': { en: 'Good', ar: 'جيد' },
      'B': { en: 'Good', ar: 'جيد' },
      'C+': { en: 'Acceptable', ar: 'مقبول' },
      'C': { en: 'Acceptable', ar: 'مقبول' },
      'D+': { en: 'Pass', ar: 'ناجح' },
      'D': { en: 'Pass', ar: 'ناجح' },
      'E': { en: 'Failed', ar: 'راسب' },
      'F': { en: 'Failed', ar: 'راسب' },
    };
    
    return statusMap[normalizedGrade] || { en: 'N/A', ar: 'غ.م' };
  };

  // Get final result based on percentage (overall performance grade word)
  const getFinalResultGrade = (percentage: number) => {
    if (percentage >= 90) return { en: 'Excellent', ar: 'ممتاز', grade: 'A+', variant: 'default' as const };
    if (percentage >= 85) return { en: 'Very Good', ar: 'جداً جيد', grade: 'A', variant: 'default' as const };
    if (percentage >= 80) return { en: 'Good', ar: 'جيد', grade: 'B+', variant: 'default' as const };
    if (percentage >= 75) return { en: 'Good', ar: 'جيد', grade: 'B', variant: 'default' as const };
    if (percentage >= 70) return { en: 'Acceptable', ar: 'مقبول', grade: 'C+', variant: 'default' as const };
    if (percentage >= 65) return { en: 'Acceptable', ar: 'مقبول', grade: 'C', variant: 'default' as const };
    if (percentage >= 60) return { en: 'Acceptable', ar: 'مقبول', grade: 'D+', variant: 'default' as const };
    if (percentage >= 50) return { en: 'Acceptable', ar: 'مقبول', grade: 'D', variant: 'default' as const };
    return { en: 'Failed', ar: 'راسب', grade: 'F', variant: 'destructive' as const };
  };

  const gradeOptions = [
    { value: "3", labelEn: "Grade 3 - Lower Basic", labelAr: "الصف الثالث - المرحلة الابتدائية الدنيا" },
    { value: "6", labelEn: "Grade 6 - Upper Basic", labelAr: "الصف السادس - المرحلة الابتدائية" },
    { value: "9", labelEn: "Grade 9 - Basic Cycle", labelAr: "الصف التاسع - المرحلة الإعدادية" },
    { value: "12", labelEn: "Grade 12 - Senior Secondary", labelAr: "الصف الثاني عشر - المرحلة الثانوية" },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">
              <FileCheck className="w-3 h-3 mr-1" />
              {t.resultChecker.examinationResults}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t.resultChecker.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {language === 'ar' 
                ? 'ابحث عن نتائجك وقم بتنزيل الشهادة الأكاديمية الخاصة بك'
                : 'Search for your results and download your academic transcript'}
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">{t.resultChecker.checkYourResults}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'اختر سنة الامتحان والصف وأدخل رقم الفهرس للبحث عن نتائجك'
                  : 'Select examination year, grade, and enter your index number to find your results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Exam Year and Grade Selection Row */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isRTL ? 'text-right' : ''}`}>
                  <div className="space-y-2">
                    <Label htmlFor="examYear">
                      {language === 'ar' ? 'سنة الامتحان' : 'Examination Year'}
                    </Label>
                    <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
                      <SelectTrigger data-testid="select-exam-year">
                        <SelectValue placeholder={language === 'ar' ? 'اختر السنة' : 'Select Year'} />
                      </SelectTrigger>
                      <SelectContent>
                        {examYears.map((year) => (
                          <SelectItem key={year.id} value={year.id.toString()}>
                            {year.name} {year.isActive && `(${language === 'ar' ? 'نشط' : 'Active'})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">
                      {language === 'ar' ? 'الصف / المستوى' : 'Grade / Level'}
                    </Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger data-testid="select-grade">
                        <SelectValue placeholder={language === 'ar' ? 'اختر الصف' : 'Select Grade'} />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((grade) => (
                          <SelectItem key={grade.value} value={grade.value}>
                            {language === 'ar' ? grade.labelAr : grade.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Index Number Input */}
                <div className="space-y-2">
                  <Label htmlFor="indexNumber">
                    {language === 'ar' ? 'رقم الفهرس' : 'Student Index Number'} *
                  </Label>
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Input
                      id="indexNumber"
                      type="text"
                      placeholder={t.resultChecker.indexNumberPlaceholder}
                      value={indexNumber}
                      onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
                      className={`flex-1 ${isRTL ? 'text-right' : ''}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      data-testid="input-index-number"
                    />
                    <Button type="submit" disabled={isLoading} data-testid="button-search-results">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'بحث' : 'Search'}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'أدخل رقم الفهرس المكون من 6 أرقام (مثال: 123456)'
                      : 'Enter your 6-digit index number (e.g., 123456)'}
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results Section */}
      {searchParams && (
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">{t.resultChecker.searching}</p>
                </CardContent>
              </Card>
            ) : error || !resultData ? (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="py-12">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {language === 'ar' 
                        ? `لم يتم العثور على نتائج للرقم ${searchParams.indexNumber}. يرجى التحقق من البيانات المدخلة والمحاولة مرة أخرى.`
                        : `No results found for index number ${searchParams.indexNumber}. Please verify your information and try again.`}
                    </AlertDescription>
                  </Alert>
                  <div className="mt-6 text-center">
                    <Button onClick={handleReset} variant="outline" data-testid="button-try-again">
                      {language === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Student Info Card */}
                <Card>
                  <CardHeader>
                    <div className={`flex items-center justify-between gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <GraduationCap className="w-5 h-5 text-primary" />
                        {t.resultChecker.studentInformation}
                      </CardTitle>
                      {(() => {
                        const percentage = resultData.summary.maxPossibleScore > 0 
                          ? (resultData.summary.totalScore / resultData.summary.maxPossibleScore) * 100 
                          : 0;
                        const finalResult = getFinalResultGrade(percentage);
                        return (
                          <Badge variant={finalResult.variant}>
                            {finalResult.variant === 'default' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {language === 'ar' ? finalResult.ar : finalResult.en}
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 ${isRTL ? 'text-right' : ''}`}>
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <User className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t.resultChecker.fullName}</p>
                          <p className="font-medium">{resultData.student.fullName}</p>
                          {resultData.student.fullNameAr && (
                            <p className="text-sm text-muted-foreground" dir="rtl">{resultData.student.fullNameAr}</p>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <FileCheck className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t.resultChecker.indexNumber}</p>
                          <p className="font-medium font-mono">{resultData.student.indexNumber}</p>
                        </div>
                      </div>
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <School className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t.resultChecker.school}</p>
                          <p className="font-medium">{language === 'ar' ? resultData.student.schoolAr : resultData.student.schoolEn}</p>
                        </div>
                      </div>
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t.resultChecker.gradeLevel}</p>
                          <p className="font-medium">{language === 'ar' ? resultData.student.levelAr : resultData.student.levelEn}</p>
                        </div>
                      </div>
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t.resultChecker.examYear}</p>
                          <p className="font-medium">{resultData.student.examYear}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <BarChart3 className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold text-primary">{resultData.summary.averageScore}%</p>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المعدل' : 'Average'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resultData.summary.passedCount}</p>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'ناجح' : 'Passed'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{resultData.summary.failedCount}</p>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'راسب' : 'Failed'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                        <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resultData.summary.subjectCount}</p>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المواد' : 'Subjects'}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Results Table */}
                <Card>
                  <CardHeader>
                    <div className={`flex items-center justify-between gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Award className="w-5 h-5 text-primary" />
                        {t.resultChecker.subjectResults}
                      </CardTitle>
                      <div className={`text-${isRTL ? 'left' : 'right'}`}>
                        <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المجموع' : 'Total Score'}</p>
                        <p className="text-2xl font-bold text-primary">
                          {resultData.summary.totalScore}/{resultData.summary.maxPossibleScore}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={isRTL ? 'text-right' : ''}>{t.resultChecker.subject}</TableHead>
                          <TableHead className="text-center">{t.resultChecker.score}</TableHead>
                          <TableHead className="text-center">{t.resultChecker.grade}</TableHead>
                          <TableHead className="text-center">{t.resultChecker.status}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultData.results.map((result, i) => (
                          <TableRow key={i} data-testid={`result-row-${i}`}>
                            <TableCell className={`font-medium ${isRTL ? 'text-right' : ''}`}>
                              {getSubjectName(result)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-mono font-semibold ${result.score < 50 ? 'text-red-600 dark:text-red-400' : ''}`}>{result.score}</span>
                              <span className="text-muted-foreground text-xs">/{result.maxScore}</span>
                            </TableCell>
                            <TableCell className={`text-center font-bold ${getGradeColor(result.grade)}`}>
                              {result.grade}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={result.score >= 50 ? 'outline' : 'destructive'} 
                                className="text-xs"
                              >
                                {language === 'ar' ? getGradeStatusByScore(result.score).ar : getGradeStatusByScore(result.score).en}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Online Result Actions Card */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <FileText className="w-5 h-5 text-primary" />
                      {language === 'ar' ? 'النتيجة الإلكترونية' : 'Online Result'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' 
                        ? 'قم بإنشاء وطباعة النتيجة الإلكترونية الرسمية الخاصة بك'
                        : 'Generate and print your official Online Result.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {resultData.hasTranscript ? (
                        <Button 
                          onClick={handlePrintTranscript}
                          data-testid="button-print-result"
                        >
                          <Printer className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {language === 'ar' ? 'طباعة النتيجة' : 'Print Result'}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleGenerateTranscript}
                          disabled={generatingTranscript}
                          data-testid="button-generate-result"
                        >
                          {generatingTranscript ? (
                            <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          ) : (
                            <FileText className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          )}
                          {language === 'ar' ? 'إنشاء النتيجة' : 'Generate Result'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* General Actions */}
                <div className={`flex justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button 
                    onClick={handleReset}
                    data-testid="button-search-another"
                  >
                    {t.resultChecker.searchAnother}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Info Section */}
      {!searchParams && (
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <FileCheck className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{t.resultChecker.officialResults}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.resultChecker.officialResultsDesc}
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <GraduationCap className="w-10 h-10 text-chart-2 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{t.resultChecker.allLevels}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.resultChecker.allLevelsDesc}
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <FileText className="w-10 h-10 text-chart-3 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">
                    {language === 'ar' ? 'النتائج الإلكترونية' : 'Online Results'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'قم بإنشاء وتنزيل وطباعة النتيجة الإلكترونية الرسمية الخاصة بك'
                      : 'Generate, download, and print your official Online Result'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
