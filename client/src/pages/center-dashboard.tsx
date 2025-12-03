import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Search,
  MapPin,
  Users,
  School,
  Calendar,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Plus,
  QrCode,
  Hash,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";

interface CenterDashboardData {
  center: {
    id: number;
    name: string;
    code: string;
    address?: string;
    regionId: number;
    clusterId: number;
    capacity: number;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    isActive: boolean;
  };
  examYear: {
    id: number;
    year: number;
    name: string;
  } | null;
  statistics: {
    totalSchools: number;
    totalStudents: number;
    studentsByGrade: Record<number, number>;
    totalInvigilators: number;
    pendingPapers: number;
    pendingScripts: number;
    malpracticeCount: number;
  };
  schools: Array<{
    id: number;
    name: string;
    schoolType: string;
    email?: string;
    phone?: string;
  }>;
  timetable: Array<{
    id: number;
    examDate: string;
    startTime: string;
    endTime: string;
    subjectId: number;
    subjectName?: string;
    subjectArabicName?: string;
    grade: number;
    venue?: string;
  }>;
  paperMovements: Array<{
    id: number;
    paperType: string;
    quantity: number;
    status: string;
    subjectId?: number;
    grade?: number;
    createdAt: string;
  }>;
  scriptMovements: Array<{
    id: number;
    grade: number;
    totalScripts: number;
    presentCount: number;
    absentCount: number;
    status: string;
    subjectId: number;
    createdAt: string;
  }>;
  malpracticeReports: Array<{
    id: number;
    incidentType: string;
    malpracticeType?: string;
    description: string;
    studentId?: number;
    status: string;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: number;
    activityType: string;
    description: string;
    createdAt: string;
  }>;
  invigilators: Array<{
    id: number;
    examinerId: number;
    role: string;
    subjectId?: number;
  }>;
}

const malpracticeSchema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  malpracticeType: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  studentId: z.coerce.number().optional(),
  subjectId: z.coerce.number().optional(),
});

type MalpracticeFormData = z.infer<typeof malpracticeSchema>;

