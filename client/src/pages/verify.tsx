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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Amaanah</h1>
                <p className="text-xs text-muted-foreground">Result Verification</p>
              </div>
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
        <div className="max-w-xl mx-auto">
          {!result ? (
            <>
              {/* Verification Form */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Verify Examination Result</h2>
                <p className="text-muted-foreground">
                  Enter the student's index number and exam details to verify their results
                </p>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="examYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Exam Year</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-exam-year">
                                    <SelectValue placeholder="Select year" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="2024">2024</SelectItem>
                                  <SelectItem value="2023">2023</SelectItem>
                                  <SelectItem value="2022">2022</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="grade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grade</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-grade">
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="3">Grade 3</SelectItem>
                                  <SelectItem value="6">Grade 6</SelectItem>
                                  <SelectItem value="9">Grade 9</SelectItem>
                                  <SelectItem value="12">Grade 12</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

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
          ) : (
            <>
              {/* Verification Result */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-chart-3/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-chart-3" />
                </div>
                <h2 className="text-xl font-semibold text-chart-3 mb-1">Result Verified</h2>
                <p className="text-sm text-muted-foreground">
                  This is an authentic Amaanah examination result
                </p>
              </div>

              <Card className="border-chart-3/20 bg-chart-3/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-chart-3 text-chart-3-foreground">Verified</Badge>
                    {result.certificateNumber && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Cert: {result.certificateNumber}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center">
                      <User className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {result.student.firstName} {result.student.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {result.student.gender} - Grade {result.student.grade}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Index Number:</span>
                      <code className="font-mono font-medium">{result.student.indexNumber}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Exam Year:</span>
                      <span className="font-medium">{result.examYear.name}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <School className="w-4 h-4 text-muted-foreground" />
                      <span>{result.student.school.name}</span>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Subject Results</h4>
                    <div className="border rounded-md overflow-hidden bg-background">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Subject</th>
                            <th className="text-center p-2 font-medium">Score</th>
                            <th className="text-center p-2 font-medium">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.results.map((subj, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{subj.subject}</td>
                              <td className="text-center p-2">{subj.score}</td>
                              <td className="text-center p-2">
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
                  <div className="p-4 bg-background rounded-md border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Final Result</p>
                        <p className="text-xl font-semibold text-chart-3">{result.finalResult}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Score</p>
                        <p className="text-xl font-semibold">{result.totalScore}</p>
                      </div>
                      {result.rank && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Rank</p>
                          <p className="text-xl font-semibold">#{result.rank}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  <Search className="w-4 h-4 mr-2" />
                  Verify Another
                </Button>
                <Button className="flex-1">
                  <Award className="w-4 h-4 mr-2" />
                  Print Certificate
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
