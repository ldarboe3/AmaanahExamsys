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
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    fullName: string;
    school: string;
    level: string;
    examYear: string;
  };
  results: Array<{
    subject: string;
    score: number;
    grade: string;
    status: string;
  }>;
  aggregate: number;
  overallStatus: string;
}

export default function ResultChecker() {
  const { toast } = useToast();
  const [indexNumber, setIndexNumber] = useState("");
  const [searchedIndex, setSearchedIndex] = useState("");

  const { data: resultData, isLoading, error, refetch } = useQuery<ResultData>({
    queryKey: ["/api/public/results", searchedIndex],
    enabled: !!searchedIndex,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexNumber.trim()) {
      toast({
        title: "Index Number Required",
        description: "Please enter your index number to check results.",
        variant: "destructive",
      });
      return;
    }
    setSearchedIndex(indexNumber.trim());
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': case 'A+': return 'text-green-600';
      case 'B': case 'B+': return 'text-blue-600';
      case 'C': case 'C+': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-foreground';
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">
              <FileCheck className="w-3 h-3 mr-1" />
              Examination Results
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Result Checker
            </h1>
            <p className="text-lg text-muted-foreground">
              Enter your index number to view your examination results. 
              Results are available for verified candidates only.
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
              <CardTitle className="text-xl">Check Your Results</CardTitle>
              <CardDescription>
                Enter your examination index number to retrieve your results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Enter Index Number (e.g., AMAANAH-2024-001)"
                    value={indexNumber}
                    onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
                    className="flex-1"
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
                  Your index number was provided on your examination slip
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
                  <p className="text-muted-foreground">Searching for results...</p>
                </CardContent>
              </Card>
            ) : error || !resultData ? (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="py-12">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No results found for index number "{searchedIndex}". 
                      Please verify your index number and try again. If you believe this is an error, 
                      please contact your school or AMAANAH office.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Student Info Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        Student Information
                      </CardTitle>
                      <Badge variant={resultData.overallStatus === 'PASSED' ? 'default' : 'destructive'}>
                        {resultData.overallStatus === 'PASSED' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {resultData.overallStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Full Name</p>
                          <p className="font-medium">{resultData.student.fullName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Index Number</p>
                          <p className="font-medium">{resultData.student.indexNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <School className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">School</p>
                          <p className="font-medium">{resultData.student.school}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Exam Year</p>
                          <p className="font-medium">{resultData.student.examYear}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        Subject Results
                      </CardTitle>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Aggregate</p>
                        <p className="text-2xl font-bold text-primary">{resultData.aggregate}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultData.results.map((result, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{result.subject}</TableCell>
                            <TableCell className="text-center">{result.score}</TableCell>
                            <TableCell className={`text-center font-bold ${getGradeColor(result.grade)}`}>
                              {result.grade}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={result.status === 'PASSED' ? 'outline' : 'destructive'} className="text-xs">
                                {result.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Result Slip
                  </Button>
                  <Button onClick={() => { setSearchedIndex(""); setIndexNumber(""); }}>
                    Search Another
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
                  <h3 className="font-semibold mb-2">Official Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Results are verified and official from AMAANAH examination records
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <GraduationCap className="w-10 h-10 text-chart-2 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">All Levels</h3>
                  <p className="text-sm text-muted-foreground">
                    Results available for all examination levels and years
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <Download className="w-10 h-10 text-chart-3 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Download & Print</h3>
                  <p className="text-sm text-muted-foreground">
                    Download your result slip for records and verification
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
