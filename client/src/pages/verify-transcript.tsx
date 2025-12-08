import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  User,
  School,
  Calendar,
  FileText,
  ArrowLeft,
  Shield,
  Award,
} from "lucide-react";

interface TranscriptVerification {
  valid: boolean;
  transcript: {
    transcriptNumber: string;
    studentNameAr: string;
    studentNameEn: string;
    schoolNameAr: string;
    schoolNameEn: string;
    grade: number;
    examYear: number;
    totalScore: string;
    percentage: string;
    finalGrade: string;
    issuedDate: string;
    status: string;
  };
}

export default function VerifyTranscript() {
  const { token } = useParams<{ token: string }>();
  const [verificationData, setVerificationData] = useState<TranscriptVerification | null>(null);

  const { data, isLoading, error } = useQuery<TranscriptVerification>({
    queryKey: ['/api/verify/transcript', token],
    enabled: !!token,
  });

  useEffect(() => {
    if (data) {
      setVerificationData(data);
    }
  }, [data]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getGradeColor = (grade: string) => {
    const normalizedGrade = grade.replace(/[ًٌٍَُِّْ]/g, '').trim().toLowerCase();
    
    if (normalizedGrade === 'راسب' || normalizedGrade.includes('راسب') || 
        normalizedGrade.includes('fail') || normalizedGrade.includes('failed')) {
      return 'bg-red-500';
    }
    
    return 'bg-emerald-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Amaanah</h1>
                <p className="text-xs text-muted-foreground">Transcript Verification</p>
              </div>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Skeleton className="w-16 h-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-48 mx-auto" />
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : error || !verificationData ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-destructive mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-6">
                This transcript could not be verified. The QR code may be invalid or expired.
              </p>
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact the Amaanah Examination Board 
                    with the transcript details for manual verification.
                  </p>
                </CardContent>
              </Card>
              <Link href="/">
                <Button className="mt-6" data-testid="button-go-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
            </div>
          ) : verificationData.valid ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold text-emerald-600 mb-1">Transcript Verified</h2>
                <p className="text-sm text-muted-foreground">
                  This is an authentic Amaanah examination transcript
                </p>
              </div>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge className="bg-emerald-500 text-white">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground" data-testid="text-transcript-number">
                      {verificationData.transcript.transcriptNumber}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center">
                      <User className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold" dir="rtl" data-testid="text-student-name-ar">
                        {verificationData.transcript.studentNameAr}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-student-name-en">
                        {verificationData.transcript.studentNameEn}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">School</p>
                        <p className="font-medium" dir="rtl" data-testid="text-school-name">
                          {verificationData.transcript.schoolNameAr}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Grade</p>
                        <p className="font-medium" data-testid="text-grade">
                          Grade {verificationData.transcript.grade}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Exam Year</p>
                        <p className="font-medium" data-testid="text-exam-year">
                          {verificationData.transcript.examYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Issued Date</p>
                        <p className="font-medium" data-testid="text-issued-date">
                          {formatDate(verificationData.transcript.issuedDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Score</p>
                        <p className="text-2xl font-bold" data-testid="text-total-score">
                          {verificationData.transcript.totalScore}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Percentage</p>
                        <p className="text-2xl font-bold text-primary" data-testid="text-percentage">
                          {verificationData.transcript.percentage}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Final Grade</p>
                        <Badge 
                          className={`${getGradeColor(verificationData.transcript.finalGrade)} text-white text-lg px-3 py-1`}
                          data-testid="badge-final-grade"
                        >
                          {verificationData.transcript.finalGrade}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      This transcript has been verified as authentic by Amaanah Examination Board
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 mt-6">
                <Link href="/verify" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-verify-another">
                    Verify Another Document
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button className="w-full" data-testid="button-home">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-destructive mb-2">Invalid Transcript</h2>
              <p className="text-muted-foreground mb-6">
                This transcript could not be verified. It may have been revoked or is not authentic.
              </p>
              <Link href="/">
                <Button data-testid="button-go-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Amaanah Examination Board - Transcript Verification System</p>
          <p className="mt-1">For inquiries, please contact the Amaanah office</p>
        </div>
      </footer>
    </div>
  );
}
