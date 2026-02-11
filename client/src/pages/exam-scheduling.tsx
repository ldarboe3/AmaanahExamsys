import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, Clock, Plus, CheckCircle2, AlertTriangle,
  Timer, Eye, Send, XCircle, PlayCircle, StopCircle,
  Activity, BarChart3, MapPin
} from "lucide-react";
import type { ExamSchedule, ExamYear, Subject } from "@shared/schema";

const LATE_REASON_LABELS: Record<string, string> = {
  transport_delay: "Transport Delay",
  weather: "Weather Conditions",
  security_incident: "Security Incident",
  materials_late: "Materials Arrived Late",
  staff_absence: "Staff Absence",
  technical_issue: "Technical Issue",
  venue_issue: "Venue Issue",
  student_delay: "Student Delay",
  communication_gap: "Communication Gap",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "secondary" },
  started_on_time: { label: "On Time", variant: "default" },
  started_late: { label: "Started Late", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  ended_on_time: { label: "Ended On Time", variant: "default" },
  ended_late: { label: "Ended Late", variant: "destructive" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export default function ExamScheduling() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schedules");
  const [selectedExamYearId, setSelectedExamYearId] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [monitoringDate, setMonitoringDate] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRecordStartDialog, setShowRecordStartDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);

  const isHQ = user?.role === "super_admin" || user?.role === "examination_admin";

  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: centers = [] } = useQuery<any[]>({ queryKey: ["/api/exam-centers"] });

  const scheduleFilters = new URLSearchParams();
  if (selectedExamYearId) scheduleFilters.set("examYearId", selectedExamYearId);
  if (selectedGrade) scheduleFilters.set("grade", selectedGrade);

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<ExamSchedule[]>({
    queryKey: ["/api/exam-schedules", selectedExamYearId, selectedGrade],
    queryFn: () => fetch(`/api/exam-schedules?${scheduleFilters.toString()}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedExamYearId,
  });

  const monParams = new URLSearchParams();
  if (selectedExamYearId) monParams.set("examYearId", selectedExamYearId);
  if (monitoringDate) monParams.set("examDate", monitoringDate);

  const { data: monitoringData, isLoading: monitoringLoading } = useQuery<any>({
    queryKey: ["/api/exam-scheduling/monitoring", selectedExamYearId, monitoringDate],
    queryFn: () => fetch(`/api/exam-scheduling/monitoring?${monParams.toString()}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedExamYearId && isHQ && activeTab === "monitoring",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/exam-schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-schedules"] });
      setShowCreateDialog(false);
      toast({ title: "Schedule created successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/exam-schedules/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-schedules"] });
      toast({ title: "Schedule published" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/exam-schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-schedules"] });
      toast({ title: "Schedule deleted" });
    },
  });

  const recordStartMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/exam-sessions/record-start", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-scheduling/monitoring"] });
      setShowRecordStartDialog(false);
      toast({ title: "Exam start recorded" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const recordEndMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("POST", `/api/exam-sessions/${id}/record-end`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-scheduling/monitoring"] });
      toast({ title: "Exam end recorded" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || `Subject ${id}`;

  const uniqueGrades = Array.from(new Set(
    examYears.find(ey => ey.id === Number(selectedExamYearId))?.grades || []
  )).sort();

  const uniqueDates = Array.from(new Set(schedules.map(s => s.examDate))).sort();

  return (
    <div className="space-y-6" data-testid="exam-scheduling-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {(t.nav as any).examScheduling || "Exam Scheduling"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage exam schedules, record sessions, and monitor timing compliance
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select value={selectedExamYearId} onValueChange={setSelectedExamYearId}>
            <SelectTrigger data-testid="select-exam-year">
              <SelectValue placeholder="Select Exam Year" />
            </SelectTrigger>
            <SelectContent>
              {examYears.map(ey => (
                <SelectItem key={ey.id} value={ey.id.toString()} data-testid={`option-year-${ey.id}`}>
                  {ey.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger data-testid="select-grade">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map(g => (
                <SelectItem key={g} value={g.toString()} data-testid={`option-grade-${g}`}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-scheduling">
          <TabsTrigger value="schedules" data-testid="tab-schedules">
            <Calendar className="w-4 h-4 mr-1" /> Schedules
          </TabsTrigger>
          {isHQ && (
            <TabsTrigger value="monitoring" data-testid="tab-monitoring">
              <Activity className="w-4 h-4 mr-1" /> Monitoring Dashboard
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          {isHQ && (
            <div className="flex justify-end">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-schedule" disabled={!selectedExamYearId}>
                    <Plus className="w-4 h-4 mr-1" /> Create Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Exam Schedule</DialogTitle>
                  </DialogHeader>
                  <CreateScheduleForm
                    examYearId={Number(selectedExamYearId)}
                    subjects={subjects}
                    grades={uniqueGrades}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isPending={createMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!selectedExamYearId ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select an exam year to view schedules</CardContent></Card>
          ) : schedulesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : schedules.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No schedules found. Create one to get started.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {uniqueDates.map(date => (
                <Card key={date}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {schedules.filter(s => s.examDate === date).map(schedule => (
                        <div
                          key={schedule.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border"
                          data-testid={`schedule-row-${schedule.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{getSubjectName(schedule.subjectId)}</span>
                              <span className="text-xs text-muted-foreground">Grade {schedule.grade}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{schedule.scheduledStartTime} - {schedule.scheduledEndTime}</span>
                            <Badge variant="secondary" className="text-xs">{schedule.durationMinutes} min</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {schedule.isPublished ? (
                              <Badge variant="default" data-testid={`badge-published-${schedule.id}`}>Published</Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-draft-${schedule.id}`}>Draft</Badge>
                            )}
                            {isHQ && !schedule.isPublished && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => publishMutation.mutate(schedule.id)}
                                disabled={publishMutation.isPending}
                                data-testid={`button-publish-${schedule.id}`}
                              >
                                <Send className="w-3.5 h-3.5 mr-1" /> Publish
                              </Button>
                            )}
                            {isHQ && !schedule.isPublished && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm("Delete this schedule?")) deleteMutation.mutate(schedule.id);
                                }}
                                data-testid={`button-delete-${schedule.id}`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isHQ && (
          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <Input
                  type="date"
                  value={monitoringDate}
                  onChange={e => setMonitoringDate(e.target.value)}
                  data-testid="input-monitoring-date"
                  placeholder="Filter by date"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonitoringDate("")}
                data-testid="button-clear-date"
              >
                All Dates
              </Button>
            </div>

            {!selectedExamYearId ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Select an exam year to view monitoring data</CardContent></Card>
            ) : monitoringLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <SummaryCard label="Total Sessions" value={monitoringData?.summary?.total || 0} icon={<BarChart3 className="w-5 h-5" />} />
                  <SummaryCard label="On Time" value={monitoringData?.summary?.onTime || 0} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} variant="success" />
                  <SummaryCard label="Late Start" value={monitoringData?.summary?.lateStart || 0} icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} variant="warning" />
                  <SummaryCard label="Late End" value={monitoringData?.summary?.lateEnd || 0} icon={<Timer className="w-5 h-5 text-orange-500" />} variant="warning" />
                  <SummaryCard label="In Progress" value={monitoringData?.summary?.inProgress || 0} icon={<PlayCircle className="w-5 h-5 text-blue-500" />} variant="info" />
                  <SummaryCard label="Not Started" value={monitoringData?.summary?.notStarted || 0} icon={<Clock className="w-5 h-5 text-muted-foreground" />} />
                </div>

                {monitoringData?.sessions?.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Session Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="monitoring-table">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-2 pr-3 font-medium">Center</th>
                              <th className="pb-2 pr-3 font-medium">Subject</th>
                              <th className="pb-2 pr-3 font-medium">Scheduled</th>
                              <th className="pb-2 pr-3 font-medium">Actual Start</th>
                              <th className="pb-2 pr-3 font-medium">Status</th>
                              <th className="pb-2 pr-3 font-medium">Delay</th>
                              <th className="pb-2 font-medium">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monitoringData.sessions.map((session: any) => {
                              const statusCfg = STATUS_CONFIG[session.status] || { label: session.status, variant: "secondary" as const };
                              return (
                                <tr key={session.id} className="border-b last:border-0" data-testid={`session-row-${session.id}`}>
                                  <td className="py-2 pr-3">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span className="font-medium">{session.center?.name || `Center ${session.centerId}`}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3">{session.subject?.name || "—"}</td>
                                  <td className="py-2 pr-3">{session.schedule?.scheduledStartTime || "—"}</td>
                                  <td className="py-2 pr-3">
                                    {session.actualStartTime
                                      ? new Date(session.actualStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                      : "—"}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <Badge variant={statusCfg.variant} data-testid={`badge-status-${session.id}`}>
                                      {statusCfg.label}
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-3">
                                    {session.startedLate && (
                                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                                        +{session.lateStartMinutes} min
                                      </span>
                                    )}
                                    {session.endedLate && (
                                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                                        +{session.lateEndMinutes} min (end)
                                      </span>
                                    )}
                                    {!session.startedLate && !session.endedLate && "—"}
                                  </td>
                                  <td className="py-2">
                                    {session.lateStartReasonCode
                                      ? LATE_REASON_LABELS[session.lateStartReasonCode] || session.lateStartReasonCode
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">No session data recorded yet</CardContent></Card>
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showRecordStartDialog} onOpenChange={setShowRecordStartDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Exam Start</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <RecordStartForm
              schedule={selectedSchedule}
              centers={centers}
              onSubmit={(data) => recordStartMutation.mutate(data)}
              isPending={recordStartMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon, variant }: { label: string; value: number; icon: React.ReactNode; variant?: string }) {
  const borderClass = variant === "success" ? "border-l-green-500" : variant === "warning" ? "border-l-amber-500" : variant === "info" ? "border-l-blue-500" : "";
  return (
    <Card data-testid={`summary-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CreateScheduleForm({ examYearId, subjects, grades, onSubmit, isPending }: {
  examYearId: number;
  subjects: Subject[];
  grades: number[];
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");

  const calculateEndTime = (start: string, dur: number): string => {
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    const totalMin = h * 60 + m + dur;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const endTime = calculateEndTime(startTime, parseInt(duration) || 0);

  const filteredSubjects = grade ? subjects.filter(s => s.grade === parseInt(grade)) : subjects;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Grade</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger data-testid="input-schedule-grade">
              <SelectValue placeholder="Select Grade" />
            </SelectTrigger>
            <SelectContent>
              {grades.map(g => <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger data-testid="input-schedule-subject">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Exam Date</Label>
        <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} data-testid="input-schedule-date" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Start Time</Label>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} data-testid="input-schedule-start" />
        </div>
        <div>
          <Label>Duration (min)</Label>
          <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={10} max={480} data-testid="input-schedule-duration" />
        </div>
        <div>
          <Label>End Time</Label>
          <Input value={endTime} readOnly className="bg-muted" data-testid="input-schedule-end" />
        </div>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-schedule-notes" />
      </div>
      <Button
        className="w-full"
        onClick={() => onSubmit({
          examYearId,
          subjectId: parseInt(subjectId),
          grade: parseInt(grade),
          examDate,
          scheduledStartTime: startTime,
          durationMinutes: parseInt(duration),
          scheduledEndTime: endTime,
          notes: notes || null,
        })}
        disabled={isPending || !subjectId || !grade || !examDate || !startTime}
        data-testid="button-submit-schedule"
      >
        {isPending ? "Creating..." : "Create Schedule"}
      </Button>
    </div>
  );
}

function RecordStartForm({ schedule, centers, onSubmit, isPending }: {
  schedule: ExamSchedule;
  centers: any[];
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [centerId, setCenterId] = useState("");
  const [candidateCount, setCandidateCount] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label>Center</Label>
        <Select value={centerId} onValueChange={setCenterId}>
          <SelectTrigger data-testid="input-session-center">
            <SelectValue placeholder="Select Center" />
          </SelectTrigger>
          <SelectContent>
            {centers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Number of Candidates</Label>
        <Input type="number" value={candidateCount} onChange={e => setCandidateCount(e.target.value)} data-testid="input-session-candidates" />
      </div>
      <div>
        <Label>Late Start Reason (if applicable)</Label>
        <Select value={reasonCode} onValueChange={setReasonCode}>
          <SelectTrigger data-testid="input-session-reason">
            <SelectValue placeholder="Select reason (if late)" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LATE_REASON_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {reasonCode && (
        <div>
          <Label>Reason Details</Label>
          <Textarea value={reasonDetails} onChange={e => setReasonDetails(e.target.value)} data-testid="input-session-reason-details" />
        </div>
      )}
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-session-notes" />
      </div>
      <Button
        className="w-full"
        onClick={() => onSubmit({
          scheduleId: schedule.id,
          centerId: parseInt(centerId),
          actualStartTime: new Date().toISOString(),
          candidateCount: candidateCount ? parseInt(candidateCount) : undefined,
          lateStartReasonCode: reasonCode || null,
          lateStartReasonDetails: reasonDetails || null,
          notes: notes || null,
        })}
        disabled={isPending || !centerId}
        data-testid="button-submit-start"
      >
        <PlayCircle className="w-4 h-4 mr-1" />
        {isPending ? "Recording..." : "Record Start"}
      </Button>
    </div>
  );
}
