import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
      if (!resultData?.student?.indexNumber) return;
      
      const response = await fetch(`/api/public/transcripts/${resultData.student.indexNumber}/download`);
      if (!response.ok) throw new Error('Failed to fetch transcript');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 250);
      };
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      
      // Cleanup after print
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
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

  const gradeOptions = [
    { value: "3", labelEn: "Grade 3 - Lower Basic", labelAr: "الصف الثالث - المرحلة الابتدائية الدنيا" },
    { value: "6", labelEn: "Grade 6 - Upper Basic", labelAr: "الصف السادس - المرحلة الابتدائية" },
    { value: "9", labelEn: "Grade 9 - Basic Cycle", labelAr: "الصف التاسع - المرحلة الإعدادية" },
    { value: "12", labelEn: "Grade 12 - Senior Secondary", labelAr: "الصف الثاني عشر - المرحلة الثانوية" },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
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
      <section className="py-12 md:py-16">
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
              <form onSubmit={handleSearch} className="space-y-6">
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
                        <SelectItem value="all">{language === 'ar' ? 'جميع السنوات' : 'All Years'}</SelectItem>
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
                        <SelectItem value="all">{language === 'ar' ? 'جميع الصفوف' : 'All Grades'}</SelectItem>
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
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Student Info Card */}
                <Card>
                  <CardHeader>
                    <div className={`flex items-center justify-between gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <GraduationCap className="w-5 h-5 text-primary" />
                        {t.resultChecker.studentInformation}
                      </CardTitle>
                      <Badge variant={resultData.overallStatus === 'PASSED' ? 'default' : 'destructive'}>
                        {resultData.overallStatus === 'PASSED' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {language === 'ar' ? resultData.overallStatusAr : resultData.overallStatus}
                      </Badge>
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
                              <span className="font-mono">{result.score}</span>
                              <span className="text-muted-foreground text-xs">/{result.maxScore}</span>
                            </TableCell>
                            <TableCell className={`text-center font-bold ${getGradeColor(result.grade)}`}>
                              {result.grade}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={result.status === 'PASSED' ? 'outline' : 'destructive'} 
                                className="text-xs"
                              >
                                {getStatusText(result)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Transcript Actions Card */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <FileText className="w-5 h-5 text-primary" />
                      {language === 'ar' ? 'الشهادة الأكاديمية' : 'Academic Transcript'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'ar' 
                        ? 'قم بإنشاء وطباعة الشهادة الأكاديمية الرسمية الخاصة بك'
                        : 'Generate and print your official academic transcript'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {resultData.hasTranscript ? (
                        <Button 
                          onClick={handlePrintTranscript}
                          data-testid="button-print-transcript"
                        >
                          <Printer className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {language === 'ar' ? 'طباعة الشهادة' : 'Print Transcript'}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleGenerateTranscript}
                          disabled={generatingTranscript}
                          data-testid="button-generate-transcript"
                        >
                          {generatingTranscript ? (
                            <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          ) : (
                            <FileText className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          )}
                          {language === 'ar' ? 'إنشاء الشهادة' : 'Generate Transcript'}
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
                    {language === 'ar' ? 'شهادات أكاديمية' : 'Academic Transcripts'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'قم بإنشاء وتنزيل وطباعة الشهادة الأكاديمية الرسمية الخاصة بك'
                      : 'Generate, download, and print your official academic transcript'}
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
