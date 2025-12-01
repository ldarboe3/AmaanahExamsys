import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Printer,
  Download,
  User,
  School,
  MapPin,
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, Cluster, School as SchoolType, Student, ExamYear, Transcript } from "@shared/schema";

interface StudentWithResults extends Student {
  school?: SchoolType;
  results?: Array<{
    subjectId: number;
    score: number;
    grade: string;
    subjectName?: string;
  }>;
}

function TranscriptsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-6 h-6" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function Transcripts() {
  const { toast } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<StudentWithResults | null>(null);

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
    enabled: !!selectedRegion,
  });

  const { data: schools } = useQuery<SchoolType[]>({
    queryKey: ["/api/schools"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<StudentWithResults[]>({
    queryKey: [`/api/students?schoolId=${selectedSchool}`],
    enabled: !!selectedSchool,
  });

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: allTranscripts } = useQuery<Transcript[]>({
    queryKey: ["/api/transcripts"],
  });

  const activeExamYear = examYears?.find(ey => ey.isActive);

  const getStudentTranscript = (studentId: number): Transcript | undefined => {
    return allTranscripts?.find(t => t.studentId === studentId && t.examYearId === activeExamYear?.id);
  };

  const filteredClusters = clusters?.filter(c => c.regionId === parseInt(selectedRegion)) || [];
  const filteredSchools = schools?.filter(s => {
    if (selectedCluster) return s.clusterId === parseInt(selectedCluster);
    if (selectedRegion) return s.regionId === parseInt(selectedRegion);
    return true;
  }) || [];

  const generateTranscriptMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      return apiRequest("POST", "/api/transcripts/generate", { studentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students?schoolId=${selectedSchool}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts"] });
      toast({
        title: "Transcripts Generated",
        description: `${selectedStudents.length} transcript(s) generated successfully.`,
      });
      setSelectedStudents([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate transcripts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/transcripts/generate-school", { schoolId: parseInt(selectedSchool) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students?schoolId=${selectedSchool}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts"] });
      toast({
        title: "All Transcripts Generated",
        description: "All student transcripts for this school have been generated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate transcripts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && students) {
      setSelectedStudents(students.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handlePreview = (student: StudentWithResults) => {
    setPreviewStudent(student);
    setShowPreviewDialog(true);
  };

  const handleDownloadTranscript = (transcriptId: number) => {
    window.open(`/api/transcripts/${transcriptId}/download`, '_blank');
  };

  const handlePrintSelected = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one student to print transcripts.",
        variant: "destructive",
      });
      return;
    }
    generateTranscriptMutation.mutate(selectedStudents);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Transcripts</h1>
          <p className="text-muted-foreground mt-1">
            Generate and print student academic transcripts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintSelected}
            disabled={selectedStudents.length === 0 || generateTranscriptMutation.isPending}
            data-testid="button-print-selected"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Selected ({selectedStudents.length})
          </Button>
          <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={!selectedSchool || generateAllMutation.isPending}
            data-testid="button-print-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate All for School
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Students</CardTitle>
          <CardDescription>
            Select region, cluster, and school to view students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Region
              </label>
              <Select value={selectedRegion} onValueChange={(value) => {
                setSelectedRegion(value);
                setSelectedCluster("");
                setSelectedSchool("");
                setSelectedStudents([]);
              }}>
                <SelectTrigger data-testid="select-region">
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {regions?.map(region => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Cluster
              </label>
              <Select 
                value={selectedCluster} 
                onValueChange={(value) => {
                  setSelectedCluster(value);
                  setSelectedSchool("");
                  setSelectedStudents([]);
                }}
                disabled={!selectedRegion}
              >
                <SelectTrigger data-testid="select-cluster">
                  <SelectValue placeholder="Select Cluster" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClusters.map(cluster => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <School className="w-4 h-4 text-muted-foreground" />
                School
              </label>
              <Select 
                value={selectedSchool} 
                onValueChange={(value) => {
                  setSelectedSchool(value);
                  setSelectedStudents([]);
                }}
                disabled={!selectedRegion}
              >
                <SelectTrigger data-testid="select-school">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSchools.map(school => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-semibold">{students?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-semibold text-chart-2">{selectedStudents.length}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exam Year</p>
                <p className="text-lg font-semibold">{activeExamYear?.name || "N/A"}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">School</p>
                <p className="text-sm font-medium truncate max-w-[120px]">
                  {filteredSchools.find(s => s.id.toString() === selectedSchool)?.name || "None"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <School className="w-5 h-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Student List</CardTitle>
              <CardDescription>
                {selectedSchool ? `${students?.length || 0} students found` : "Select a school to view students"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSchool ? (
            <div className="text-center py-12">
              <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No School Selected</h3>
              <p className="text-muted-foreground">
                Please select a region, cluster, and school to view students
              </p>
            </div>
          ) : studentsLoading ? (
            <TranscriptsTableSkeleton />
          ) : students && students.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={students.length > 0 && selectedStudents.length === students.length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Index Number</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const transcript = getStudentTranscript(student.id);
                    return (
                      <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                            data-testid={`checkbox-student-${student.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {student.indexNumber || "Pending"}
                          </code>
                        </TableCell>
                        <TableCell>Grade {student.grade}</TableCell>
                        <TableCell className="capitalize">{student.gender}</TableCell>
                        <TableCell>
                          {transcript ? (
                            <Badge variant="default" className="bg-chart-3/10 text-chart-3">
                              Generated
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {student.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(student)}
                              data-testid={`button-preview-${student.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {transcript && transcript.pdfUrl ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadTranscript(transcript.id)}
                                data-testid={`button-download-${student.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generateTranscriptMutation.mutate([student.id])}
                                disabled={generateTranscriptMutation.isPending}
                                data-testid={`button-print-${student.id}`}
                              >
                                {generateTranscriptMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Printer className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                This school has no registered students
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transcript Preview</DialogTitle>
            <DialogDescription>
              Preview transcript for {previewStudent?.firstName} {previewStudent?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-muted/30">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">ACADEMIC TRANSCRIPT</h2>
                <p className="text-sm text-muted-foreground">Amaanah Examination Board</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-muted-foreground">Student Name</p>
                  <p className="font-medium">{previewStudent?.firstName} {previewStudent?.lastName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Index Number</p>
                  <p className="font-medium">{previewStudent?.indexNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grade Level</p>
                  <p className="font-medium">Grade {previewStudent?.grade}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Exam Year</p>
                  <p className="font-medium">{activeExamYear?.name || "N/A"}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Subject Results</h3>
                <p className="text-sm text-muted-foreground italic">
                  Results will be displayed here once published
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (previewStudent) {
                generateTranscriptMutation.mutate([previewStudent.id]);
              }
              setShowPreviewDialog(false);
            }}>
              <Printer className="w-4 h-4 mr-2" />
              Print Transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
