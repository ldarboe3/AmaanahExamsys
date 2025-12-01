import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResultData {
  student: {
    indexNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    schoolEn: string;
    schoolAr: string;
    grade: number;
    levelEn: string;
    levelAr: string;
    examYear: string;
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
}

export default function ResultChecker() {
  const { toast } = useToast();
  const { t, language, isRTL } = useLanguage();
  const [indexNumber, setIndexNumber] = useState("");
  const [searchedIndex, setSearchedIndex] = useState("");

  const { data: resultData, isLoading, error, refetch } = useQuery<ResultData>({
    queryKey: [`/api/public/results/${searchedIndex}`],
    enabled: !!searchedIndex,
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
    setSearchedIndex(indexNumber.trim());
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
              {t.resultChecker.subtitle}
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
                {t.resultChecker.enterIndexNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Input
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
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t.resultChecker.indexNumberHint}
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results Section */}
      {searchedIndex && (
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
                      {t.resultChecker.noResultsDescription.replace('{indexNumber}', searchedIndex)}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Student Info Card */}
                <Card>
                  <CardHeader>
                    <div className={`flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                    <div className={`flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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

                {/* Actions */}
                <div className={`flex justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button 
                    variant="outline" 
                    data-testid="button-download-result"
                    onClick={() => {
                      if (resultData?.student?.indexNumber) {
                        window.open(`/api/public/results/${resultData.student.indexNumber}/pdf`, '_blank');
                      }
                    }}
                  >
                    <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t.resultChecker.downloadResultSlip}
                  </Button>
                  <Button 
                    onClick={() => { setSearchedIndex(""); setIndexNumber(""); }}
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
      {!searchedIndex && (
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
                  <Download className="w-10 h-10 text-chart-3 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{t.resultChecker.downloadPrint}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.resultChecker.downloadPrintDesc}
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
