import { useState, useEffect } from "react";
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
  Timer, PlayCircle,
  Activity, BarChart3, MapPin, Sparkles, Loader2, Save,
  RefreshCw, CheckCheck
} from "lucide-react";
import type { ExamYear, Subject } from "@shared/schema";

type ExamStatus = "active" | "conducted" | "scheduled";

function getExamStatus(examDate: string, startTime: string, endTime: string, now: Date): ExamStatus {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const examDay = new Date(examDate + "T00:00:00"); examDay.setHours(0, 0, 0, 0);
  if (examDay < today) return "conducted";
  if (examDay > today) return "scheduled";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (nowMin < startMin) return "scheduled";
  if (nowMin <= endMin) return "active";
  return "conducted";
}

const STATUS_BADGE: Record<ExamStatus, { label: string; classes: string }> = {
  scheduled: { label: "Scheduled", classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" },
  active:    { label: "Active",    classes: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-300 dark:border-green-700" },
  conducted: { label: "Conducted", classes: "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-200 dark:border-slate-700" },
};

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
  const [activeTab, setActiveTab] = useState("timetable");
  const [selectedExamYearId, setSelectedExamYearId] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [monitoringDate, setMonitoringDate] = useState<string>("");
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<any[]>([]);
  const [aiReplaceExisting, setAiReplaceExisting] = useState(false);
  // AI scheduling configuration
  const [aiPapersPerDay, setAiPapersPerDay] = useState<number>(2);
  const [aiMixCore, setAiMixCore] = useState(true);
  const [aiTimeSlots, setAiTimeSlots] = useState([
    { label: "Morning", startTime: "09:00", endTime: "11:00" },
    { label: "Afternoon", startTime: "14:00", endTime: "16:00" },
  ]);

  const isHQ = user?.role === "super_admin" || user?.role === "examination_admin";

  // Live clock — updates every 60 seconds so status badges stay current
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: examYears = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/exam-years"] });
  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: centers = [] } = useQuery<any[]>({ queryKey: ["/api/centers"] });

  const timetableFilters = new URLSearchParams();
  if (selectedExamYearId) timetableFilters.set("examYearId", selectedExamYearId);
  if (selectedGrade && selectedGrade !== "all") timetableFilters.set("grade", selectedGrade);

  const { data: timetableEntries = [], isLoading: timetableLoading } = useQuery<any[]>({
    queryKey: ["/api/timetable", selectedExamYearId, selectedGrade],
    queryFn: () => fetch(`/api/timetable?${timetableFilters.toString()}`, { credentials: "include" }).then(r => r.json()),
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

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timetable/ai-generate", {
        examYearId: Number(selectedExamYearId),
        grade: selectedGrade && selectedGrade !== "all" ? Number(selectedGrade) : undefined,
        timeSlots: aiTimeSlots,
        maxPapersPerDay: aiPapersPerDay,
        weekendDays: [4, 5], // Thursday and Friday
        mixCoreWithNonCore: aiMixCore,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setAiSchedule(data.schedule || []);
      toast({ title: `AI generated ${(data.schedule || []).length} schedule entries` });
    },
    onError: (err: any) => toast({ title: "AI Generation Failed", description: err.message, variant: "destructive" }),
  });

  const aiSaveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timetable/ai-save", {
        examYearId: Number(selectedExamYearId),
        entries: aiSchedule,
        replaceExisting: aiReplaceExisting,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-schedules"] });
      setShowAIDialog(false);
      setAiSchedule([]);
      toast({ title: `Saved ${data.created} timetable entries successfully` });
    },
    onError: (err: any) => toast({ title: "Save Failed", description: err.message, variant: "destructive" }),
  });

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || `Subject ${id}`;

  const uniqueGrades = Array.from(new Set(
    examYears.find(ey => ey.id === Number(selectedExamYearId))?.grades || []
  )).sort();

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
        {isHQ && (
          <Button
            onClick={() => setShowAIDialog(true)}
            disabled={!selectedExamYearId}
            data-testid="button-ai-auto-schedule"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            AI Auto-Schedule
          </Button>
        )}
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
          <TabsTrigger value="timetable" data-testid="tab-timetable">
            <Clock className="w-4 h-4 mr-1" /> Timetable
          </TabsTrigger>
          {isHQ && (
            <TabsTrigger value="monitoring" data-testid="tab-monitoring">
              <Activity className="w-4 h-4 mr-1" /> Monitoring Dashboard
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="timetable" className="space-y-4">
          {!selectedExamYearId ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select an exam year to view the timetable</CardContent></Card>
          ) : timetableLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : timetableEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No Timetable Entries</p>
                <p className="text-sm mt-1">Use the AI Auto-Schedule button to generate a timetable.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {Array.from(new Set(timetableEntries.map((e: any) => e.examDate))).sort().map(date => {
                const today = new Date(now); today.setHours(0, 0, 0, 0);
                const cardDay = new Date(date + "T00:00:00"); cardDay.setHours(0, 0, 0, 0);
                const isToday = cardDay.getTime() === today.getTime();
                const isPast  = cardDay < today;
                return (
                  <Card key={date} className={isToday ? "ring-2 ring-primary/60" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        <Calendar className={`w-4 h-4 ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-primary"}`} />
                        <span className={isPast && !isToday ? "text-muted-foreground" : ""}>
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {isToday && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Today</span>
                        )}
                        {isPast && !isToday && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Past</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-0">
                        {timetableEntries.filter((e: any) => e.examDate === date).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)).map((entry: any) => {
                          const status = getExamStatus(entry.examDate, entry.startTime, entry.endTime, now);
                          const badge = STATUS_BADGE[status];
                          return (
                            <div key={entry.id} className="flex flex-wrap items-center gap-3 py-2.5 border-t first:border-t-0">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground w-28 shrink-0">
                                <Clock className="w-3 h-3" />
                                {entry.startTime} – {entry.endTime}
                              </div>
                              <div className="flex-1 font-medium">{entry.subject?.name || entry.subject?.arabicName || `Subject #${entry.subjectId}`}</div>
                              <Badge variant="outline">Grade {entry.grade}</Badge>
                              {entry.subject?.isCore && <Badge variant="secondary">Core</Badge>}
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.classes}`}
                                data-testid={`badge-status-${entry.id}`}
                              >
                                {status === "active" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                )}
                                {badge.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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

      {/* AI Auto-Schedule Dialog */}
      <Dialog open={showAIDialog} onOpenChange={(open) => { setShowAIDialog(open); if (!open) setAiSchedule([]); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Auto-Schedule Generator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Exam year info */}
            {selectedExamYearId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Generating for: <strong>{examYears.find(ey => ey.id === Number(selectedExamYearId))?.name}</strong>
                  {selectedGrade && selectedGrade !== "all" && <> — Grade {selectedGrade}</>}
                </span>
              </div>
            )}

            {/* Configuration section — only shown before generating */}
            {aiSchedule.length === 0 && (
              <div className="space-y-4">
                {/* Papers per day */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Papers Per Day</label>
                  <p className="text-xs text-muted-foreground">How many exam papers can be held on the same day across all grades (maximum 3).</p>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(n => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={aiPapersPerDay === n ? "default" : "outline"}
                        onClick={() => {
                          setAiPapersPerDay(n);
                          setAiTimeSlots(prev => {
                            if (n === 1) return [prev[0] || { label: "Morning", startTime: "09:00", endTime: "11:00" }];
                            if (n === 2) return [
                              prev[0] || { label: "Morning", startTime: "09:00", endTime: "11:00" },
                              prev[1] || { label: "Afternoon", startTime: "14:00", endTime: "16:00" },
                            ];
                            return [
                              prev[0] || { label: "Morning", startTime: "09:00", endTime: "11:00" },
                              prev[1] || { label: "Afternoon", startTime: "14:00", endTime: "16:00" },
                              prev[2] || { label: "Evening", startTime: "16:30", endTime: "18:00" },
                            ];
                          });
                        }}
                        data-testid={`button-papers-${n}`}
                      >
                        {n} {n === 1 ? "Paper" : "Papers"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time slots */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Slots</label>
                  <p className="text-xs text-muted-foreground">Configure the start and end time for each exam slot. Morning and afternoon only (no evening).</p>
                  <div className="space-y-2">
                    {aiTimeSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground w-20 shrink-0">Slot {idx + 1}:</span>
                        <Input
                          type="text"
                          value={slot.label}
                          onChange={e => setAiTimeSlots(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                          className="w-28"
                          placeholder="Label"
                          data-testid={`input-slot-label-${idx}`}
                        />
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={e => setAiTimeSlots(prev => prev.map((s, i) => i === idx ? { ...s, startTime: e.target.value } : s))}
                          className="w-32"
                          data-testid={`input-slot-start-${idx}`}
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={e => setAiTimeSlots(prev => prev.map((s, i) => i === idx ? { ...s, endTime: e.target.value } : s))}
                          className="w-32"
                          data-testid={`input-slot-end-${idx}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          ({(() => {
                            const [sh, sm] = slot.startTime.split(":").map(Number);
                            const [eh, em] = slot.endTime.split(":").map(Number);
                            const mins = (eh * 60 + em) - (sh * 60 + sm);
                            return mins > 0 ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}` : "—";
                          })()})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Core subject mixing */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Mix Core with Non-Core Subjects</p>
                    <p className="text-xs text-muted-foreground">
                      When on, core and non-core subjects may share the same exam day to reduce student pressure. When off, core subjects are kept on separate days.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiMixCore}
                    onChange={e => setAiMixCore(e.target.checked)}
                    className="w-4 h-4 rounded"
                    data-testid="checkbox-mix-core"
                  />
                </div>

                {/* Info note */}
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p><strong>Note:</strong> Weekends are set to Thursday & Friday (Islamic calendar).</p>
                  <p>Mark subjects as "Core" in the Subjects section — core subjects (e.g. Quran, Arabic) will be scheduled first in the exam period.</p>
                </div>

                <Button
                  onClick={() => aiGenerateMutation.mutate()}
                  disabled={aiGenerateMutation.isPending || !selectedExamYearId}
                  className="w-full gap-2"
                  data-testid="button-ai-generate"
                >
                  {aiGenerateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating with AI...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Schedule</>
                  )}
                </Button>
              </div>
            )}

            {/* Preview table after generation */}
            {aiSchedule.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-medium text-foreground">
                    <CheckCheck className="w-4 h-4 inline me-1 text-chart-2" />
                    {aiSchedule.length} entries generated
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setAiSchedule([])} className="gap-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Change Settings
                  </Button>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Subject</th>
                        <th className="text-left p-3 font-medium">Grade</th>
                        <th className="text-left p-3 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiSchedule
                        .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.startTime.localeCompare(b.startTime))
                        .map((entry, idx) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">
                              {new Date(entry.examDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{entry.subjectName}</span>
                                {entry.isCore && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Core</Badge>}
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">Grade {entry.grade}</td>
                            <td className="p-3 text-muted-foreground">{entry.startTime} – {entry.endTime}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiReplaceExisting}
                    onChange={e => setAiReplaceExisting(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-replace-existing"
                  />
                  <span>Replace all existing timetable entries for this exam year</span>
                </label>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => aiGenerateMutation.mutate()}
                    disabled={aiGenerateMutation.isPending}
                    className="gap-1"
                  >
                    {aiGenerateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Regenerate
                  </Button>
                  <Button
                    onClick={() => aiSaveMutation.mutate()}
                    disabled={aiSaveMutation.isPending}
                    className="flex-1 gap-2"
                    data-testid="button-ai-save"
                  >
                    {aiSaveMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Timetable ({aiSchedule.length} entries)</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
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

