import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Search,
  CheckCircle,
  User,
  School,
  Calendar,
  Award,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const verifySchema = z.object({
  indexNumber: z.string().min(6, "Index number must be at least 6 characters"),
  examYear: z.string().min(1, "Please select an exam year"),
  grade: z.string().min(1, "Please select a grade"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

interface VerificationResult {
  verified: boolean;
  student: {
    firstName: string;
    lastName: string;
    indexNumber: string;
    gender: string;
    grade: number;
    school: {
      name: string;
    };
  };
  examYear: {
    name: string;
    year: number;
  };
  results: Array<{
    subject: string;
    score: number;
    grade: string;
  }>;
  finalResult: string;
  totalScore: number;
  rank?: number;
  certificateNumber?: string;
}

export default function Verify() {
  const { toast } = useToast();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      indexNumber: "",
      examYear: "",
      grade: "",
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerifyFormData) => {
      return apiRequest("POST", "/api/verify-result", data);
    },
    onSuccess: (data) => {
      setResult(data as VerificationResult);
    },
    onError: () => {
      toast({
        title: "Not Found",
        description: "No result found for the provided details. Please check and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: VerifyFormData) => {
    verifyMutation.mutate(data);
  };

  const handleReset = () => {
    setResult(null);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/">
            <div className="cursor-pointer">
              <h1 className="text-xl font-semibold text-foreground">Amaanah</h1>
              <p className="text-xs text-muted-foreground">Result Verification</p>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {!result ? (
            <>
              {/* Interactive Board Section */}
              {!selectedExamYear || !selectedGrade ? (
                <>
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-2">Verify Your Results</h2>
                    <p className="text-muted-foreground">
                      Select your exam year and grade to get started
                    </p>
                  </div>

                  {/* Exam Year Board */}
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold mb-4">Select Exam Year</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {["2024", "2023", "2022", "2021"].map((year) => (
                        <Button
                          key={year}
                          variant={selectedExamYear === year ? "default" : "outline"}
                          className="h-24 flex flex-col items-center justify-center rounded-lg"
                          onClick={() => setSelectedExamYear(year)}
                          data-testid={`button-year-${year}`}
                        >
                          <Calendar className="w-6 h-6 mb-2" />
                          <span className="text-lg font-semibold">{year}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Grade Board */}
                  {selectedExamYear && (
                    <div className="mb-12">
                      <h3 className="text-lg font-semibold mb-4">Select Grade</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {["3", "6", "9", "12"].map((grade) => (
                          <Button
                            key={grade}
                            variant={selectedGrade === grade ? "default" : "outline"}
                            className="h-24 flex flex-col items-center justify-center rounded-lg"
                            onClick={() => setSelectedGrade(grade)}
                            data-testid={`button-grade-${grade}`}
                          >
                            <GraduationCap className="w-6 h-6 mb-2" />
                            <span className="text-lg font-semibold">Grade {grade}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedExamYear && selectedGrade && (
                    <div className="text-center">
                      <Button
                        size="lg"
                        onClick={() => {
                          form.setValue("examYear", selectedExamYear);
                          form.setValue("grade", selectedGrade);
                        }}
                        data-testid="button-continue"
                      >
                        Continue
                        <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Verification Form */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Enter Your Details</h2>
                    <p className="text-muted-foreground">
                      Enter your index number to retrieve your results
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedExamYear("");
                        setSelectedGrade("");
                        form.reset();
                      }}
                      className="mt-2"
                      data-testid="button-back-board"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Selection
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="p-6">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="indexNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Index Number</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter 6-digit index number"
                                    {...field}
                                    data-testid="input-index-number"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={verifyMutation.isPending}
                            data-testid="button-verify"
                          >
                            {verifyMutation.isPending ? (
                              "Verifying..."
                            ) : (
                              <>
                                <Search className="w-4 h-4 mr-2" />
                                Verify Result
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <p className="text-center text-sm text-muted-foreground mt-6">
                    This service is for verifying authentic Amaanah examination results.
                    <br />
                    For any issues, please contact the Amaanah office.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              {/* Verification Result */}
              <div className="text-center mb-3">
                <div className="w-12 h-12 rounded-full bg-chart-3/10 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-chart-3" />
                </div>
                <h2 className="text-lg font-semibold text-chart-3 mb-1">Result Verified</h2>
                <p className="text-xs text-muted-foreground">
                  This is an authentic Amaanah examination result
                </p>
              </div>

              {/* Warning: Not a Transcript */}
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  This is not a transcript
                </p>
              </div>

              <Card className="border-chart-3/20 bg-chart-3/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Badge className="bg-chart-3 text-chart-3-foreground text-xs">Verified</Badge>
                    {result.certificateNumber && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Cert: {result.certificateNumber}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold truncate">
                        {result.student.firstName} {result.student.lastName}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {result.student.gender} - Grade {result.student.grade}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Index:</span>
                      <code className="font-mono font-medium truncate">{result.student.indexNumber}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Year:</span>
                      <span className="font-medium truncate">{result.examYear.name}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <School className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{result.student.school.name}</span>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div>
                    <h4 className="text-xs font-medium mb-2">Subject Results</h4>
                    <div className="border rounded-sm overflow-hidden bg-background">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-1 font-medium">Subject</th>
                            <th className="text-center p-1 font-medium">Score</th>
                            <th className="text-center p-1 font-medium">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.results.map((subj, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-1 truncate">{subj.subject}</td>
                              <td className="text-center p-1">{subj.score}</td>
                              <td className="text-center p-1">
                                <Badge variant="secondary" className="text-xs">
                                  {subj.grade}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Final Result */}
                  <div className="p-2 bg-background rounded-sm border">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Final Result</p>
                        <p className="text-base font-semibold text-chart-3">{result.finalResult}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Score</p>
                        <p className="text-base font-semibold">{result.totalScore}</p>
                      </div>
                      {result.rank && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Rank</p>
                          <p className="text-base font-semibold">#{result.rank}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1 text-xs" onClick={handleReset}>
                  <Search className="w-4 h-4 mr-2" />
                  Verify Another
                </Button>
                <Button className="flex-1 text-xs">
                  <Award className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
