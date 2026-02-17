import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, Printer, Package, BarChart3, Plus,
  School, Users, CheckCircle, Loader2, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface ExamYear {
  id: number;
  name: string;
  status: string;
}

interface SchoolItem {
  id: number;
  name: string;
  schoolCode?: string;
}

interface DistributionStats {
  totalCards: number;
  generated: number;
  printed: number;
  distributed: number;
  bySchool?: Array<{
    schoolId: number;
    schoolName: string;
    total: number;
    generated: number;
    printed: number;
    distributed: number;
  }>;
}

interface Batch {
  id: number;
  batchNumber: string;
  schoolId: number;
  schoolName: string;
  totalCards: number;
  printedCount: number;
  distributedCount: number;
  status: string;
  createdAt: string;
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-8 h-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

const statusColors: Record<string, string> = {
  generated: "bg-chart-4/10 text-chart-4",
  printed: "bg-chart-2/10 text-chart-2",
  distributed: "bg-primary/10 text-primary",
  partial: "bg-chart-5/10 text-chart-5",
};

export default function ExamCardManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedExamYearId, setSelectedExamYearId] = useState<string>("");
  const [studentId, setStudentId] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [generateMode, setGenerateMode] = useState<"single" | "batch">("batch");

  const { data: examYears = [], isLoading: examYearsLoading } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: schools = [], isLoading: schoolsLoading } = useQuery<SchoolItem[]>({
    queryKey: ["/api/schools"],
  });

  const examYearId = selectedExamYearId || (examYears.length > 0 ? String(examYears[0]?.id) : "");

  const { data: stats, isLoading: statsLoading } = useQuery<DistributionStats>({
    queryKey: ["/api/exam-cards/distribution-stats", examYearId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (examYearId) params.set("examYearId", examYearId);
      const res = await fetch(`/api/exam-cards/distribution-stats?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch distribution stats");
      return res.json();
    },
    enabled: !!examYearId,
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ["/api/exam-cards/batches", examYearId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (examYearId) params.set("examYearId", examYearId);
      const res = await fetch(`/api/exam-cards/batches?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch batches");
      return res.json();
    },
    enabled: !!examYearId,
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { studentId?: string; schoolId?: number; examYearId?: number; grade?: string }) => {
      const res = await apiRequest("POST", "/api/exam-cards/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-cards/distribution-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-cards/batches"] });
      toast({ title: "Cards Generated", description: `Successfully generated exam cards.` });
      setStudentId("");
      setSelectedSchoolId("");
      setSelectedGrade("");
    },
    onError: (err: Error) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const markPrintedMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const res = await apiRequest("PATCH", "/api/exam-cards/mark-printed", { batchId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-cards/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-cards/distribution-stats"] });
      toast({ title: "Batch Marked as Printed", description: "The batch has been marked as printed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const markDistributedMutation = useMutation({
    mutationFn: async ({ batchId, staffId }: { batchId: number; staffId?: string }) => {
      const res = await apiRequest("PATCH", "/api/exam-cards/mark-distributed", { batchId, staffId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-cards/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-cards/distribution-stats"] });
      toast({ title: "Batch Marked as Distributed", description: "The batch has been marked as distributed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    const payload: { studentId?: string; schoolId?: number; examYearId?: number; grade?: string } = {};
    if (examYearId) payload.examYearId = Number(examYearId);
    if (generateMode === "single" && studentId) {
      payload.studentId = studentId;
    } else if (generateMode === "batch" && selectedSchoolId) {
      payload.schoolId = Number(selectedSchoolId);
    }
    if (selectedGrade && selectedGrade !== "all") {
      payload.grade = selectedGrade;
    }
    generateMutation.mutate(payload);
  };

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-muted text-muted-foreground";
    return (
      <Badge variant="secondary" className={colorClass}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="exam-card-management-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Exam Card Management
          </h1>
          <p className="text-muted-foreground">Generate, track, and distribute exam cards</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="exam-year-select" className="text-sm font-medium whitespace-nowrap">
            Exam Year:
          </Label>
          <Select
            value={examYearId}
            onValueChange={(val) => setSelectedExamYearId(val)}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-exam-year">
              <SelectValue placeholder="Select exam year" />
            </SelectTrigger>
            <SelectContent>
              {examYears.map((ey) => (
                <SelectItem key={ey.id} value={String(ey.id)}>
                  {ey.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Plus className="mr-2 h-4 w-4" />
            Generate Cards
          </TabsTrigger>
          <TabsTrigger value="batches" data-testid="tab-batches">
            <Package className="mr-2 h-4 w-4" />
            Batches
          </TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">
            <Send className="mr-2 h-4 w-4" />
            Distribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading || !examYearId ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Cards</CardTitle>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold" data-testid="text-total-cards">
                      {stats?.totalCards ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">All exam cards for this year</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Generated</CardTitle>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-chart-4/10 text-chart-4">
                      <Plus className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold" data-testid="text-generated-cards">
                      {stats?.generated ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cards generated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Printed</CardTitle>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-chart-2/10 text-chart-2">
                      <Printer className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold" data-testid="text-printed-cards">
                      {stats?.printed ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cards printed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Distributed</CardTitle>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-chart-3/10 text-chart-3">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold" data-testid="text-distributed-cards">
                      {stats?.distributed ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cards distributed to schools</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {stats && stats.totalCards > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribution Progress</CardTitle>
                <CardDescription>Overall card distribution pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Generated</span>
                    <span className="text-muted-foreground">
                      {stats.totalCards > 0 ? Math.round((stats.generated / stats.totalCards) * 100) : 0}%
                    </span>
                  </div>
                  <Progress
                    value={stats.totalCards > 0 ? (stats.generated / stats.totalCards) * 100 : 0}
                    className="h-2"
                    data-testid="progress-generated"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Printed</span>
                    <span className="text-muted-foreground">
                      {stats.totalCards > 0 ? Math.round((stats.printed / stats.totalCards) * 100) : 0}%
                    </span>
                  </div>
                  <Progress
                    value={stats.totalCards > 0 ? (stats.printed / stats.totalCards) * 100 : 0}
                    className="h-2"
                    data-testid="progress-printed"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Distributed</span>
                    <span className="text-muted-foreground">
                      {stats.totalCards > 0 ? Math.round((stats.distributed / stats.totalCards) * 100) : 0}%
                    </span>
                  </div>
                  <Progress
                    value={stats.totalCards > 0 ? (stats.distributed / stats.totalCards) * 100 : 0}
                    className="h-2"
                    data-testid="progress-distributed"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Exam Cards</CardTitle>
              <CardDescription>
                Generate cards for a single student or batch generate for an entire school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant={generateMode === "batch" ? "default" : "outline"}
                  onClick={() => setGenerateMode("batch")}
                  data-testid="button-mode-batch"
                >
                  <School className="mr-2 h-4 w-4" />
                  Batch by School
                </Button>
                <Button
                  variant={generateMode === "single" ? "default" : "outline"}
                  onClick={() => setGenerateMode("single")}
                  data-testid="button-mode-single"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Single Student
                </Button>
              </div>

              {generateMode === "single" ? (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input
                      id="student-id"
                      placeholder="Enter student ID"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      data-testid="input-student-id"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>School</Label>
                    <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                      <SelectTrigger data-testid="select-school">
                        <SelectValue placeholder="Select a school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={String(school.id)}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-w-md">
                <Label>Grade (Optional)</Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger data-testid="select-grade">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="1">Grade 1</SelectItem>
                    <SelectItem value="2">Grade 2</SelectItem>
                    <SelectItem value="3">Grade 3</SelectItem>
                    <SelectItem value="4">Grade 4</SelectItem>
                    <SelectItem value="5">Grade 5</SelectItem>
                    <SelectItem value="6">Grade 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={
                  generateMutation.isPending ||
                  !examYearId ||
                  (generateMode === "single" && !studentId) ||
                  (generateMode === "batch" && !selectedSchoolId)
                }
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {generateMutation.isPending ? "Generating..." : "Generate Cards"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Batches</CardTitle>
              <CardDescription>View and manage exam card batches</CardDescription>
            </CardHeader>
            <CardContent>
              {batchesLoading || !examYearId ? (
                <TableSkeleton />
              ) : batches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No batches found</p>
                  <p className="text-sm">Generate exam cards to create batches</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Printed</TableHead>
                        <TableHead>Distributed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-0.5 rounded" data-testid={`text-batch-number-${batch.id}`}>
                              {batch.batchNumber}
                            </code>
                          </TableCell>
                          <TableCell data-testid={`text-batch-school-${batch.id}`}>
                            {batch.schoolName}
                          </TableCell>
                          <TableCell data-testid={`text-batch-total-${batch.id}`}>
                            {batch.totalCards}
                          </TableCell>
                          <TableCell data-testid={`text-batch-printed-${batch.id}`}>
                            {batch.printedCount}
                          </TableCell>
                          <TableCell data-testid={`text-batch-distributed-${batch.id}`}>
                            {batch.distributedCount}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(batch.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {batch.status === "generated" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markPrintedMutation.mutate(batch.id)}
                                  disabled={markPrintedMutation.isPending}
                                  data-testid={`button-mark-printed-${batch.id}`}
                                >
                                  {markPrintedMutation.isPending ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Printer className="mr-1 h-3 w-3" />
                                  )}
                                  Mark Printed
                                </Button>
                              )}
                              {(batch.status === "printed" || batch.status === "partial") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markDistributedMutation.mutate({ batchId: batch.id })}
                                  disabled={markDistributedMutation.isPending}
                                  data-testid={`button-mark-distributed-${batch.id}`}
                                >
                                  {markDistributedMutation.isPending ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="mr-1 h-3 w-3" />
                                  )}
                                  Mark Distributed
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribution Progress by School</CardTitle>
              <CardDescription>Track exam card distribution across all schools</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading || !examYearId ? (
                <TableSkeleton />
              ) : !stats?.bySchool || stats.bySchool.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No distribution data</p>
                  <p className="text-sm">Generate and distribute exam cards to see progress</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Printed</TableHead>
                        <TableHead>Distributed</TableHead>
                        <TableHead className="w-[200px]">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.bySchool.map((school) => {
                        const progressPercent = school.total > 0
                          ? Math.round((school.distributed / school.total) * 100)
                          : 0;
                        return (
                          <TableRow key={school.schoolId} data-testid={`row-school-${school.schoolId}`}>
                            <TableCell className="font-medium" data-testid={`text-school-name-${school.schoolId}`}>
                              {school.schoolName}
                            </TableCell>
                            <TableCell data-testid={`text-school-total-${school.schoolId}`}>
                              {school.total}
                            </TableCell>
                            <TableCell data-testid={`text-school-generated-${school.schoolId}`}>
                              {school.generated}
                            </TableCell>
                            <TableCell data-testid={`text-school-printed-${school.schoolId}`}>
                              {school.printed}
                            </TableCell>
                            <TableCell data-testid={`text-school-distributed-${school.schoolId}`}>
                              {school.distributed}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={progressPercent}
                                  className="h-2 flex-1"
                                  data-testid={`progress-school-${school.schoolId}`}
                                />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {progressPercent}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
