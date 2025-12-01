import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  Copy,
  User,
  School,
  Calendar,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Student, Region, Cluster, School as SchoolType } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  approved: "bg-chart-3/10 text-chart-3",
  rejected: "bg-destructive/10 text-destructive",
};

const gradeLabels: Record<number, string> = {
  3: "Grade 3",
  6: "Grade 6",
  9: "Grade 9",
  12: "Grade 12",
};

interface StudentWithRelations extends Student {
  school?: { name: string };
  examYear?: { name: string };
}

interface SchoolWithRelations extends SchoolType {
  region?: { name: string };
  cluster?: { name: string };
}

function StudentsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function Students() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (gradeFilter !== "all") queryParams.set("grade", gradeFilter);
  if (regionFilter !== "all") queryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") queryParams.set("clusterId", clusterFilter);
  if (schoolFilter !== "all") queryParams.set("schoolId", schoolFilter);
  const queryString = queryParams.toString();
  const studentsUrl = queryString ? `/api/students?${queryString}` : "/api/students";

  const { data: students, isLoading } = useQuery<StudentWithRelations[]>({
    queryKey: [studentsUrl],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  // Build school query URL based on region/cluster filters
  const schoolQueryParams = new URLSearchParams();
  if (regionFilter !== "all") schoolQueryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") schoolQueryParams.set("clusterId", clusterFilter);
  const schoolQueryString = schoolQueryParams.toString();
  const schoolsUrl = schoolQueryString ? `/api/schools?${schoolQueryString}` : "/api/schools";

  const { data: schools } = useQuery<SchoolWithRelations[]>({
    queryKey: [schoolsUrl],
  });

  // Filter clusters based on selected region
  const clustersForFilter = clusters?.filter(
    (cluster) => regionFilter === "all" || cluster.regionId === parseInt(regionFilter)
  );

  // Schools are already filtered by API call, use them directly as options
  const schoolsForFilter = schools;

  // Helper to invalidate all student queries (including filtered variants)
  const invalidateStudentQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/students');
      },
    });
  };

  const approveStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return apiRequest("POST", `/api/students/${studentId}/approve`);
    },
    onSuccess: () => {
      invalidateStudentQueries();
      toast({
        title: "Student Approved",
        description: "The student has been approved successfully.",
      });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/students/approve-all`);
    },
    onSuccess: () => {
      invalidateStudentQueries();
      toast({
        title: "All Students Approved",
        description: "All pending students have been approved.",
      });
    },
  });

  const filteredStudents = students?.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      student.indexNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = students?.filter(s => s.status === 'pending').length || 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Index number copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">
            Manage student registrations and validations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-csv">
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
          <Button variant="outline" data-testid="button-download-template">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Template
          </Button>
          {pendingCount > 0 && (
            <Button onClick={() => approveAllMutation.mutate()} data-testid="button-approve-all">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve All ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-semibold">{students?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-semibold">
                  {students?.filter(s => s.status === 'approved').length || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Index #</p>
                <p className="text-2xl font-semibold">
                  {students?.filter(s => s.indexNumber).length || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <Hash className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or index number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-students"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={regionFilter} onValueChange={(value) => {
                setRegionFilter(value);
                setClusterFilter("all");
                setSchoolFilter("all");
              }}>
                <SelectTrigger className="w-[160px]" data-testid="select-region-filter">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions?.map((region) => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clusterFilter} onValueChange={(value) => {
                setClusterFilter(value);
                setSchoolFilter("all");
              }} disabled={regionFilter === "all"}>
                <SelectTrigger className="w-[160px]" data-testid="select-cluster-filter">
                  <SelectValue placeholder={regionFilter === "all" ? "Select Region First" : "Cluster"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clusters</SelectItem>
                  {clustersForFilter?.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-school-filter">
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schoolsForFilter?.map((school) => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-grade-filter">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="3">Grade 3</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="12">Grade 12</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Student List</CardTitle>
              <CardDescription>
                {filteredStudents?.length || 0} students found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print Cards
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <StudentsTableSkeleton />
          ) : filteredStudents && filteredStudents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Index #</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {student.gender}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.indexNumber ? (
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {student.indexNumber}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(student.indexNumber!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {gradeLabels[student.grade] || `Grade ${student.grade}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {student.school?.name || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[student.status || 'pending']} text-xs capitalize`}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${student.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="w-4 h-4 mr-2" />
                              Print Card
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {student.status === 'pending' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => approveStudentMutation.mutate(student.id)}
                                  className="text-chart-3"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Upload a CSV file to register students"}
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Students
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Complete information about the student
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedStudent.firstName} {selectedStudent.middleName} {selectedStudent.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedStudent.gender} - {gradeLabels[selectedStudent.grade]}
                  </p>
                  <Badge className={`${statusColors[selectedStudent.status || 'pending']} mt-2`}>
                    {selectedStudent.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                {selectedStudent.indexNumber && (
                  <div className="p-4 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Index Number</p>
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-mono font-semibold">
                        {selectedStudent.indexNumber}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedStudent.indexNumber!)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    {selectedStudent.confirmationCode && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Confirmation Code</p>
                        <code className="text-sm font-mono">
                          {selectedStudent.confirmationCode}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">School</p>
                      <p className="text-sm font-medium">{selectedStudent.school?.name || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Exam Year</p>
                      <p className="text-sm font-medium">{selectedStudent.examYear?.name || "Unknown"}</p>
                    </div>
                  </div>
                </div>

                {selectedStudent.dateOfBirth && (
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-medium">{selectedStudent.dateOfBirth}</p>
                  </div>
                )}
                {selectedStudent.placeOfBirth && (
                  <div>
                    <p className="text-xs text-muted-foreground">Place of Birth</p>
                    <p className="text-sm font-medium">{selectedStudent.placeOfBirth}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload CSV Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Student List</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Choose File
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Need the template?</span>
              <Button variant="link" size="sm" className="h-auto p-0">
                <Download className="w-4 h-4 mr-1" />
                Download CSV Template
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button disabled>
              Upload & Validate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