function StatCard({ label, value, icon: Icon, variant = "default" }: { 
  label: string; 
  value: number | string; 
  icon: any;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const colorClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-chart-2/10 text-chart-2",
    warning: "bg-chart-4/10 text-chart-4",
    error: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${colorClasses[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimetableTab({ timetable }: { timetable: CenterDashboardData["timetable"] }) {
  const { isRTL } = useLanguage();
  
  const groupedByDate = timetable.reduce((acc, entry) => {
    const date = entry.examDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof timetable>);

  const sortedDates = Object.keys(groupedByDate).sort();

  if (timetable.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Timetable Entries</h3>
          <p className="text-muted-foreground">The exam timetable has not been set up yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map(date => (
        <Card key={date}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Venue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByDate[date].map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.startTime} - {entry.endTime}
                    </TableCell>
                    <TableCell>
                      <div>
                        {entry.subjectName}
                        {entry.subjectArabicName && (
                          <span className="text-muted-foreground block text-sm" dir="rtl">
                            {entry.subjectArabicName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Grade {entry.grade}</Badge>
                    </TableCell>
                    <TableCell>{entry.venue || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceTab({ centerId, examYearId }: { centerId: number; examYearId?: number }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLooking, setIsLooking] = useState(false);

  const handleLookup = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLooking(true);
    try {
      const response = await fetch(`/api/attendance/lookup?indexNumber=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        setLookupResult(data.student);
      } else {
        setLookupResult(null);
        toast({
          title: "Student Not Found",
          description: data.message || "No student found with this index number",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to lookup student",
        variant: "destructive",
      });
    } finally {
      setIsLooking(false);
    }
  };

  const markAttendance = async (status: "present" | "absent") => {
    if (!lookupResult || !examYearId) return;

    try {
      await apiRequest("POST", "/api/attendance", {
        studentId: lookupResult.id,
        centerId,
        examYearId,
        status,
        attendanceTime: new Date().toISOString(),
      });

      toast({
        title: "Attendance Marked",
        description: `${lookupResult.firstName} ${lookupResult.lastName} marked as ${status}`,
      });

      setLookupResult(null);
      setSearchQuery("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Student Lookup
          </CardTitle>
          <CardDescription>
            Enter index number or scan barcode to mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter index number (e.g., 100001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                className="pl-9"
                data-testid="input-attendance-search"
              />
            </div>
            <Button onClick={handleLookup} disabled={isLooking} data-testid="button-lookup">
              {isLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            <Button variant="outline" disabled>
              <QrCode className="w-4 h-4 me-2" />
              Scan
            </Button>
          </div>

          {lookupResult && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {lookupResult.firstName} {lookupResult.middleName || ''} {lookupResult.lastName}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>Index: {lookupResult.indexNumber}</span>
                      <span>Grade: {lookupResult.grade}</span>
                      <span>School: {lookupResult.schoolName}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      onClick={() => markAttendance("present")}
                      data-testid="button-mark-present"
                    >
                      <CheckCircle2 className="w-4 h-4 me-2" />
                      Present
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => markAttendance("absent")}
                      data-testid="button-mark-absent"
                    >
                      <XCircle className="w-4 h-4 me-2" />
                      Absent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Attendance Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <FileText className="w-6 h-6" />
              <span>Print Attendance Sheet</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Users className="w-6 h-6" />
              <span>Bulk Mark by Grade</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6" />
              <span>Sync Attendance</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MalpracticeTab({ 
  centerId, 
  examYearId, 
  reports 
}: { 
  centerId: number; 
  examYearId?: number;
  reports: CenterDashboardData["malpracticeReports"];
}) {
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

  const form = useForm<MalpracticeFormData>({
    resolver: zodResolver(malpracticeSchema),
    defaultValues: {
      incidentType: "",
      malpracticeType: "",
      description: "",
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (data: MalpracticeFormData) => {
      return apiRequest("POST", "/api/malpractice", {
        ...data,
        centerId,
        examYearId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/centers/${centerId}/dashboard`] });
      setShowReportDialog(false);
      form.reset();
      toast({
        title: "Report Submitted",
        description: "Malpractice report has been recorded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const malpracticeTypes = [
    { value: "cheating", label: "Cheating" },
    { value: "smuggling_notes", label: "Smuggling Notes" },
    { value: "misconduct", label: "Misconduct" },
    { value: "teacher_interference", label: "Teacher Interference" },
    { value: "impersonation", label: "Impersonation" },
    { value: "collusion", label: "Collusion" },
    { value: "unauthorized_materials", label: "Unauthorized Materials" },
    { value: "other", label: "Other" },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      reported: "secondary",
      under_review: "default",
      confirmed: "destructive",
      dismissed: "outline",
      action_taken: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Malpractice Reports</h3>
          <p className="text-sm text-muted-foreground">
            {reports.length} report(s) recorded
          </p>
        </div>
        <Button onClick={() => setShowReportDialog(true)} data-testid="button-new-report">
          <Plus className="w-4 h-4 me-2" />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Reports</h3>
            <p className="text-muted-foreground">No malpractice incidents have been reported.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{report.incidentType}</Badge>
                      {report.malpracticeType && (
                        <Badge variant="secondary">{report.malpracticeType.replace('_', ' ')}</Badge>
                      )}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm">{report.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reported: {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Malpractice</DialogTitle>
            <DialogDescription>
              Document details of the incident for review
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => reportMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="incidentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-incident-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="malpractice">Malpractice</SelectItem>
                        <SelectItem value="disturbance">Disturbance</SelectItem>
                        <SelectItem value="medical">Medical Emergency</SelectItem>
                        <SelectItem value="security">Security Issue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="malpracticeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Malpractice Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-malpractice-type">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {malpracticeTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the incident in detail..." 
                        className="min-h-[100px]"
                        {...field} 
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={reportMutation.isPending} data-testid="button-submit-report">
                  {reportMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  Submit Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LogisticsTab({ 
  paperMovements, 
  scriptMovements 
}: { 
  paperMovements: CenterDashboardData["paperMovements"];
  scriptMovements: CenterDashboardData["scriptMovements"];
}) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      prepared: "secondary",
      dispatched: "default",
      received: "default",
      stored: "outline",
      distributed: "default",
      collected: "default",
      returned: "outline",
    };
    return colors[status] || "secondary";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Paper Movements
              </CardTitle>
              <CardDescription>
                Track question papers and materials
              </CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 me-2" />
              Record Receipt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paperMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No paper movements recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paperMovements.map(movement => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">{movement.paperType}</TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.grade ? `Grade ${movement.grade}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(movement.status)}>
                        {movement.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(movement.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Script Collections
              </CardTitle>
              <CardDescription>
                Track answer script handling
              </CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 me-2" />
              Record Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scriptMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No script collections recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Total Scripts</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scriptMovements.map(movement => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">Grade {movement.grade}</TableCell>
                    <TableCell>{movement.totalScripts}</TableCell>
                    <TableCell className="text-chart-2">{movement.presentCount || 0}</TableCell>
                    <TableCell className="text-destructive">{movement.absentCount || 0}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(movement.status)}>
                        {movement.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SchoolsTab({ schools }: { schools: CenterDashboardData["schools"] }) {
  if (schools.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <School className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Schools Assigned</h3>
          <p className="text-muted-foreground">No schools have been assigned to this center yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schools.map(school => (
        <Card key={school.id} className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <School className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{school.name}</p>
                <Badge variant="outline" className="mt-1">
                  {school.schoolType}
                </Badge>
                {school.email && (
                  <p className="text-sm text-muted-foreground mt-2 truncate">{school.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityTab({ activities }: { activities: CenterDashboardData["recentActivity"] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activity</h3>
          <p className="text-muted-foreground">No activity has been recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Badge variant="outline" className="mb-1">{activity.activityType}</Badge>
                <p className="text-sm">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CenterDashboard() {
  const { id } = useParams<{ id: string }>();
  const centerId = parseInt(id || "0");
  const { toast } = useToast();
  const { isRTL } = useLanguage();

  const { data, isLoading, error, refetch } = useQuery<CenterDashboardData>({
    queryKey: [`/api/centers/${centerId}/dashboard`],
    enabled: centerId > 0,
  });

  if (!centerId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invalid center ID</p>
        <Link href="/centers">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 me-2" />
            Back to Centers
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Failed to load center dashboard</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 me-2" />
            Retry
          </Button>
          <Link href="/centers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 me-2" />
              Back to Centers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { center, examYear, statistics, schools, timetable, paperMovements, scriptMovements, malpracticeReports, recentActivity, invigilators } = data;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/centers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{center.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Code: {center.code}</span>
              {examYear && (
                <Badge variant="outline">{examYear.name}</Badge>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 me-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Schools" value={statistics.totalSchools} icon={School} />
        <StatCard label="Students" value={statistics.totalStudents} icon={Users} variant="success" />
        <StatCard label="Invigilators" value={statistics.totalInvigilators} icon={Users} />
        <StatCard label="Pending Papers" value={statistics.pendingPapers} icon={Package} variant="warning" />
        <StatCard label="Pending Scripts" value={statistics.pendingScripts} icon={FileText} variant="warning" />
        <StatCard label="Malpractice" value={statistics.malpracticeCount} icon={AlertTriangle} variant="error" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="timetable" data-testid="tab-timetable">Timetable</TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
          <TabsTrigger value="malpractice" data-testid="tab-malpractice">Malpractice</TabsTrigger>
          <TabsTrigger value="logistics" data-testid="tab-logistics">Logistics</TabsTrigger>
          <TabsTrigger value="schools" data-testid="tab-schools">Schools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Students by Grade</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(statistics.studentsByGrade).length === 0 ? (
                  <p className="text-muted-foreground">No students enrolled</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(statistics.studentsByGrade).map(([grade, count]) => (
                      <div key={grade} className="flex items-center justify-between">
                        <span>Grade {grade}</span>
                        <Badge variant="outline">{count} students</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Center Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{center.address || "No address"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>Capacity: {center.capacity}</span>
                </div>
                {center.contactPerson && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Contact:</span>
                    <span>{center.contactPerson}</span>
                    {center.contactPhone && <span>({center.contactPhone})</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <ActivityTab activities={recentActivity} />
        </TabsContent>

        <TabsContent value="timetable" className="mt-4">
          <TimetableTab timetable={timetable} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab centerId={centerId} examYearId={examYear?.id} />
        </TabsContent>

        <TabsContent value="malpractice" className="mt-4">
          <MalpracticeTab 
            centerId={centerId} 
            examYearId={examYear?.id} 
            reports={malpracticeReports} 
          />
        </TabsContent>

        <TabsContent value="logistics" className="mt-4">
          <LogisticsTab 
            paperMovements={paperMovements} 
            scriptMovements={scriptMovements} 
          />
        </TabsContent>

        <TabsContent value="schools" className="mt-4">
          <SchoolsTab schools={schools} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
